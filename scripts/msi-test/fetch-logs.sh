#!/usr/bin/env bash
set -euo pipefail

VM_HOST="192.168.13.87"
VM_PORT=22
VM_USER="jean"
VM_PASS="cb6wist3"

SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5"
SSHPASS="sshpass -p ${VM_PASS}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP="$(date +%Y%m%dT%H%M%S)"
LOG_DIR="${SCRIPT_DIR}/logs/${TIMESTAMP}"
mkdir -p "${LOG_DIR}"

echo "Fetching logs from ${VM_HOST} into ${LOG_DIR} ..."

${SSHPASS} scp ${SSH_OPTS} -P "${VM_PORT}" \
  "${VM_USER}@${VM_HOST}:test-results.json" \
  "${LOG_DIR}/test-results.json" && echo "  test-results.json" || echo "  WARN: test-results.json not found"

for log in install-a.log install-b.log install-c.log; do
  ${SSHPASS} scp ${SSH_OPTS} -P "${VM_PORT}" \
    "${VM_USER}@${VM_HOST}:${log}" \
    "${LOG_DIR}/${log}" && echo "  ${log}" || echo "  WARN: ${log} not found"
done

echo ""
echo "Saved to: ${LOG_DIR}"

if [[ -f "${LOG_DIR}/test-results.json" ]]; then
  echo ""
  echo "--- test-results.json ---"
  grep -E '"scenario"|"result"|"details"' "${LOG_DIR}/test-results.json" || cat "${LOG_DIR}/test-results.json"
fi
