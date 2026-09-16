---
applyTo: "**/*.go"
---

# Go coding standards (September 2026)

- Match the existing module's Go version and package layout. Do not bump Go in drive-by work.
- Handle errors. Do not discard them with `_` unless the surrounding file already documents why.
- Keep packages focused. Follow existing `internal/` versus exported splits.
- Tests: `go test` in the same module. Prefer table-driven tests when neighboring files do.
- Do not encode caller identity in query parameters or other attacker-controlled fields.

## This repository

- Keep nested `services/*/AGENTS.md`. Do not flatten them.
- Do not bump Go in drive-by docs or lint work.
