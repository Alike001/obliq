# ADR 0003: Broad schema, narrow runtime

**Status:** Accepted — 2026-10-05

Create the relational shape for the complete obligation lifecycle now because foreign-key direction, tenant ownership, money representation, destination versioning and evidence linkage are expensive to retrofit. Do not add CRUD or workflows before their phases. Fields expected to evolve (policy reasons, observations, metadata) use JSONB only where the envelope is intentionally variable; core identity, value and state remain typed columns.
