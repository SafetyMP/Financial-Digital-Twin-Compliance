#!/usr/bin/env bash
# One job: three payments from one originator inside ten minutes of event time.
# Compiles only the pattern class. It does not start Flink, Kafka, or Compose.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/jobs/compliance-cep/src/main/java/com/digitaltwin/jobs/cep/patterns/EventTimeVelocityPattern.java"
if javac -version >/dev/null 2>&1 && java -version >/dev/null 2>&1; then
  OUT="$(mktemp -d)"
  trap 'rm -rf "$OUT"' EXIT
  javac -d "$OUT" "$SRC"
  java -cp "$OUT" com.digitaltwin.jobs.cep.patterns.EventTimeVelocityPattern
else
  docker run --rm \
    -v "$ROOT/jobs/compliance-cep/src/main/java":/src:ro \
    maven:3.9-eclipse-temurin-17 \
    bash -c 'javac -d /tmp/out /src/com/digitaltwin/jobs/cep/patterns/EventTimeVelocityPattern.java && java -cp /tmp/out com.digitaltwin.jobs.cep.patterns.EventTimeVelocityPattern'
fi
