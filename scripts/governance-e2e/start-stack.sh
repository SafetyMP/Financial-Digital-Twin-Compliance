#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
compose=(docker compose -p "${COMPOSE_PROJECT_NAME:-governance-e2e}" -f docker-compose.governance-test.yml)
mkdir -p scripts/governance-e2e/artifacts
"${compose[@]}" up -d --wait --wait-timeout 240 alert-db audit-db kafka immudb
for topic in compliance.alerts compliance.alerts.dlq compliance.audit.pending compliance.audit.pending.dlq compliance.audit.recorded; do
  "${compose[@]}" exec -T kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:9092 --create --if-not-exists --topic "$topic" --partitions 1 --replication-factor 1
done
"${compose[@]}" up -d --build --wait --wait-timeout 240 alert-service audit-service
node scripts/governance-e2e/seed.mjs | "${compose[@]}" exec -T kafka /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server kafka:9092 --topic compliance.alerts
node scripts/governance-e2e/wait-evidence.mjs

"${compose[@]}" up -d --build --wait --wait-timeout 180 governance-console
