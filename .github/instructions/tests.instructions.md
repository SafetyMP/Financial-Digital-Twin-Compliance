---
applyTo: "**/*_test.go,**/*.{test,spec}.ts,**/*.{test,spec}.tsx,**/src/test/**/*.java,**/*Test.java"
---

# Test standards (September 2026)

- Use `go test` in the same Go module. Prefer table-driven tests when neighbors do.
- Cover deny paths, not only allow paths, for authorization and policy evaluation.
- Do not skip or weaken `./scripts/harness/verify.sh` to land a change.
- Do not invent a passing gate from prose.

## This repository

- Definition of Done: `./scripts/harness/verify.sh` (hermetic; no Docker smoke).
- Phase 1–4 Compose smoke is separate (`scripts/smoke-test*.sh`).
- Do not bump Go, Java, or Next in drive-by work.
