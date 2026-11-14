# Evidence and explainability reference

## Scope

This engineering reference describes monitoring signals, policy decisions, and their audit linkage. It is not a regulator-approved assurance pack. In the [governance workspace](product-vision.md), reviewers see available observations and thresholds, then inspect evidence and request an explicit chain check. Missing context stays missing; neither a retrieved record nor a recorded review establishes regulatory compliance.

Connected review history is PostgreSQL application data, separate from immudb audit entries. The public demo uses synthetic evidence and browser-local history. See [connected review behavior](governance-integration.md#review-behavior) for these distinctions.

## Risk scores (Phase 2+)

| Signal | Source | Consumer |
|--------|--------|----------|
| Payment velocity | Per-record Flink job, Redis `vel:*` | INT-M001, or Zen INT-R001 when `CEP_DECISION_SERVICE_URL` is set |
| Counterparty exposure | Same job, Redis `exp:*` from twin notional | INT-M002, or Zen INT-R002 when that URL is set |
| LCR | Twin `liquidity.lcr`, then `setLcr` | BASEL-M001, or Zen BASEL-R001 when that URL is set |
| Stressed CET1 / capital | Simulation Service | Zen COREP-R001/R002 |

## Policy decisions

- **Cedar** (`cedar-service`): ABAC authorization; audit via `compliance.audit.pending`
- **GoRules Zen** (`decision-service`): compliance rules; same audit topic
- Decisions include rule codes and outcomes searchable in Audit Explorer

## Audit linkage

The reference services can publish audit intents for alerts, simulations, and report operations. For a recorded subject, inspect its `evidenceRef` (or subject ID) and explicitly verify the chain. Missing references and failed retrieval are not successful checks:

```bash
./scripts/verify-audit-chain.sh
curl -s "$AUDIT_SERVICE_URL/api/v1/audit/entries?subjectId=<id>"
```

## AI / reg→policy (Phase 7)

These experimental engineering paths are outside the core review workflow. Draft stubs are **proposals only**; they do not change governance decisions or establish legal interpretation. Cedar/Zen evaluate the configured rules. No auto-promotion to production is implied (CR-3).
