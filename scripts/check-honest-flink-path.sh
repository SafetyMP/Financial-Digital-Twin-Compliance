#!/usr/bin/env bash
# Documents the current Flink job: per-record streaming, no flink-cep artifact,
# WatermarkStrategy.noWatermarks(). Fails if pom.xml gains a flink-cep dependency,
# or if ComplianceCepJob enables event-time watermarks without a README change.
# HONEST_FLINK_ROOT overrides the repo root (used to exercise the failure cases).
set -euo pipefail

ROOT="${HONEST_FLINK_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
POM="${ROOT}/jobs/compliance-cep/pom.xml"
JOB="${ROOT}/jobs/compliance-cep/src/main/java/com/digitaltwin/jobs/cep/ComplianceCepJob.java"
README="${ROOT}/README.md"

fail() {
  echo "honest-flink-path: FAIL: $*" >&2
  exit 1
}

[[ -f "$POM" ]] || fail "missing $POM"
[[ -f "$JOB" ]] || fail "missing $JOB"
[[ -f "$README" ]] || fail "missing $README"

python3 - "$POM" <<'PY'
import re
import sys

path = sys.argv[1]
text = open(path, encoding="utf-8").read()
text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
if re.search(r"<artifactId>\s*flink-cep[^<]*</artifactId>", text):
    sys.exit("honest-flink-path: FAIL: jobs/compliance-cep/pom.xml depends on flink-cep")
PY

# Event-time watermark APIs. noWatermarks() is the honest current behavior.
EVENT_TIME_MARKERS=(
  forMonotonousTimestamps
  forBoundedOutOfOrderness
  forGenerator
  assignTimestampsAndWatermarks
  withWatermarkAlignment
)

job_text="$(cat "$JOB")"
readme_text="$(cat "$README")"

enabled_markers=""
for marker in "${EVENT_TIME_MARKERS[@]}"; do
  if grep -q "$marker" <<<"$job_text"; then
    if ! grep -q "$marker" <<<"$readme_text"; then
      fail "ComplianceCepJob enables event-time watermarks (${marker}) without a README change"
    fi
    enabled_markers="${enabled_markers} ${marker}"
  fi
done

if grep -q 'WatermarkStrategy.noWatermarks' <<<"$job_text"; then
  if ! grep -q 'WatermarkStrategy.noWatermarks' <<<"$readme_text"; then
    fail "README must document WatermarkStrategy.noWatermarks while ComplianceCepJob uses it"
  fi
elif [[ -z "${enabled_markers}" ]]; then
  fail "ComplianceCepJob does not use WatermarkStrategy.noWatermarks and does not name an event-time watermark strategy"
fi

if ! grep -q 'flink-cep' <<<"$readme_text"; then
  fail "README must state that the job has no flink-cep artifact"
fi

echo "honest-flink-path: ok (per-record streaming, WatermarkStrategy.noWatermarks, no flink-cep artifact)"
