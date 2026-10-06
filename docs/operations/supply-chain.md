# Dependency and supply-chain review

Phase-6 review date: 2026-10-06.

- npm lockfile is current; production audit reports zero known vulnerabilities.
- The all-dependency audit reports nine development-tool advisories (four
  moderate, five high) through `drizzle-kit`'s legacy esbuild loader and
  `eslint-config-next`'s glob stack. npm proposes incompatible downgrades, not a
  safe current fix. These packages are excluded from the production graph and
  must not be exposed as network services.
- Critical direct licenses: Next.js/React/openid-client MIT; AWS SDK S3 and
  Drizzle ORM Apache-2.0; postgres.js Unlicense.
- The Rust observer remains locked. `cargo fmt`, `cargo check` and `cargo test`
  pass. Installing `cargo-audit 0.22.2` was attempted but crates.io timed out
  fetching `camino`, so a RustSec result is unavailable rather than reported as
  clean.
- Zaino and other researched services are not copied or linked into Obliq.
  No AGPL dependency was found in the application lockfiles/source scan.
- CI and releases must use lockfiles, run the production npm audit and rerun
  RustSec audit in a network environment able to fetch the advisory database.

Dependency audit results are time-sensitive and are not a permanent security
attestation.
