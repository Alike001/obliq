use async_trait::async_trait;
use futures_util::TryStreamExt;
use rand_core::OsRng;
use rusqlite::Connection;
use serde_json::json;
use std::{
    collections::BTreeMap,
    convert::Infallible,
    env,
    error::Error,
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tonic::Request;
use zcash_client_backend::{
    data_api::{
        AccountPurpose, TransactionDataRequest, WalletRead, WalletWrite,
        chain::{BlockCache, BlockSource, error as chain_error, scan_cached_blocks},
        scanning::ScanRange,
        wallet::{ConfirmationsPolicy, decrypt_and_store_transaction},
    },
    proto::{
        compact_formats::CompactBlock,
        service::{
            BlockId, BlockRange, ChainSpec, TxFilter,
            compact_tx_streamer_client::CompactTxStreamerClient,
        },
    },
};
use zcash_client_sqlite::{WalletDb, util::SystemClock, wallet::init::init_wallet_db};
use zcash_keys::keys::{UnifiedAddressRequest, UnifiedFullViewingKey};
use zcash_primitives::transaction::Transaction;
use zcash_protocol::{
    consensus::{BlockHeight, BranchId},
    local_consensus::LocalNetwork,
};

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

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

fn params() -> LocalNetwork {
    LocalNetwork {
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

fn viewing_key(params: &LocalNetwork) -> Result<UnifiedFullViewingKey, Box<dyn Error>> {
    let encoded = env::var("OBSERVER_UFVK").map_err(|_| "OBSERVER_UFVK is required")?;
    UnifiedFullViewingKey::decode(params, &encoded).map_err(Into::into)
}

fn canonical_txid(database_hex: &str) -> String {
    database_hex
        .as_bytes()
        .rchunks_exact(2)
        .map(|pair| std::str::from_utf8(pair).expect("SQLite hex is ASCII"))
        .collect::<String>()
        .to_lowercase()
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let command = env::args().nth(1).ok_or("expected init or sync")?;
    let params = params();
    let ufvk = viewing_key(&params)?;
    let wallet_path = path();
    let mut client = CompactTxStreamerClient::connect(endpoint()).await?;
    let mut wallet = WalletDb::for_path(&wallet_path, params, SystemClock, OsRng)?;
    init_wallet_db(&mut wallet, None)?;
    #[cfg(unix)]
    std::fs::set_permissions(&wallet_path, std::fs::Permissions::from_mode(0o600))?;

    if command == "init" {
        if wallet.get_account_ids()?.is_empty() {
            let tip = client
                .get_latest_block(Request::new(ChainSpec {}))
                .await?
                .into_inner();
            let tree = client
                .get_tree_state(Request::new(BlockId {
                    height: tip.height,
                    hash: tip.hash,
                }))
                .await?
                .into_inner();
            let birthday = zcash_client_backend::data_api::AccountBirthday::from_treestate(
                tree,
                Some(BlockHeight::from_u32(tip.height as u32)),
            )?;
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
                "network": "regtest",
                "authority": "UFVK_VIEW_ONLY",
                "spendingAuthority": false,
                "receiver": address.encode(&params),
                "diversifierIndex": hex::encode(diversifier.as_bytes()),
            })
        );
        return Ok(());
    }
    if command != "sync" {
        return Err("expected init or sync".into());
    }

    let cache = MemoryBlockCache::default();
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
            "network": "regtest",
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
