# Site harness wrappers

> Legacy site-delivery integration reference. The governance product uses the [documented CI and Pages workflows](github-setup.md); no external harness is required for its [quickstart](quickstart.md).

Corporate site delivery binds **only** this directory as `verification_scripts`:

- `verify.sh` → execs `../../scripts/verify.sh`
- `adversarial.sh` → execs `../../scripts/adversarial.sh`

Do not point gates at the whole `scripts/` tree.
