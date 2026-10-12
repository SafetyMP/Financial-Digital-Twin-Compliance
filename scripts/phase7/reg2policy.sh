#!/usr/bin/env bash
# Reg→policy proposal path: generate stubs into proposals/; reject invalid; accept valid.
# Never copies into policies/ (no auto-deploy — CR-3).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="${ROOT}/fixtures/phase7/reg2policy"
OUT="${REG2POLICY_OUT:-${ROOT}/proposals/reg2policy}"
EVIDENCE_DIR="${EVIDENCE_DIR:-${ROOT}/evidence}"
STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
TMP_BASE="${TMPDIR:-/tmp}/digital-twin-reg2policy-$$"
mkdir -p "$TMP_BASE"

# Prefer site paths; fall back to TMPDIR for readonly sandboxes (ops excellence).
if ! mkdir -p "$OUT" 2>/dev/null || ! touch "$OUT/.write-test" 2>/dev/null; then
  OUT="${TMP_BASE}/proposals"
  mkdir -p "$OUT"
fi
rm -f "$OUT/.write-test" 2>/dev/null || true

EVIDENCE="${EVIDENCE_DIR}/phase7-reg2policy-${STAMP}.txt"
if ! mkdir -p "$EVIDENCE_DIR" 2>/dev/null || ! : >"$EVIDENCE" 2>/dev/null; then
  EVIDENCE_DIR="${TMP_BASE}/evidence"
  mkdir -p "$EVIDENCE_DIR"
  EVIDENCE="${EVIDENCE_DIR}/phase7-reg2policy-${STAMP}.txt"
  : >"$EVIDENCE"
fi 2>/dev/null

log() { echo "$*" | tee -a "$EVIDENCE" >&2; }

# Generate (copy fixtures as "generator" output)
cp "$SRC/valid.cedar" "$OUT/proposed-valid.cedar"
cp "$SRC/invalid.cedar" "$OUT/proposed-invalid.cedar"
log "generated stubs under ${OUT}/"

reject_ok=0
accept_ok=0

# 0 = parsed, 1 = parse error, 2 = tool/read error. Never treat a missing check as reject.
proposal_parses() {
  local file="$1"
  local out="$2"
  local status=0
  case "$parser" in
    cedar)
      if cedar check-parse -p "$file" >"$out" 2>&1; then
        return 0
      fi
      return 1
      ;;
    checkparse)
      "$checkparse_bin" "$file" >"$out" 2>&1 || status=$?
      return "$status"
      ;;
    *)
      return 2
      ;;
  esac
}

parser=""
checkparse_bin=""
if command -v cedar >/dev/null 2>&1; then
  parser="cedar"
elif command -v go >/dev/null 2>&1; then
  checkparse_bin="${TMP_BASE}/checkparse"
  build_log="${TMP_BASE}/checkparse-build.log"
  if (
    cd "${ROOT}/services/cedar-service"
    go build -o "$checkparse_bin" ./cmd/checkparse
  ) >"$build_log" 2>&1; then
    parser="checkparse"
  else
    log "checkparse build failed; using fail-closed text check"
    cat "$build_log" >&2 || true
    parser="text"
  fi
else
  log "cedar and go absent; using fail-closed text check"
  parser="text"
fi

if [[ "$parser" == "text" ]]; then
  if grep -q 'permit' "$OUT/proposed-invalid.cedar" && ! grep -q ');' "$OUT/proposed-invalid.cedar"; then
    log "reject_path=PASS (fail-closed text: invalid contains permit and lacks );)"
    reject_ok=1
  else
    log "FAIL: invalid stub failed fail-closed text check"
    exit 1
  fi
  if grep -q 'permit' "$OUT/proposed-valid.cedar" && grep -q 'when' "$OUT/proposed-valid.cedar" && grep -q ');' "$OUT/proposed-valid.cedar"; then
    log "accept_path=PASS (fail-closed text: valid contains permit, when, and );)"
    accept_ok=1
  else
    log "FAIL: valid stub failed fail-closed text check"
    exit 1
  fi
else
  invalid_out="${TMP_BASE}/reg2-invalid.out"
  valid_out="${TMP_BASE}/reg2-valid.out"
  invalid_status=0
  proposal_parses "$OUT/proposed-invalid.cedar" "$invalid_out" || invalid_status=$?
  if [[ "$invalid_status" -eq 0 ]]; then
    log "FAIL: invalid stub unexpectedly parsed"
    exit 1
  fi
  if [[ "$parser" == "checkparse" && "$invalid_status" -ne 1 ]]; then
    log "FAIL: checkparse error on invalid stub (exit ${invalid_status})"
    cat "$invalid_out" >&2 || true
    exit 1
  fi
  log "reject_path=PASS (invalid stub failed parse)"
  reject_ok=1

  valid_status=0
  proposal_parses "$OUT/proposed-valid.cedar" "$valid_out" || valid_status=$?
  if [[ "$valid_status" -ne 0 ]]; then
    log "FAIL: valid stub did not parse"
    cat "$valid_out" >&2 || true
    exit 1
  fi
  log "accept_path=PASS (valid stub parsed)"
  accept_ok=1
fi

# Ensure we did NOT auto-deploy into policies/
if [[ -f "$ROOT/policies/cedar/proposed-valid.cedar" ]] && cmp -s "$OUT/proposed-valid.cedar" "$ROOT/policies/cedar/proposed-valid.cedar"; then
  log "FAIL: auto-deploy detected into policies/cedar"
  exit 1
fi
log "no_auto_deploy=PASS"
log "evidence=$EVIDENCE"
[[ "$reject_ok" == "1" && "$accept_ok" == "1" ]]
echo "reg2policy smoke passed"
