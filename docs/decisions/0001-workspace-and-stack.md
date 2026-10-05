# ADR 0001: TypeScript workspace and web stack

**Status:** Accepted — 2026-10-05

Use npm workspaces, Next.js App Router, strict TypeScript, Tailwind CSS, PostgreSQL with Drizzle schema/migrations, and Vitest. Avoid an additional task orchestrator until workspace scale justifies it.

The decision keeps one language across product and domain boundaries while preserving framework-independent packages. Dependency versions were checked against the package registry; framework setup follows current official documentation after Context7 was attempted but unavailable.
