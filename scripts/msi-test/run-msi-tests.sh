#!/usr/bin/env bash
set -euo pipefail

VM_HOST="${VM_HOST:-192.168.13.87}"
VM_PORT="${VM_PORT:-22}"
VM_USER="${VM_USER:-jean}"
: "${VM_PASS:?Set VM_PASS to the Windows VM password (export VM_PASS=...)}"
REMOTE_MSI='Downloads\\rocketchat-test.msi'
REMOTE_PS1='test-msi.ps1'
REMOTE_PS1_FULL='C:\\Users\\'"${VM_USER}"'\\test-msi.ps1'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

HARNESS_KNOWN_HOSTS="${SCRIPT_DIR}/.known_hosts"
SSH_OPTS=(
  -o StrictHostKeyChecking=accept-new
  -o "UserKnownHostsFile=${HARNESS_KNOWN_HOSTS}"
  -o ConnectTimeout=5
)
SSHPASS=(sshpass -p "${VM_PASS}")

MSI_PATH="${1:-${MSI_PATH:-}}"

# --- resolve MSI path ---
if [[ -z "${MSI_PATH}" ]]; then
  # try to find a built MSI in dist/ — select by mtime, not lexical sort
  if find --version >/dev/null 2>&1; then
    # GNU find (Linux)
    MSI_PATH="$(find "${SCRIPT_DIR}/../../dist" -maxdepth 1 -name '*.msi' -printf '%T@ %p\n' 2>/dev/null \
      | sort -n | tail -1 | cut -d' ' -f2- || true)"
  else
    # macOS / BSD find
    MSI_PATH="$(find "${SCRIPT_DIR}/../../dist" -maxdepth 1 -name '*.msi' -print0 2>/dev/null \
      | xargs -0 stat -f '%m %N' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2- || true)"
  fi
fi

if [[ -z "${MSI_PATH}" || ! -f "${MSI_PATH}" ]]; then
  echo "ERROR: MSI not found. Pass path as first argument or set MSI_PATH env var."
  echo "  Example: MSI_PATH=dist/rocketchat-4.14.0-win-x64.msi $0"
  exit 1
fi

echo "Using MSI: ${MSI_PATH}"

# --- verify VM reachable ---
echo "Probing VM ${VM_HOST}:${VM_PORT} ..."
if ! nc -z -w 5 "${VM_HOST}" "${VM_PORT}" 2>/dev/null; then
  echo "ERROR: Cannot reach ${VM_HOST}:${VM_PORT}."
  echo "  Start the VM via Proxmox: https://192.168.13.1:8006 (or your Proxmox host)"
  echo "  Then wait ~30 s and re-run."
  exit 1
fi
echo "VM reachable."

# --- copy MSI ---
echo "Copying MSI to VM ..."
"${SSHPASS[@]}" scp "${SSH_OPTS[@]}" -P "${VM_PORT}" \
  "${MSI_PATH}" \
  "${VM_USER}@${VM_HOST}:${REMOTE_MSI}"

# --- copy test script ---
echo "Copying test-on-windows.ps1 to VM ..."
"${SSHPASS[@]}" scp "${SSH_OPTS[@]}" -P "${VM_PORT}" \
  "${SCRIPT_DIR}/test-on-windows.ps1" \
  "${VM_USER}@${VM_HOST}:${REMOTE_PS1}"

# --- run PowerShell test script ---
echo "Running test-on-windows.ps1 on VM (this may take several minutes) ..."
set +e
"${SSHPASS[@]}" ssh "${SSH_OPTS[@]}" -p "${VM_PORT}" "${VM_USER}@${VM_HOST}" \
  "powershell -ExecutionPolicy Bypass -File ${REMOTE_PS1_FULL}"
PS_EXIT=$?
set -e

# --- fetch results ---
TIMESTAMP="$(date +%Y%m%dT%H%M%S)"
LOG_DIR="${SCRIPT_DIR}/logs/${TIMESTAMP}"
mkdir -p "${LOG_DIR}"

echo "Fetching results ..."
"${SSHPASS[@]}" scp "${SSH_OPTS[@]}" -P "${VM_PORT}" \
  "${VM_USER}@${VM_HOST}:test-results.json" \
  "${LOG_DIR}/test-results.json" 2>/dev/null || echo "WARN: test-results.json not found on VM."

for log in install-a.log install-b.log install-c.log; do
  "${SSHPASS[@]}" scp "${SSH_OPTS[@]}" -P "${VM_PORT}" \
    "${VM_USER}@${VM_HOST}:${log}" \
    "${LOG_DIR}/${log}" 2>/dev/null || true
done

# --- print summary ---
echo ""
echo "========================================"
echo "TEST SUMMARY"
echo "========================================"
if [[ -f "${LOG_DIR}/test-results.json" ]]; then
  # print each scenario result line
  if command -v jq >/dev/null 2>&1; then
    jq -r '.[] | "\(.scenario)  \(.result)  \(.details)"' "${LOG_DIR}/test-results.json"
  else
    cat "${LOG_DIR}/test-results.json"
  fi
else
  echo "No test-results.json retrieved."
fi
echo ""
echo "Logs saved to: ${LOG_DIR}"

if [[ "${PS_EXIT}" -ne 0 ]]; then
  echo "RESULT: FAILED (PowerShell exited ${PS_EXIT})"
  exit 1
else
  echo "RESULT: PASSED"
fi
