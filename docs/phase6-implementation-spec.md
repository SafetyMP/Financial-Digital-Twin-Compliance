# Phase 6 Implementation Spec (CECT)

> Historical engineering specification. Original targets and status labels are retained; use the [product vision](product-vision.md) and [current capability map](phase-journeys.md) for present scope and verification.

**Status**: Planning → implementation under CECT site delivery  
**Authority**: [ADR-012](adr/012-phase6-hardening-foundation.md) + corporate acceptance `AC-A-P6-*`

## Scope

- Keycloak/OIDC on public edges (401 without token)
- TLS at Compose edge
- OpenTelemetry cross-service traces
- DR runbooks (Kafka/Flink/immudb), explainability pack, deployment residuals
- CI-sized load profile honesty (UR-CECT-002)

## Depends on

Phase 5 smoke-green (ADR-011) before claiming Tranche A complete.
