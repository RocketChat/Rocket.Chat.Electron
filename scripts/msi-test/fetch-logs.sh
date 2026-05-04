#!/usr/bin/env bash
set -euo pipefail

VM_HOST="${VM_HOST:-192.168.13.87}"
VM_PORT="${VM_PORT:-22}"
VM_USER="${VM_USER:-jean}"
: "${VM_PASS:?Set VM_PASS to the Windows VM password (export VM_PASS=...)}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

HARNESS_KNOWN_HOSTS="${SCRIPT_DIR}/.known_hosts"
SSH_OPTS=(
  -o StrictHostKeyChecking=accept-new
  -o "UserKnownHostsFile=${HARNESS_KNOWN_HOSTS}"
  -o ConnectTimeout=5
)
SSHPASS=(sshpass -p "${VM_PASS}")
TIMESTAMP="$(date +%Y%m%dT%H%M%S)"
LOG_DIR="${SCRIPT_DIR}/logs/${TIMESTAMP}"
mkdir -p "${LOG_DIR}"

echo "Fetching logs from ${VM_HOST} into ${LOG_DIR} ..."

"${SSHPASS[@]}" scp "${SSH_OPTS[@]}" -P "${VM_PORT}" \
  "${VM_USER}@${VM_HOST}:test-results.json" \
  "${LOG_DIR}/test-results.json" && echo "  test-results.json" || echo "  WARN: test-results.json not found"

for log in install-a.log install-b.log install-c.log; do
  "${SSHPASS[@]}" scp "${SSH_OPTS[@]}" -P "${VM_PORT}" \
    "${VM_USER}@${VM_HOST}:${log}" \
    "${LOG_DIR}/${log}" && echo "  ${log}" || echo "  WARN: ${log} not found"
done

echo ""
echo "Saved to: ${LOG_DIR}"

if [[ -f "${LOG_DIR}/test-results.json" ]]; then
  echo ""
  echo "--- test-results.json ---"
  if command -v jq >/dev/null 2>&1; then
    jq -r '.[] | "\(.scenario)  \(.result)  \(.details)"' "${LOG_DIR}/test-results.json"
  else
    cat "${LOG_DIR}/test-results.json"
  fi
fi
