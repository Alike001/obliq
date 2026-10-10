use async_trait::async_trait;
use futures_util::TryStreamExt;
use rand_core::OsRng;
use rusqlite::{Connection, OpenFlags};
use serde_json::json;
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    convert::Infallible,
    env,
    error::Error,
    fs, io,
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tonic::Request;
use zcash_client_backend::{
    data_api::{
        Account, AccountPurpose, TransactionDataRequest, WalletRead, WalletWrite,
        chain::{BlockCache, BlockSource, error as chain_error, scan_cached_blocks},
        scanning::ScanRange,
        wallet::{ConfirmationsPolicy, decrypt_and_store_transaction},
    },
    proto::{
        compact_formats::CompactBlock,
        service::{
            BlockId, BlockRange, ChainSpec, Empty, TxFilter,
            compact_tx_streamer_client::CompactTxStreamerClient,
        },
    },
};
use zcash_client_sqlite::{WalletDb, util::SystemClock, wallet::init::init_wallet_db};
use zcash_keys::address::{Address, UnifiedAddress};
use zcash_keys::keys::{UnifiedAddressRequest, UnifiedFullViewingKey};
use zcash_primitives::transaction::Transaction;
use zcash_protocol::{
    consensus::{BlockHeight, BranchId, Network, NetworkType, NetworkUpgrade, Parameters},
    local_consensus::LocalNetwork,
};
use zeroize::Zeroizing;

#[cfg(unix)]
use std::{
    fs::{File, OpenOptions},
    io::{BufRead, BufReader, Write},
    os::unix::fs::PermissionsExt,
    process::{Command, Stdio},
};

#[derive(Clone, Default)]
struct MemoryBlockCache(Arc<Mutex<BTreeMap<u32, CompactBlock>>>);

impl BlockSource for MemoryBlockCache {
    type Error = Infallible;
    fn with_blocks<F, WalletErrT>(
        &self,
        from_height: Option<BlockHeight>,
        limit: Option<usize>,
        mut with_block: F,
    ) -> Result<(), chain_error::Error<WalletErrT, Self::Error>>
    where
        F: FnMut(CompactBlock) -> Result<(), chain_error::Error<WalletErrT, Self::Error>>,
    {
        let from = from_height.map(u32::from).unwrap_or(0);
        for block in self
            .0
            .lock()
            .expect("cache mutex")
            .range(from..)
            .map(|(_, block)| block.clone())
            .take(limit.unwrap_or(usize::MAX))
        {
            with_block(block)?;
        }
        Ok(())
    }
}

#[async_trait]
impl BlockCache for MemoryBlockCache {
    fn get_tip_height(
        &self,
        range: Option<&ScanRange>,
    ) -> Result<Option<BlockHeight>, Self::Error> {
        Ok(self
            .0
            .lock()
            .expect("cache mutex")
            .keys()
            .rev()
            .find(|height| {
                range.is_none_or(|range| {
                    range
                        .block_range()
                        .contains(&BlockHeight::from_u32(**height))
                })
            })
            .copied()
            .map(BlockHeight::from_u32))
    }
    async fn read(&self, range: &ScanRange) -> Result<Vec<CompactBlock>, Self::Error> {
        Ok(self
            .0
            .lock()
            .expect("cache mutex")
            .range(u32::from(range.block_range().start)..u32::from(range.block_range().end))
            .map(|(_, block)| block.clone())
            .collect())
    }
    async fn insert(&self, blocks: Vec<CompactBlock>) -> Result<(), Self::Error> {
        let mut cache = self.0.lock().expect("cache mutex");
        for block in blocks {
            cache.insert(block.height as u32, block);
        }
        Ok(())
    }
    async fn delete(&self, range: ScanRange) -> Result<(), Self::Error> {
        let mut cache = self.0.lock().expect("cache mutex");
        let heights: Vec<_> = cache
            .range(u32::from(range.block_range().start)..u32::from(range.block_range().end))
            .map(|(height, _)| *height)
            .collect();
        for height in heights {
            cache.remove(&height);
        }
        Ok(())
    }
}

#[derive(Clone)]
enum ObserverParameters {
    Regtest(LocalNetwork),
    Public(Network),
}

impl Parameters for ObserverParameters {
    fn network_type(&self) -> NetworkType {
        match self {
            Self::Regtest(params) => params.network_type(),
            Self::Public(params) => params.network_type(),
        }
    }

    fn activation_height(&self, nu: NetworkUpgrade) -> Option<BlockHeight> {
        match self {
            Self::Regtest(params) => params.activation_height(nu),
            Self::Public(params) => params.activation_height(nu),
        }
    }
}

struct ConfiguredNetwork {
    label: &'static str,
    service_chain_name: &'static str,
    params: ObserverParameters,
}

fn configured_network() -> Result<ConfiguredNetwork, Box<dyn Error>> {
    let value = env::var("OBSERVER_NETWORK").unwrap_or_else(|_| "regtest".to_string());
    configured_network_for(&value)
}

fn configured_network_for(value: &str) -> Result<ConfiguredNetwork, Box<dyn Error>> {
    let regtest = || LocalNetwork {
        overwinter: Some(BlockHeight::from_u32(1)),
        sapling: Some(BlockHeight::from_u32(1)),
        blossom: Some(BlockHeight::from_u32(1)),
        heartwood: Some(BlockHeight::from_u32(1)),
        canopy: Some(BlockHeight::from_u32(1)),
        nu5: Some(BlockHeight::from_u32(2)),
        nu6: Some(BlockHeight::from_u32(2)),
        nu6_1: Some(BlockHeight::from_u32(2)),
        nu6_2: Some(BlockHeight::from_u32(2)),
        nu6_3: Some(BlockHeight::from_u32(2)),
    };
    match value {
        "regtest" => Ok(ConfiguredNetwork {
            label: "regtest",
            service_chain_name: "regtest",
            params: ObserverParameters::Regtest(regtest()),
        }),
        "testnet" => Ok(ConfiguredNetwork {
            label: "testnet",
            service_chain_name: "test",
            params: ObserverParameters::Public(Network::TestNetwork),
        }),
        "mainnet" => Ok(ConfiguredNetwork {
            label: "mainnet",
            service_chain_name: "main",
            params: ObserverParameters::Public(Network::MainNetwork),
        }),
        _ => Err("OBSERVER_NETWORK must be regtest, testnet, or mainnet".into()),
    }
}

fn path() -> PathBuf {
    env::var_os("OBSERVER_DB")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("obliq-zcash-observer.sqlite"))
}

fn endpoint() -> String {
    env::var("OBSERVER_ENDPOINT").unwrap_or_else(|_| "http://127.0.0.1:28137".to_string())
}

fn nu7_activation_height(network: &str) -> Option<u32> {
    match network {
        "testnet" => Some(4_465_026),
        _ => None,
    }
}

fn normalized_consensus_branch_id(value: &str) -> Result<String, Box<dyn Error>> {
    let normalized = value.trim_start_matches("0x").to_ascii_lowercase();
    if normalized.len() != 8 || !normalized.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err("data service returned a malformed consensus branch ID".into());
    }
    Ok(normalized)
}

fn read_viewing_key(
    params: &ObserverParameters,
    read_from_stdin: bool,
) -> Result<UnifiedFullViewingKey, Box<dyn Error>> {
    let encoded = if read_from_stdin {
        let mut value = Zeroizing::new(String::new());
        io::stdin().read_line(&mut value)?;
        value
    } else {
        read_hidden_terminal_line("Observer UFVK (hidden): ")?
    };
    UnifiedFullViewingKey::decode(params, encoded.trim()).map_err(Into::into)
}

#[cfg(unix)]
fn set_terminal_echo(tty: &File, enabled: bool) -> io::Result<()> {
    let status = Command::new("stty")
        .arg(if enabled { "echo" } else { "-echo" })
        .stdin(Stdio::from(tty.try_clone()?))
        .status()?;
    if status.success() {
        Ok(())
    } else {
        Err(io::Error::other("could not change terminal echo state"))
    }
}

#[cfg(unix)]
fn read_hidden_terminal_line(prompt: &str) -> io::Result<Zeroizing<String>> {
    struct EchoGuard(File);
    impl Drop for EchoGuard {
        fn drop(&mut self) {
            let _ = set_terminal_echo(&self.0, true);
        }
    }

    let mut tty = OpenOptions::new().read(true).write(true).open("/dev/tty")?;
    let guard = EchoGuard(tty.try_clone()?);
    set_terminal_echo(&tty, false)?;
    tty.write_all(prompt.as_bytes())?;
    tty.flush()?;
    let mut value = Zeroizing::new(String::new());
    BufReader::new(tty.try_clone()?).read_line(&mut value)?;
    tty.write_all(b"\n")?;
    drop(guard);
    Ok(value)
}

#[cfg(not(unix))]
fn read_hidden_terminal_line(_prompt: &str) -> io::Result<Zeroizing<String>> {
    Err(io::Error::new(
        io::ErrorKind::Unsupported,
        "hidden UFVK input requires a Unix terminal; use operator-controlled stdin",
    ))
}

fn canonical_txid(database_hex: &str) -> String {
    database_hex
        .as_bytes()
        .rchunks_exact(2)
        .map(|pair| std::str::from_utf8(pair).expect("SQLite hex is ASCII"))
        .collect::<String>()
        .to_lowercase()
}

#[cfg(unix)]
fn require_private_regular_file(path: &std::path::Path) -> Result<(), Box<dyn Error>> {
    let metadata = fs::symlink_metadata(path)?;
    if !metadata.file_type().is_file() || metadata.file_type().is_symlink() {
        return Err("qualification input must be a regular file, not a symlink".into());
    }
    if metadata.permissions().mode() & 0o777 != 0o600 {
        return Err("qualification input must have mode 0600".into());
    }
    Ok(())
}

#[cfg(not(unix))]
fn require_private_regular_file(_path: &std::path::Path) -> Result<(), Box<dyn Error>> {
    Err("recipient verification requires Unix file permission checks".into())
}

fn orchard_receiver_matches(
    ufvk: &UnifiedFullViewingKey,
    recipient: &Address,
) -> Result<bool, &'static str> {
    let Address::Unified(recipient_ua) = recipient else {
        return Err("recipient must be a Unified Address");
    };
    let orchard_receiver = recipient_ua
        .orchard()
        .copied()
        .ok_or("recipient Unified Address has no Orchard receiver")?;
    let orchard_only = UnifiedAddress::from_receivers(Some(orchard_receiver), None, None)
        .expect("an Orchard receiver forms a valid Unified Address");

    Ok(!ufvk
        .to_unified_incoming_viewing_key()
        .decrypt_diversifiers(&orchard_only)
        .is_empty())
}

fn recipient_verification_result(account_count: usize, matching_accounts: usize) -> &'static str {
    match (account_count, matching_accounts) {
        (1, 0) => "MISMATCH",
        (1, 1) => "MATCH",
        _ => "UNVERIFIED",
    }
}

fn validate_recipient_address(
    params: &ObserverParameters,
    encoded: &str,
) -> Result<(bool, bool), Box<dyn Error>> {
    if encoded.len() > 1024 {
        return Err("recipient address exceeds size limit".into());
    }
    let address = Address::decode(params, encoded.trim())
        .ok_or("recipient is not a valid address for the configured network")?;
    let Address::Unified(unified) = address else {
        return Err("recipient must be a Unified Address".into());
    };
    let orchard = unified.has_orchard();
    let transparent = unified.transparent().is_some();
    if !orchard || transparent {
        return Err("recipient must contain Orchard and no transparent receiver".into());
    }
    Ok((orchard, transparent))
}

fn inspect_recipient_address(
    configured: &ConfiguredNetwork,
    params: &ObserverParameters,
) -> Result<(), Box<dyn Error>> {
    let mut encoded = Zeroizing::new(String::new());
    io::stdin().read_line(&mut encoded)?;
    let (orchard, transparent) = validate_recipient_address(params, &encoded)?;
    println!(
        "{}",
        json!({
            "network": configured.label,
            "orchardReceiverPresent": orchard,
            "transparentReceiverPresent": transparent,
            "receiverFingerprint": hex::encode(Sha256::digest(encoded.trim().as_bytes())),
        })
    );
    Ok(())
}

fn verify_recipient(
    configured: &ConfiguredNetwork,
    params: ObserverParameters,
) -> Result<(), Box<dyn Error>> {
    let wallet_path = path();
    let recipient_path = PathBuf::from(
        env::var_os("OBSERVER_RECIPIENT_FILE")
            .ok_or("OBSERVER_RECIPIENT_FILE is required for verify-recipient")?,
    );
    require_private_regular_file(&wallet_path)?;
    require_private_regular_file(&recipient_path)?;

    let recipient_document = fs::read_to_string(&recipient_path)?;
    if recipient_document.len() > 4096 {
        return Err("recipient file exceeds the qualification size limit".into());
    }
    let recipient_json: serde_json::Value = serde_json::from_str(&recipient_document)?;
    let recipient_object = recipient_json
        .as_object()
        .ok_or("recipient file must contain a JSON object")?;
    if recipient_object.len() != 1 || !recipient_object.contains_key("address") {
        return Err("recipient file must contain only the address field".into());
    }
    let recipient_text = recipient_object["address"]
        .as_str()
        .ok_or("recipient address must be a string")?;
    let recipient = Address::decode(&params, recipient_text)
        .ok_or("recipient is not a valid address for the configured network")?;
    let Address::Unified(recipient_ua) = &recipient else {
        return Err("recipient must be a Unified Address".into());
    };
    if !recipient_ua.has_orchard() {
        return Err("recipient Unified Address has no Orchard receiver".into());
    }

    let conn = Connection::open_with_flags(&wallet_path, OpenFlags::SQLITE_OPEN_READ_ONLY)?;
    rusqlite::vtab::array::load_module(&conn)?;
    let wallet = WalletDb::from_connection(conn, params, SystemClock, OsRng);
    let account_ids = wallet.get_account_ids()?;
    if account_ids.is_empty() {
        return Err("observer database has no imported account".into());
    }

    let mut matching_accounts = 0usize;
    for account_id in &account_ids {
        let account = wallet
            .get_account(*account_id)?
            .ok_or("observer account disappeared during verification")?;
        if account.purpose() != AccountPurpose::ViewOnly {
            return Err("observer database contains spending authority".into());
        }
        let ufvk = account
            .ufvk()
            .ok_or("observer account does not contain a full viewing key")?;
        if orchard_receiver_matches(ufvk, &recipient)? {
            matching_accounts += 1;
        }
    }

    let result = recipient_verification_result(account_ids.len(), matching_accounts);
    let recipient_fingerprint = hex::encode(Sha256::digest(recipient_text.as_bytes()));
    println!(
        "{}",
        json!({
            "result": result,
            "network": configured.label,
            "authority": "UFVK_VIEW_ONLY",
            "spendingAuthority": false,
            "observerDatabaseReadOnly": true,
            "observerDatabasePrivate": true,
            "recipientFilePrivate": true,
            "recipientFingerprint": recipient_fingerprint,
            "orchardReceiverPresent": true,
            "diversifierRecovered": matching_accounts > 0,
            "accountCount": account_ids.len(),
            "matchingAccountCount": matching_accounts,
        })
    );
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let mut args = env::args().skip(1);
    let command = args
        .next()
        .ok_or("expected init, sync, preflight, inspect-address, or verify-recipient")?;
    let ufvk_stdin = match args.next().as_deref() {
        None => false,
        Some("--ufvk-stdin") if command == "init" => true,
        Some(_) => return Err("--ufvk-stdin is accepted only by init".into()),
    };
    if args.next().is_some() {
        return Err("unexpected observer command argument".into());
    }
    let configured = configured_network()?;
    if command == "inspect-address" {
        return inspect_recipient_address(&configured, &configured.params);
    }
    if command == "verify-recipient" {
        return verify_recipient(&configured, configured.params.clone());
    }
    let params = configured.params;
    let wallet_path = path();
    let mut client = CompactTxStreamerClient::connect(endpoint()).await?;
    let service_info = client
        .get_lightd_info(Request::new(Empty {}))
        .await?
        .into_inner();
    if service_info.chain_name != configured.service_chain_name {
        return Err(format!(
            "observer network mismatch: expected {}, data service reported {}",
            configured.service_chain_name, service_info.chain_name
        )
        .into());
    }
    if command == "preflight" {
        let tip = client
            .get_latest_block(Request::new(ChainSpec {}))
            .await?
            .into_inner();
        let tip_height = BlockHeight::from_u32(u32::try_from(tip.height)?);
        let branch_id = normalized_consensus_branch_id(&service_info.consensus_branch_id)?;
        let nu7_activation_height = nu7_activation_height(configured.label);
        println!(
            "{}",
            json!({
                "network": configured.label,
                "serviceChain": service_info.chain_name,
                "serviceVersion": service_info.version,
                "serviceVendor": service_info.vendor,
                "serviceCommit": service_info.git_commit,
                "nodeBuild": service_info.zcashd_build,
                "nodeSubversion": service_info.zcashd_subversion,
                "lightwalletProtocolVersion": service_info.lightwallet_protocol_version,
                "chainTipHeight": u32::from(tip_height),
                "activeConsensusBranchId": branch_id,
                "nu7ActivationHeight": nu7_activation_height,
                "nu7Active": nu7_activation_height
                    .map(|height| u32::from(tip_height) >= height)
                    .unwrap_or(false),
                "authority": "NONE_REQUIRED",
                "spendingAuthority": false,
            })
        );
        return Ok(());
    }
    if command != "init" && command != "sync" {
        return Err("expected init, sync, preflight, or verify-recipient".into());
    }
    let mut wallet = WalletDb::for_path(&wallet_path, params.clone(), SystemClock, OsRng)?;
    init_wallet_db(&mut wallet, None)?;
    #[cfg(unix)]
    std::fs::set_permissions(&wallet_path, std::fs::Permissions::from_mode(0o600))?;

    if command == "init" {
        if wallet.get_account_ids()?.is_empty() {
            let tip = client
                .get_latest_block(Request::new(ChainSpec {}))
                .await?
                .into_inner();
            let birthday_height = match env::var("OBSERVER_BIRTHDAY_HEIGHT") {
                Ok(value) => value.parse::<u32>()?,
                Err(env::VarError::NotPresent) => u32::try_from(tip.height)?,
                Err(error) => return Err(error.into()),
            };
            if u64::from(birthday_height) > tip.height {
                return Err("OBSERVER_BIRTHDAY_HEIGHT is above the current chain tip".into());
            }
            let tree = client
                .get_tree_state(Request::new(BlockId {
                    height: u64::from(birthday_height),
                    hash: if u64::from(birthday_height) == tip.height {
                        tip.hash
                    } else {
                        vec![]
                    },
                }))
                .await?
                .into_inner();
            let birthday = zcash_client_backend::data_api::AccountBirthday::from_treestate(
                tree,
                Some(BlockHeight::from_u32(birthday_height)),
            )?;
            // Resolve all fallible network/birthday inputs before reading the
            // privacy-sensitive authority, then keep its decoded lifetime to
            // the immediate import operation.
            let ufvk = read_viewing_key(&params, ufvk_stdin)?;
            wallet.import_account_ufvk(
                "obliq-view-only",
                &ufvk,
                &birthday,
                AccountPurpose::ViewOnly,
                Some("obliq"),
            )?;
        }
        let account = wallet
            .get_account_ids()?
            .into_iter()
            .next()
            .ok_or("missing account")?;
        let (address, diversifier) = wallet
            .get_next_available_address(account, UnifiedAddressRequest::ORCHARD)?
            .ok_or("could not derive shielded receiver")?;
        println!(
            "{}",
            json!({
                "network": configured.label,
                "authority": "UFVK_VIEW_ONLY",
                "spendingAuthority": false,
                "receiver": address.encode(&params),
                "diversifierIndex": hex::encode(diversifier.as_bytes()),
            })
        );
        return Ok(());
    }
    if command != "sync" {
        return Err("expected init, sync, or verify-recipient".into());
    }

    let cache = MemoryBlockCache::default();
    if matches!(params, ObserverParameters::Public(_)) {
        // The maintained sync driver imports Sapling, Orchard, and Ironwood
        // subtree roots and verifies recent scanned ranges on every run. Its
        // continuity-error path rewinds and rescans after a reorganization.
        zcash_client_backend::sync::run(&mut client, &params, &cache, &mut wallet, 1_000).await?;
    } else {
        // The pinned Z3 regtest image predates the Ironwood subtree-root enum,
        // so the already-proven regtest tracer retains its range scanner.
        let tip = client
            .get_latest_block(Request::new(ChainSpec {}))
            .await?
            .into_inner();
        let tip_height = BlockHeight::from_u32(u32::try_from(tip.height)?);
        wallet.update_chain_tip(tip_height)?;
        loop {
            let ranges = wallet.suggest_scan_ranges()?;
            if ranges.is_empty() {
                break;
            }
            let mut scanned = false;
            for range in ranges {
                if range.is_empty() {
                    continue;
                }
                scanned = true;
                let start = range.block_range().start;
                let end = range.block_range().end - 1;
                let blocks = client
                    .get_block_range(Request::new(BlockRange {
                        start: Some(BlockId {
                            height: u32::from(start) as u64,
                            hash: vec![],
                        }),
                        end: Some(BlockId {
                            height: u32::from(end) as u64,
                            hash: vec![],
                        }),
                        pool_types: vec![],
                    }))
                    .await?
                    .into_inner()
                    .try_collect::<Vec<_>>()
                    .await?;
                cache.insert(blocks).await?;
                let chain_state = client
                    .get_tree_state(Request::new(BlockId {
                        height: u32::from(start - 1) as u64,
                        hash: vec![],
                    }))
                    .await?
                    .into_inner()
                    .to_chain_state()?;
                scan_cached_blocks(
                    &params,
                    &cache,
                    &mut wallet,
                    start,
                    &chain_state,
                    range.len(),
                )?;
                cache.delete(range).await?;
            }
            if !scanned {
                break;
            }
        }
    }

    for request in wallet.transaction_data_requests()? {
        if let TransactionDataRequest::Enhancement(txid) = request {
            let raw = client
                .get_transaction(Request::new(TxFilter {
                    block: None,
                    index: 0,
                    hash: txid.as_ref().to_vec(),
                }))
                .await?
                .into_inner();
            let height = BlockHeight::from_u32(u32::try_from(raw.height)?);
            let tx = Transaction::read(raw.data.as_slice(), BranchId::for_height(&params, height))?;
            decrypt_and_store_transaction(&params, &mut wallet, &tx, Some(height))?;
        }
    }

    let summary = wallet
        .get_wallet_summary(ConfirmationsPolicy::MIN)?
        .ok_or("no chain summary")?;
    let chain_tip = summary.chain_tip_height();
    let conn = Connection::open(&wallet_path)?;
    let mut statement = conn.prepare(
        "SELECT hex(t.txid), ro.pool, ro.output_index, ro.value, ro.memo, t.mined_height, a.address, hex(a.diversifier_index_be) \
         FROM v_received_outputs ro JOIN transactions t ON t.id_tx = ro.transaction_id \
         LEFT JOIN addresses a ON a.id = ro.address_id WHERE ro.is_change = 0 AND t.mined_height IS NOT NULL \
         ORDER BY t.mined_height, ro.output_index",
    )?;
    let rows = statement.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, i64>(1)?,
            row.get::<_, u16>(2)?,
            row.get::<_, i64>(3)?,
            row.get::<_, Option<Vec<u8>>>(4)?,
            row.get::<_, u32>(5)?,
            row.get::<_, Option<String>>(6)?,
            row.get::<_, Option<String>>(7)?,
        ))
    })?;
    let mut observations = vec![];
    for row in rows {
        let (txid, pool, output_index, amount_zat, memo, mined_height, receiver, diversifier) =
            row?;
        let memo = memo.as_deref().and_then(|bytes| {
            let end = bytes
                .iter()
                .position(|byte| *byte == 0)
                .unwrap_or(bytes.len());
            std::str::from_utf8(&bytes[..end]).ok().map(str::to_owned)
        });
        observations.push(json!({
            "txid": canonical_txid(&txid),
            "pool": match pool { 2 => "SAPLING", 3 => "ORCHARD", 4 => "IRONWOOD", _ => "UNKNOWN" },
            "outputIndex": output_index,
            "amountZat": amount_zat.to_string(),
            "memoReference": memo,
            "minedHeight": mined_height,
            "confirmations": u32::from(chain_tip).saturating_sub(mined_height) + 1,
            "receiver": receiver,
            "diversifierIndex": diversifier.map(|value| value.to_lowercase()),
        }));
    }
    println!(
        "{}",
        json!({
            "network": configured.label,
            "authority": "UFVK_VIEW_ONLY",
            "spendingAuthority": false,
            "chainTipHeight": u32::from(chain_tip),
            "fullyScannedHeight": u32::from(summary.fully_scanned_height()),
            "synced": summary.is_synced(),
            "observations": observations,
        })
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use zcash_keys::keys::UnifiedSpendingKey;
    use zcash_transparent::address::TransparentAddress;
    use zip32::{AccountId, DiversifierIndex};

    fn test_ufvk(seed_tag: u8) -> UnifiedFullViewingKey {
        UnifiedSpendingKey::from_seed(&Network::TestNetwork, &[seed_tag; 32], AccountId::ZERO)
            .expect("test seed derives a unified key")
            .to_unified_full_viewing_key()
    }

    fn orchard_recipient(ufvk: &UnifiedFullViewingKey, start: u32) -> Address {
        let (ua, _) = ufvk
            .find_address(
                DiversifierIndex::from(start),
                UnifiedAddressRequest::ORCHARD,
            )
            .expect("test key derives an Orchard receiver");
        Address::Unified(ua)
    }

    #[test]
    fn maps_explicit_networks_to_consensus_and_service_identities() {
        for (value, network_type, service_chain_name) in [
            ("regtest", NetworkType::Regtest, "regtest"),
            ("testnet", NetworkType::Test, "test"),
            ("mainnet", NetworkType::Main, "main"),
        ] {
            let configured = configured_network_for(value).expect("supported network");
            assert_eq!(configured.label, value);
            assert_eq!(configured.params.network_type(), network_type);
            assert_eq!(configured.service_chain_name, service_chain_name);
        }
    }

    #[test]
    fn rejects_unknown_networks() {
        assert!(configured_network_for("staging").is_err());
    }

    #[test]
    fn normalizes_a_service_reported_consensus_branch_id() {
        assert_eq!(
            normalized_consensus_branch_id("0x77190AD9").expect("valid branch ID"),
            "77190ad9"
        );
        assert!(normalized_consensus_branch_id("not-a-branch").is_err());
    }

    #[test]
    fn records_only_the_authoritative_public_testnet_nu7_activation() {
        assert_eq!(nu7_activation_height("testnet"), Some(4_465_026));
        assert_eq!(nu7_activation_height("mainnet"), None);
        assert_eq!(nu7_activation_height("regtest"), None);
    }

    #[test]
    fn matches_an_orchard_receiver_at_a_non_default_diversifier() {
        let ufvk = test_ufvk(1);
        let recipient = orchard_recipient(&ufvk, 73);

        assert_eq!(orchard_receiver_matches(&ufvk, &recipient), Ok(true));
    }

    #[test]
    fn rejects_an_orchard_receiver_from_another_account() {
        let observer_ufvk = test_ufvk(1);
        let other_recipient = orchard_recipient(&test_ufvk(2), 73);

        assert_eq!(
            orchard_receiver_matches(&observer_ufvk, &other_recipient),
            Ok(false)
        );
    }

    #[test]
    fn requires_the_recipient_to_contain_an_orchard_receiver() {
        let ufvk = test_ufvk(1);
        let (all_receivers, _) = ufvk
            .find_address(
                DiversifierIndex::from(73u32),
                UnifiedAddressRequest::AllAvailableKeys,
            )
            .expect("test key derives shielded receivers");
        let sapling_only =
            UnifiedAddress::from_receivers(None, all_receivers.sapling().copied(), None)
                .expect("test key derives a Sapling receiver");

        assert_eq!(
            orchard_receiver_matches(&ufvk, &Address::Unified(sapling_only)),
            Err("recipient Unified Address has no Orchard receiver")
        );
    }

    #[test]
    fn accepts_orchard_only_and_rejects_transparent_receiver_composition() {
        let configured = configured_network_for("testnet").expect("testnet");
        let ufvk = test_ufvk(3);
        let orchard_only = orchard_recipient(&ufvk, 11).encode(&configured.params);
        assert_eq!(
            validate_recipient_address(&configured.params, &orchard_only).expect("Orchard-only"),
            (true, false)
        );

        let (all_receivers, _) = ufvk
            .find_address(
                DiversifierIndex::from(12u32),
                UnifiedAddressRequest::AllAvailableKeys,
            )
            .expect("all receivers");
        let with_transparent = UnifiedAddress::from_receivers(
            all_receivers.orchard().copied(),
            None,
            Some(TransparentAddress::PublicKeyHash([7; 20])),
        )
        .expect("Orchard and transparent receivers form a UA");
        let encoded = Address::Unified(with_transparent).encode(&configured.params);
        assert!(validate_recipient_address(&configured.params, &encoded).is_err());
    }

    #[test]
    fn requires_exactly_one_observer_account_for_a_match() {
        assert_eq!(recipient_verification_result(1, 1), "MATCH");
        assert_eq!(recipient_verification_result(1, 0), "MISMATCH");
        assert_eq!(recipient_verification_result(2, 1), "UNVERIFIED");
        assert_eq!(recipient_verification_result(2, 2), "UNVERIFIED");
    }
}
