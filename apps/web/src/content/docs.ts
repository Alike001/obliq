export interface DocSection {
  id: string;
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
  callout?: { tone: "note" | "warning"; title: string; text: string };
  code?: string;
  table?: {
    headers: readonly string[];
    rows: readonly (readonly string[])[];
  };
}
export interface DocPage {
  slug: string;
  title: string;
  description: string;
  status: "IMPLEMENTED" | "PLANNED";
  sections: readonly DocSection[];
}

export interface DocGroup {
  title: string;
  pages: readonly string[];
  planned: readonly string[];
}

export const docs: readonly DocPage[] = [
  {
    slug: "overview",
    title: "Overview",
    status: "IMPLEMENTED",
    description: "What Obliq is, who it serves, and what exists in Phase 6.",
    sections: [
      {
        id: "product",
        title: "Private financial operations",
        paragraphs: [
          "Obliq helps crypto-native organizations manage bills and other financial obligations, apply deterministic controls and human approvals, settle privately using Zcash, reconcile settlement to the underlying obligation, and create controlled evidence without surrendering treasury spending authority.",
          "The initial wedge is vendor and contractor accounts payable. The long-term category is private financial operations.",
        ],
      },
      {
        id: "today",
        title: "What exists today",
        paragraphs: [
          "Phase 6 hardens the complete lifecycle with production-capable OIDC sessions, shared rate limits, private quarantined storage/scanning, runtime network validation and deployable component boundaries. Provider infrastructure is not fabricated or bundled.",
        ],
        bullets: [
          "Manual and invoice-backed obligation capture",
          "Exact integer money types and PostgreSQL bigint columns",
          "Server-enforced organization membership and tenant-scoped repositories",
          "Version-bound policy decisions, approvals and readiness records",
          "UFVK-only shielded observation proven on isolated Zcash regtest",
          "External Zallet shielded signing and broadcast proven on isolated regtest",
          "Explicit-disclosure evidence, canonical JSON hashing and external verification",
          "OIDC identity/session, PostgreSQL abuse-control and private upload boundaries",
        ],
      },
      {
        id: "not-yet",
        title: "What does not exist yet",
        paragraphs: [
          "Live market pricing, embedded wallet integration, public-network operation, native PDF generation and zero-knowledge business proofs are not live. Production provider credentials and infrastructure must be supplied by an operator. The only quote source is explicitly controlled regtest input.",
        ],
        callout: {
          tone: "warning",
          title: "Foundation status",
          text: "Extraction suggestions come from a clearly labelled development fixture. They are not AI truth or blockchain evidence.",
        },
      },
    ],
  },
  {
    slug: "core-concepts",
    title: "Core concepts",
    status: "IMPLEMENTED",
    description:
      "The business objects and authority boundaries that shape Obliq.",
    sections: [
      {
        id: "obligation",
        title: "Obligation first",
        paragraphs: [
          "An Obligation is the fundamental domain object: a business liability or request with purpose, counterparty, value, due date, source and lifecycle. A future settlement must always reference one.",
        ],
      },
      {
        id: "authority",
        title: "Three distinct authorities",
        paragraphs: [
          "Business approval, cryptographic spending authority and viewing authority solve different problems. Approving a bill does not sign a transaction. Viewing payment activity does not grant the ability to spend.",
        ],
        bullets: [
          "Humans approve business intent",
          "An external wallet or signer authorizes funds",
          "A dedicated UFVK-only observer supports reconciliation",
        ],
      },
      {
        id: "money",
        title: "Exact money",
        paragraphs: [
          "Fiat obligations use integer minor units. ZEC settlement uses integer zatoshis. IEEE floating-point values are excluded from financial representations.",
        ],
      },
    ],
  },
  {
    slug: "architecture",
    title: "Architecture overview",
    status: "IMPLEMENTED",
    description:
      "Repository boundaries and the intended request-to-settlement shape.",
    sections: [
      {
        id: "workspaces",
        title: "Workspace boundaries",
        paragraphs: [
          "The web application owns presentation and server entry points. Domain owns invariant-bearing types. Database owns tenant-aware persistence. Evidence owns canonical disclosure and integrity rules. Zcash owns a signer-free observer contract, while a dedicated Rust process owns viewing-key import and scanning.",
        ],
        code: "apps/web             product surfaces + server boundary\npackages/domain      money, states, tenant invariants\npackages/evidence    canonical disclosure + hashing\npackages/database    PostgreSQL business records\npackages/zcash       observer normalization + correlation\ntools/zcash-observer UFVK-only Rust scanner",
      },
      {
        id: "flow",
        title: "Authority flow",
        paragraphs: [
          "The intended future flow is application readiness checks, a version-bound SettlementIntent, an external signing handoff, user-controlled signing, broadcast, and evidence-driven read-only reconciliation.",
        ],
      },
      {
        id: "boundaries",
        title: "Package boundaries",
        paragraphs: [
          "Policy and evidence are executable framework-independent packages. Ledger remains a documented future boundary; AI owns extraction suggestions only.",
        ],
      },
    ],
  },
  {
    slug: "product-lifecycle",
    title: "Product lifecycle",
    status: "IMPLEMENTED",
    description: "Capture → Control → Settle → Reconcile → Prove.",
    sections: [
      {
        id: "capture",
        title: "Capture",
        paragraphs: [
          "Create a persisted obligation from trusted manual input or a privately stored source document. Implemented in Phase 1 with mandatory human confirmation.",
        ],
      },
      {
        id: "control",
        title: "Control",
        paragraphs: [
          "Evaluate immutable policy versions, record structured findings and collect server-authorized human approvals. Implemented in Phase 2. Approval remains distinct from settlement.",
        ],
      },
      {
        id: "settle",
        title: "Settle",
        paragraphs: [
          "Prepare an exact, expiring settlement intent and hand its ZIP-321 request to an authorized external Zallet operator for deliberate PCZT review and signing. Implemented on isolated regtest. Broadcast is not settlement.",
        ],
      },
      {
        id: "reconcile",
        title: "Reconcile",
        paragraphs: [
          "Observe shielded payment evidence with minimum viewing authority and match it to the obligation. Implemented on isolated regtest in Phase 3. Scanner failure produces unavailable state—not unpaid.",
        ],
      },
      {
        id: "prove",
        title: "Prove",
        paragraphs: [
          "Create immutable, integrity-protected application evidence from canonical business and settlement records with explicit recipient disclosure. Implemented in Phase 5. This is not represented as a zero-knowledge proof.",
        ],
      },
    ],
  },
  {
    slug: "privacy-model",
    title: "Privacy model",
    status: "IMPLEMENTED",
    description: "What public observers, teams, signers and Obliq may know.",
    sections: [
      {
        id: "principle",
        title: "Commercial confidentiality",
        paragraphs: [
          "The product goal is to keep vendor relationships, invoice references, internal approvals and full treasury history out of public application disclosures. Future shielded Zcash settlement provides chain-level privacy according to actual Zcash semantics.",
        ],
      },
      {
        id: "backend",
        title: "Backend knowledge",
        paragraphs: [
          "Obliq necessarily holds operational application records. The dedicated reconciliation process may hold a UFVK imported as view-only. Viewing material and its scan cache are high-value privacy assets even though they cannot spend.",
        ],
      },
      {
        id: "phase-zero",
        title: "Current guarantee",
        paragraphs: [
          "No Zcash viewing or spending key is stored in PostgreSQL, rendered, or sent client-side. The observer receives a UFVK out-of-band. Invoice and reconciliation records are operationally private to the configured organization boundary, not encrypted end-to-end.",
        ],
        callout: {
          tone: "note",
          title: "No inflated claim",
          text: "The end-to-end tracer proves external write and read paths on regtest only. Public-network operation is BLOCKED and not launch-qualified.",
        },
      },
    ],
  },
  {
    slug: "security-principles",
    title: "Security principles",
    status: "IMPLEMENTED",
    description: "Non-negotiable authority, failure-state and tenant rules.",
    sections: [
      {
        id: "authority",
        title: "No backend spend authority",
        paragraphs: [
          "The observer contract has status and observe methods only. It accepts no seed phrase or spending key and exposes no proposal, signing, broadcast, or execution method.",
        ],
      },
      {
        id: "determinism",
        title: "Deterministic money movement",
        paragraphs: [
          "AI output can eventually assist understanding, but may never approve, sign, broadcast, alter policy or bypass validation. Financial transitions belong to deterministic application code and authorized humans.",
        ],
      },
      {
        id: "failure",
        title: "Failure states carry meaning",
        paragraphs: [
          "APPROVED is not SETTLED. BROADCAST is not SETTLED. An unavailable RPC or scanner is not evidence of payment or non-payment.",
        ],
      },
      {
        id: "tenancy",
        title: "Server-side tenancy",
        paragraphs: [
          "Every tenant-owned financial table carries organization_id and repositories reject cross-organization access. Production OIDC maps only pre-provisioned issuer/subject identities to one active membership; client roles are ignored. RLS is not active and is not claimed.",
        ],
      },
    ],
  },
  {
    slug: "zcash-strategy",
    title: "Zcash integration strategy",
    status: "IMPLEMENTED",
    description:
      "Current boundaries and deliberately deferred protocol choices.",
    sections: [
      {
        id: "role",
        title: "Why Zcash",
        paragraphs: [
          "Zcash is the settlement and privacy primitive that makes the product’s central commercial-confidentiality promise possible. It is not a branding layer.",
        ],
      },
      {
        id: "requests",
        title: "Payment requests",
        paragraphs: [
          "ZIP-321 is the canonical request format. The implemented one-payment subset carries an exact ZEC amount and opaque memo reference. Vendor names, invoice prose, approvals and policy data never enter the request.",
        ],
      },
      {
        id: "read-path",
        title: "Read-only reconciliation",
        paragraphs: [
          "Phase 3 proved UFVK import, shielded output and memo decryption, receiver correlation, and confirmation progression using librustzcash on official Z3 regtest. The active NU6.3 pool was Ironwood, so it is reported as Ironwood—not relabelled Orchard.",
        ],
      },
      {
        id: "advanced",
        title: "PCZT and FROST",
        paragraphs: [
          "Zallet's implemented PCZT RPCs are used inside the external signer ceremony, but PCZT is never exposed to the Obliq application. FROST and arbitrary multisig remain unavailable and are not dependencies.",
        ],
        callout: {
          tone: "warning",
          title: "No transparent fallback",
          text: "If shielded observation or settlement cannot be proven, implementation stops for redesign. It never silently falls back to transparent payment while claiming privacy.",
        },
      },
    ],
  },
  {
    slug: "implementation-status",
    title: "Known limitations",
    status: "IMPLEMENTED",
    description:
      "An honest inventory of what is implemented, seeded, planned and unavailable.",
    sections: [
      {
        id: "vocabulary",
        title: "Status vocabulary",
        paragraphs: [
          "IMPLEMENTED means working behavior exists. SEEDED means example data exists only for design validation. PLANNED means documented future work. BLOCKED means a known dependency prevents work. UNAVAILABLE means the capability cannot currently be used.",
        ],
        table: {
          headers: ["Status", "Meaning"],
          rows: [
            ["IMPLEMENTED", "Working and testable"],
            ["SEEDED", "Example data only"],
            ["PLANNED", "Accepted future scope"],
            ["BLOCKED", "Dependency prevents progress"],
            ["UNAVAILABLE", "Cannot currently be used"],
          ],
        },
      },
      {
        id: "implemented",
        title: "Implemented",
        paragraphs: [
          "PostgreSQL-backed vendors and obligations, deterministic controls and approvals, immutable settlement quotes/intents, external Zallet signing receipts, UFVK-only observation, three-signal correlation, controlled evidence, OIDC sessions, shared rate limits, private upload/scanner boundaries, idempotent persistence, and organization-scoped audit events.",
        ],
      },
      {
        id: "seeded",
        title: "Seeded",
        paragraphs: [
          "Invoice extraction uses a development fixture. It derives only a low-confidence filename reference and default currency, labels every suggestion for human review, and never enters a financial record without submission.",
        ],
      },
      {
        id: "planned",
        title: "Planned and unavailable",
        paragraphs: [
          "Live market quotes, embedded wallet signing, public-network execution, ledger settlement entries and native PDF evidence are not implemented. Production identity/storage/scanner integration code exists but requires real provider infrastructure. Public-network operation remains BLOCKED: the old Zaino subtree-root issue is fixed upstream, but Obliq public synchronization, reorg recovery and a funded shielded flow remain unproved.",
        ],
        callout: {
          tone: "warning",
          title: "Current proof boundary",
          text: "A real regtest end-to-end tracer exists. It proves external signing, broadcast and read-only reconciliation, not mainnet readiness. Obliq still has no spending authority.",
        },
      },
    ],
  },
  {
    slug: "obligations",
    title: "Obligations",
    status: "IMPLEMENTED",
    description: "The persisted financial record at the center of Obliq.",
    sections: [
      {
        id: "aggregate",
        title: "Financial record",
        paragraphs: [
          "An obligation belongs to one organization and vendor and records a supported type, source, reference, exact amount, currency, due date, purpose, state, creator and version. Phase 1 supports VENDOR_INVOICE and CONTRACTOR_BILL only.",
        ],
      },
      {
        id: "state",
        title: "Current state machine",
        paragraphs: [
          "Human-confirmed records enter UNDER_REVIEW. A server-side command may move them to BLOCKED or APPROVAL_REQUIRED only after policy evaluation. Satisfied current approvals produce APPROVED; a fresh version-bound readiness evaluation alone produces READY_TO_SETTLE.",
        ],
        code: "DRAFT → UNDER_REVIEW → APPROVAL_REQUIRED → APPROVED → READY_TO_SETTLE\n                    ↘ BLOCKED",
      },
      {
        id: "money",
        title: "Exact money",
        paragraphs: [
          "User decimals are parsed without floating point and stored as PostgreSQL bigint minor units. Negative values, malformed input, excess precision and values beyond bigint range are rejected.",
        ],
      },
    ],
  },
  {
    slug: "vendors",
    title: "Vendors",
    status: "IMPLEMENTED",
    description: "Organization-scoped counterparties and destination history.",
    sections: [
      {
        id: "record",
        title: "Counterparty record",
        paragraphs: [
          "Vendor records hold operational identity, category and optional finance-contact metadata. They are intentionally not a CRM.",
        ],
      },
      {
        id: "destinations",
        title: "Payment destinations",
        paragraphs: [
          "Adding a destination creates an immutable historical row and supersedes the preceding active row. An authorized Treasury, CFO or Owner may record VERIFIED_MANUALLY with timestamp, method and note. This is operational verification, not cryptographic proof of wallet control.",
        ],
        callout: {
          tone: "warning",
          title: "No wallet integration",
          text: "A destination change invalidates approvals and readiness. Later settlement must bind the exact reviewed destination version. No destination record can move funds.",
        },
      },
    ],
  },
  {
    slug: "invoice-ingestion",
    title: "Invoice ingestion",
    status: "IMPLEMENTED",
    description: "Private upload, extraction suggestions and human review.",
    sections: [
      {
        id: "upload",
        title: "Document handling",
        paragraphs: [
          "The server accepts PDF, PNG and JPEG up to the configured limit. It checks file signatures and declared MIME agreement, hashes content with SHA-256, generates a storage identifier and keeps the original filename as metadata only. Production uses private quarantine storage and requires an authenticated scanner CLEAN result; unknown fails closed. There is no public raw-file route.",
        ],
      },
      {
        id: "review",
        title: "Human confirmation",
        paragraphs: [
          "Upload leads to a dedicated review form. Suggestions are editable; no obligation exists until a user confirms and submits the record.",
        ],
      },
      {
        id: "ai",
        title: "AI boundary",
        paragraphs: [
          "The provider contract has strict schemas, confidence, provenance and mandatory-review markers. The current provider is SEEDED_FIXTURE, not live AI, and does not inspect document content.",
        ],
        callout: {
          tone: "note",
          title: "No external disclosure",
          text: "Phase 1 does not send uploaded documents to any external AI provider.",
        },
      },
    ],
  },
  {
    slug: "duplicate-detection",
    title: "Duplicate detection",
    status: "IMPLEMENTED",
    description: "Deterministic exact and possible duplicate rules.",
    sections: [
      {
        id: "exact",
        title: "Exact duplicates",
        paragraphs: [
          "A matching document hash, or the same normalized vendor/reference/amount/currency tuple, is exact and blocked. AI does not participate in this decision.",
        ],
      },
      {
        id: "possible",
        title: "Possible duplicates",
        paragraphs: [
          "Matching vendor plus normalized reference, vendor plus amount/currency, or normalized reference plus amount/currency creates a persisted POSSIBLE finding for human review.",
        ],
      },
    ],
  },
  {
    slug: "policies",
    title: "Policies and controls",
    status: "IMPLEMENTED",
    description:
      "Deterministic rules, immutable versions and structured findings.",
    sections: [
      {
        id: "rules",
        title: "Focused financial controls",
        paragraphs: [
          "The active accounts-payable policy evaluates completeness, supported policy currency, vendor history, exact destination status, unresolved duplicate findings and amount tiers. It produces stable PASS, BLOCK and REQUIRE_APPROVAL findings without AI input.",
        ],
      },
      {
        id: "versions",
        title: "Historical meaning is immutable",
        paragraphs: [
          "Publishing a policy creates a new immutable PolicyVersion. Each PolicyDecision records its policy version, obligation version, destination version, input hash, findings and requirements. Activating a later version does not rewrite earlier decisions; it invalidates active authorization and returns affected obligations to review.",
        ],
      },
      {
        id: "defaults",
        title: "Supported approval tiers",
        paragraphs: [
          "Finance leads can set the two exact thresholds and policy currency. Below the first threshold requires Finance; the middle tier requires Finance and Treasury; the upper tier requires two distinct Treasury approvals. New vendors add Treasury review. Unsupported currencies block rather than applying an invented exchange rate.",
        ],
      },
    ],
  },
  {
    slug: "approvals",
    title: "Approvals and readiness",
    status: "IMPLEMENTED",
    description:
      "Human authorization that remains separate from Zcash signing.",
    sections: [
      {
        id: "authorization",
        title: "Server-authorized actions",
        paragraphs: [
          "Approval requirements derive from the policy decision. The server checks active organization membership, eligible role, current requirement state, obligation version and creator restrictions. A database constraint prevents one actor from counting twice within a decision.",
        ],
      },
      {
        id: "invalidation",
        title: "Material changes invalidate authorization",
        paragraphs: [
          "Changing vendor, amount, currency, obligation type, reference, due date, category, description or destination returns the obligation to UNDER_REVIEW and invalidates active approvals. Material revisions append an immutable obligation-version snapshot. Fresh policy evaluation and human approval are required.",
        ],
      },
      {
        id: "readiness",
        title: "Explainable settlement readiness",
        paragraphs: [
          "A fresh readiness evaluation checks the exact obligation, policy and destination versions; blocking findings; duplicate resolution; destination status; and every approval threshold. It returns structured reasons and only then may set READY_TO_SETTLE.",
        ],
        callout: {
          tone: "warning",
          title: "Not a signature",
          text: "READY_TO_SETTLE is business authorization. An external Zallet operator separately reviews and signs the exact Phase-4 intent; Obliq cannot sign independently.",
        },
      },
    ],
  },
  {
    slug: "settlement-execution",
    title: "Shielded settlement execution",
    status: "IMPLEMENTED",
    description:
      "Exact intent preparation and external cryptographic authorization.",
    sections: [
      {
        id: "quote",
        title: "Quote boundary",
        paragraphs: [
          "Business money remains integer minor units and ZEC remains integer zatoshis. The implemented source is REGTEST_FIXED/CONTROLLED_REGTEST and is never described as live pricing. Quotes expire and cannot be silently reused.",
        ],
      },
      {
        id: "intent",
        title: "Immutable intent",
        paragraphs: [
          "The intent binds organization, obligation and version, policy decision, approvals, vendor, exact destination version and receiver, both money representations, quote provenance and expiry, network, privacy mode, opaque memo reference and a canonical SHA-256 fingerprint. Material changes invalidate it.",
        ],
      },
      {
        id: "signing",
        title: "Human-reviewed external signing",
        paragraphs: [
          "The review surface shows business amount, zatoshis, quote, destination fingerprint, network, privacy mode, approval binding and intent fingerprint. A human then uses isolated Zallet PCZT create, inspect, prove, sign and extract RPCs. Only a sanitized receipt returns to Obliq.",
        ],
        callout: {
          tone: "warning",
          title: "Authority boundary",
          text: "The Zallet RPC is privileged and remains local to the signer operator. Giving its credential to Obliq would violate the non-custodial architecture.",
        },
      },
      {
        id: "state",
        title: "Broadcast and settlement",
        paragraphs: [
          "AWAITING_SIGNATURE, SIGNED, BROADCAST, DETECTED, CONFIRMING and SETTLED are distinct. Broadcast timeout is BROADCAST_UNKNOWN. Only matching read-only observer evidence can reach SETTLED.",
        ],
      },
    ],
  },
  {
    slug: "reconciliation",
    title: "Shielded reconciliation",
    status: "IMPLEMENTED",
    description:
      "Read-only shielded observation, correlation and failure semantics.",
    sections: [
      {
        id: "architecture",
        title: "UFVK-only observer",
        paragraphs: [
          "A dedicated Rust observer imports a Unified Full Viewing Key with AccountPurpose::ViewOnly, maintains a separate SQLite scan cache, and consumes compact blocks plus full transaction enhancement data from a Zebra-backed service. Its API exposes no spending method.",
        ],
      },
      {
        id: "correlation",
        title: "Three-signal correlation",
        paragraphs: [
          "A target binds one obligation to a unique shielded receiver fingerprint, a digest of a random opaque memo reference, and an exact integer zatoshi amount. Amount alone cannot identify a payment. Vendor names and invoice data never enter the memo.",
        ],
      },
      {
        id: "state",
        title: "Confirmation and failure semantics",
        paragraphs: [
          "DETECTED, CONFIRMING, SETTLED and MISMATCH describe observed output evidence. Observer or node UNAVAILABLE is infrastructure state and never changes a financial conclusion to unpaid. Repeated ingestion is unique by organization, network, transaction and output index.",
        ],
        callout: {
          tone: "warning",
          title: "Regtest scope",
          text: "The real tracer used isolated Z3 regtest and the current Ironwood pool. Mainnet/testnet service hardening, TLS, key custody and large-wallet subtree-root behavior remain planned.",
        },
      },
    ],
  },
  {
    slug: "audit-history",
    title: "Audit and activity history",
    status: "IMPLEMENTED",
    description: "Organization-scoped events and integrity chaining.",
    sections: [
      {
        id: "events",
        title: "Recorded activity",
        paragraphs: [
          "Vendor and destination actions, obligation and policy changes, approvals, invalidations, reconciliation-target creation, shielded detection, confirmation progression and reconciliation produce actor-attributed events.",
        ],
      },
      {
        id: "integrity",
        title: "Hash chain",
        paragraphs: [
          "Events are serialized canonically and chained with SHA-256 under an organization-level transactional lock. Verification recomputes the chain. This supplies application-level tamper detection; it is not a blockchain proof or an evidence package.",
        ],
      },
    ],
  },
  {
    slug: "controlled-evidence",
    title: "Controlled evidence",
    status: "IMPLEMENTED",
    description:
      "Canonical artifacts, selective disclosure, verification and status semantics.",
    sections: [
      {
        id: "model",
        title: "Evidence model",
        paragraphs: [
          "EvidencePackage is an immutable snapshot derived from a canonically SETTLED obligation, its exact obligation version, SETTLED settlement and matching reconciliation observation. No user can manually type a paid claim into the artifact.",
          "The package records a schema version, evidence version, issuer, creation time, disclosed-field manifest, canonical JSON artifact and SHA-256 content hash.",
        ],
        callout: {
          tone: "warning",
          title: "Not a ZK business proof",
          text: "Obliq evidence is application-generated, integrity-protected financial evidence. Zcash proves protocol statements; it does not attest vendor names, invoices, approvals or accounting truth entered into Obliq.",
        },
      },
      {
        id: "provenance",
        title: "Claim provenance",
        paragraphs: [
          "Every disclosed claim labels its source. Vendor, reference, category and business value come from the Obliq business record. Approval summaries come from Obliq authorization records. Payment status, settlement date, ZEC amount, network, confirmations and transaction reference come from Zcash reconciliation observations.",
        ],
      },
      {
        id: "classification",
        title: "Disclosure classes",
        paragraphs: [
          "PUBLIC_SAFE, COUNTERPARTY, FINANCE and AUDIT fields form a closed server-side allowlist. The issuer name is required package metadata and appears in every preview. Sensitive FINANCE/AUDIT disclosure requires Owner, CFO or Accountant capacity. Viewing authority, spend authority, destinations, memo data, raw transactions, signer credentials and internal findings are NEVER_DISCLOSE and have no selectable key.",
        ],
        table: {
          headers: ["Template", "Typical disclosure"],
          rows: [
            ["Minimal confirmation", "Reference, settled status, date"],
            [
              "Vendor receipt",
              "Reference, vendor, business amount, status, date",
            ],
            [
              "Accountant evidence",
              "Finance and authorized chain-derived fields",
            ],
          ],
        },
      },
      {
        id: "integrity",
        title: "Canonicalization and hashing",
        paragraphs: [
          "Objects are serialized with lexicographically sorted keys; arrays preserve order; values admit only JSON primitives, arrays and objects; numbers must be safe integers. Financial quantities are strings inside typed objects, avoiding floating point. SHA-256 covers the complete disclosed artifact, including ID, version, issuer, timestamp, manifest, classifications, provenance and claims.",
          "Any change to amount, vendor, status, date, transaction reference, manifest or version causes verification failure.",
        ],
      },
      {
        id: "verification",
        title: "External verification",
        paragraphs: [
          "The public route uses an independent 256-bit random URL-safe identifier rather than the internal UUID. It displays only embedded claims, current ACTIVE/SUPERSEDED/REVOKED status and hash result. Invalid identifiers reveal no organization data.",
          "JSON is the canonical downloadable artifact. The printable HTML receipt renders the same verified model. Native PDF remains PLANNED: Phase 6 did not add a renderer whose font/browser/runtime dependencies could drift into an independent source of truth.",
        ],
      },
      {
        id: "status",
        title: "Revocation and supersession",
        paragraphs: [
          "Issued content is never rewritten. A successor is a new evidence ID and version; the old package becomes SUPERSEDED. Owner or CFO can REVOKE with a reason. Historical content remains visible with an explicit warning. A supported reconciliation regression or mismatch automatically revokes active evidence linked to that settlement.",
        ],
      },
    ],
  },
];

export const docGroups: readonly DocGroup[] = [
  {
    title: "Getting started",
    pages: ["overview", "core-concepts"],
    planned: ["Quickstart", "Demo walkthrough"],
  },
  {
    title: "Financial operations",
    pages: [
      "product-lifecycle",
      "obligations",
      "vendors",
      "invoice-ingestion",
      "duplicate-detection",
      "policies",
      "approvals",
      "settlement-execution",
      "reconciliation",
      "audit-history",
      "controlled-evidence",
    ],
    planned: [],
  },
  {
    title: "Privacy",
    pages: ["privacy-model"],
    planned: ["What Zcash hides", "What Obliq knows"],
  },
  {
    title: "Zcash",
    pages: ["zcash-strategy"],
    planned: [
      "ZIP-321",
      "Shielded settlement",
      "Viewing keys",
      "PCZT",
      "FROST",
    ],
  },
  {
    title: "Security",
    pages: ["security-principles"],
    planned: [
      "Threat model",
      "Key separation",
      "Settlement safety",
      "Audit trail",
    ],
  },
  {
    title: "Developers",
    pages: ["architecture"],
    planned: [
      "Domain model",
      "API reference",
      "State machines",
      "Environment setup",
    ],
  },
  {
    title: "Resources",
    pages: ["implementation-status"],
    planned: ["FAQ", "Roadmap", "Changelog"],
  },
];

export function getDoc(slug: string): DocPage | undefined {
  return docs.find((doc) => doc.slug === slug);
}
