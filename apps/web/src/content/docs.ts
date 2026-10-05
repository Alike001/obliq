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
    description: "What Obliq is, who it serves, and what exists in Phase 0.",
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
          "Phase 0 establishes the repository, product design system, navigation, documentation, database schema, domain types, tenant boundary, and adapter contracts.",
        ],
        bullets: [
          "Landing, app shell, docs, security and proof routes",
          "Exact integer money types and PostgreSQL bigint columns",
          "Organization/user/membership schema and server-only development-session boundary",
          "Zcash interfaces with no fake implementation",
        ],
      },
      {
        id: "not-yet",
        title: "What does not exist yet",
        paragraphs: [
          "No obligation CRUD, invoice processing, AI extraction, approvals, settlement, scanning, transaction execution, reconciliation, audit chain, or evidence generation is live.",
        ],
        callout: {
          tone: "warning",
          title: "Foundation status",
          text: "Product screens may contain clearly labelled seeded examples. They are not persisted records or blockchain evidence.",
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
          "Policy, ledger, evidence and AI will become packages only when their implementation begins. Their boundaries are documented now without creating empty workspaces.",
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
          "Create an obligation from trusted manual input or a source document. Phase 1 scope; currently planned.",
        ],
      },
      {
        id: "control",
        title: "Control",
        paragraphs: [
          "Evaluate deterministic policy and collect required human approvals. Approval remains distinct from settlement. Phase 2 scope.",
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
        title: "Phase 0 guarantee",
        paragraphs: [
          "No Zcash viewing or spending key is accepted, stored, rendered or sent client-side by the current implementation.",
        ],
        callout: {
          tone: "note",
          title: "No inflated claim",
          text: "Phase 0 does not yet execute shielded transactions, so it does not claim that a customer payment is private or settled.",
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
          "Repository tooling, design system, public surfaces, application shell, documentation renderer, schema/migration foundation, exact money types, tenant guard, security headers and Zcash adapter contracts.",
        ],
      },
      {
        id: "seeded",
        title: "Seeded",
        paragraphs: [
          "The application overview contains example vendors, totals and attention items. They are visual fixtures only and do not enter a production or proof path.",
        ],
      },
      {
        id: "planned",
        title: "Planned and unavailable",
        paragraphs: [
          "Obligation CRUD, authentication provider integration, policy execution, approvals, signing, shielded settlement, viewing/scanning, reconciliation, ledger operations, evidence generation and audit-chain verification are not implemented.",
        ],
        callout: {
          tone: "warning",
          title: "Current proof boundary",
          text: "There is no real settlement, network connection, transaction identifier or audit-chain result to verify in Phase 0.",
        },
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
    pages: ["product-lifecycle"],
    planned: [
      "Obligations",
      "Vendors",
      "Policies",
      "Approvals",
      "Settlements",
      "Reconciliation",
      "Evidence",
    ],
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
