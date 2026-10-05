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
    description: "What Obliq is, who it serves, and what exists in Phase 2.",
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
          "Phase 2 adds versioned deterministic controls, structured findings, server-authorized human approvals and explainable settlement readiness to the persisted obligation engine.",
        ],
        bullets: [
          "Manual and invoice-backed obligation capture",
          "Exact integer money types and PostgreSQL bigint columns",
          "Server-enforced organization membership and tenant-scoped repositories",
          "Version-bound policy decisions, approvals and readiness records",
          "Zcash interfaces with no fake implementation",
        ],
      },
      {
        id: "not-yet",
        title: "What does not exist yet",
        paragraphs: [
          "Zcash pricing, payment requests, wallet integration, signing, broadcast, scanning, reconciliation and evidence generation are not live.",
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
          "A minimum read-only capability may later support reconciliation",
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
          "The web application owns presentation and server entry points. Domain owns invariant-bearing types. Database owns tenant-aware persistence definitions. Zcash owns protocol-facing ports without pretending adapters exist.",
        ],
        code: "apps/web            product surfaces + server boundary\npackages/domain     money, states, tenant invariants\npackages/database   PostgreSQL schema + migrations\npackages/zcash      payment, signer, observer ports",
      },
      {
        id: "flow",
        title: "Authority flow",
        paragraphs: [
          "The intended future flow is application readiness checks, a version-bound SettlementIntent, an external signing handoff, user-controlled signing, broadcast, and evidence-driven read-only reconciliation.",
        ],
      },
      {
        id: "planned",
        title: "Planned package boundaries",
        paragraphs: [
          "Policy is an executable framework-independent package. Ledger and evidence remain documented future boundaries; AI owns extraction suggestions only.",
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
          "Prepare an exact, expiring settlement intent and hand it to an authorized external signer. Broadcast is not settlement. Phase 4 scope.",
        ],
      },
      {
        id: "reconcile",
        title: "Reconcile",
        paragraphs: [
          "Observe shielded payment evidence with minimum viewing authority and match it to the obligation. Scanner failure produces unknown or unavailable state—not unpaid. Phase 3–4 scope.",
        ],
      },
      {
        id: "prove",
        title: "Prove",
        paragraphs: [
          "Create integrity-protected application evidence from canonical business and settlement records. This is not represented as a zero-knowledge proof. Phase 5 scope.",
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
          "Obliq necessarily holds operational application records. A later reconciliation component may hold the minimum read-only viewing capability required by the selected stack. Viewing material is a high-value privacy secret even though it cannot spend.",
        ],
      },
      {
        id: "phase-zero",
        title: "Current guarantee",
        paragraphs: [
          "No Zcash viewing or spending key is accepted, stored, rendered or sent client-side by the current implementation. Invoice records are operationally private to the configured organization boundary, not encrypted end-to-end.",
        ],
        callout: {
          tone: "note",
          title: "No inflated claim",
          text: "Phase 2 does not execute shielded transactions, so READY_TO_SETTLE does not claim that a customer payment is private or settled.",
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
          "The database schema and environment contract contain no seed phrase, spending key or signer credential. The Zcash boundary exposes only an external signing handoff interface.",
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
          "Every tenant-owned financial table carries organization_id. Domain guards reject cross-organization access. The development session abstraction fails closed outside development; production identity integration remains planned.",
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
          "ZIP-321 is the canonical request format where compatible. A request will carry an exact amount and may carry an opaque encrypted obligation reference. Sensitive invoice prose must never enter shareable URIs or plaintext chain metadata.",
        ],
      },
      {
        id: "read-path",
        title: "Read-only reconciliation",
        paragraphs: [
          "Phase 3 must prove the exact Orchard-capable observation path with real shielded payment evidence and no spend authority. Export support must not be confused with import-and-scan support.",
        ],
      },
      {
        id: "advanced",
        title: "PCZT and FROST",
        paragraphs: [
          "These draft specifications inform separation of responsibilities but are not competition-critical dependencies. Obliq will not claim either integration until an exact implementation works end to end.",
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
          "PostgreSQL-backed vendors, versioned unverified destinations, manual and invoice-backed obligations, exact money parsing, deterministic duplicate detection, private local document storage, organization-scoped audit events and server-side tenant repositories.",
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
          "Production authentication provider integration, signing, shielded settlement, viewing/scanning, reconciliation, ledger settlement operations and evidence packages are not implemented.",
        ],
        callout: {
          tone: "warning",
          title: "Current proof boundary",
          text: "There is no real settlement, network connection, transaction identifier or blockchain evidence to verify in Phase 2.",
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
          "The server accepts PDF, PNG and JPEG up to the configured limit. It checks file signatures and declared MIME agreement, hashes content with SHA-256, generates a storage identifier and keeps the original filename as metadata only. There is no public raw-file route.",
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
          text: "READY_TO_SETTLE is business authorization. Phase 2 cannot construct, sign, broadcast or reconcile a Zcash transaction.",
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
          "Vendor and destination actions, source and obligation changes, policy versions and evaluations, control findings, approval requests and decisions, invalidations, duplicate resolutions and readiness evaluations produce actor-attributed events.",
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
      "audit-history",
    ],
    planned: ["Settlements", "Reconciliation", "Evidence"],
  },
  {
    title: "Privacy",
    pages: ["privacy-model"],
    planned: ["What Zcash hides", "What Obliq knows", "Disclosure model"],
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
