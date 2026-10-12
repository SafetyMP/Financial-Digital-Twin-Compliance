# Phase 5 local demo runbook

Walkthrough for Report Console. `services/reporting-service/reporting_service/generators.py` string-builds local-name XML. FINREP uses an `xbrl` root and the namespace `http://digitaltwin.local/finrep/f01/`. AnaCredit and DORA use their own local namespaces. `validate.py` checks those local names. This is not an Arelle or EBA filing, not SDMX, and not the payment path.

The dropdown labels say local-name XML. That matches `generators.py`. It is not an EBA or ECB filing.

**Prerequisites**: Docker, `curl`, `jq`. Dev Compose with `reporting-service`, MinIO, and Report Console healthy.

---

## Port map

| Service | URL | Demo use |
|---------|-----|----------|
| Report Console | http://localhost:3005 | Lifecycle UI |
| Reporting Service | http://localhost:8095 | REST report API |
| MinIO Console | http://localhost:9001 | Bucket browser |
| Audit Explorer | http://localhost:3002 | `evidenceRef` after submit |

Use the shared console app switcher to jump from Alert/Audit into Report Console.

---

## Before the room (~5 min if stack warm)

```bash
cd Financial-Digital-Twin-Compliance
docker compose -f docker-compose.dev.yml up -d --wait reporting-service report-console minio
```

If those services were never built, use `docker compose -f docker-compose.dev.yml up -d --wait` first. Do not treat `./scripts/smoke-test-phase5.sh` as a passing check on this Compose file: its submit step requires `objectLock == true`.

---

## Suggested narrative (~10 minutes)

### 1. Create draft (3 min)

Open **Report Console** (http://localhost:3005). Choose **FINREP F01 (local-name XML)**, **AnaCredit Table 2 (local-name XML)**, or **DORA ICT Register (local-name XML)**. Those are the option labels in `apps/report-console/src/app/page.tsx`. Click **Create draft** and show `id` + `status=draft`.

### 2. Validate → submit (4 min)

**Validate** then **Submit**. Show `taxonomyVersion`, `objectKey`, and `evidenceRef`. `storage.py` creates the bucket with object lock and writes governance retention. `scripts/smoke-test-phase5.sh` requires `objectLock == true`. `docker-compose.dev.yml` starts MinIO as `server /data` (one drive). Object lock needs an erasure set, so this Compose service cannot complete that submit.

### 3. Smoke script

`./scripts/smoke-test-phase5.sh` also checks taxonomy rows and an audit entry. On this Compose file it stops at submit, because `objectLock` is not true. See [ADR-011](adr/011-phase5-reporting-foundation.md) for the original plan.

---

## Related

- Journey map: [phase-journeys.md](phase-journeys.md)
- [ADR-011](adr/011-phase5-reporting-foundation.md)
