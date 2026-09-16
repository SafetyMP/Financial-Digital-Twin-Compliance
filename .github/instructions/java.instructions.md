---
applyTo: "**/*.java"
---

# Java coding standards (September 2026)

- Match the existing Maven/Gradle and Flink versions. Do not bump Java or Flink in drive-by work.
- Keep CEP job logic in `jobs/compliance-cep/`. Do not relocate it into a Node console.
- Prefer explicit types at public method boundaries.
- Add or update tests next to the existing job test layout.
