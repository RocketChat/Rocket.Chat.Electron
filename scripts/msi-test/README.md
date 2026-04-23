# MSI Test Suite — DISABLE_AUTO_UPDATES (PROD-595)

Validates that passing `DISABLE_AUTO_UPDATES=1` to the Rocket.Chat MSI installer correctly
writes `C:\Program Files\Rocket.Chat\resources\update.json` with `{"canUpdate":false,"autoUpdate":false}`.

## Prerequisites

- macOS host with `sshpass`, `ssh`, `scp` in PATH
- Windows 10 VM with OpenSSH on port 22. Configure `VM_HOST`, `VM_PORT`, `VM_USER`, and `VM_PASS` in your shell before running these scripts. Example:
  ```
  export VM_HOST=192.168.13.87 VM_USER=jean VM_PASS='<your password>'
  bash scripts/msi-test/run-msi-tests.sh
  ```
  Never commit `VM_PASS` to the repo.
- Built MSI artifact — e.g. `dist/rocketchat-4.14.0-win-x64.msi`
- VM must be running before you invoke the orchestrator
- If the VM is reprovisioned behind the same IP, delete `scripts/msi-test/.known_hosts` before running again.

## Files

| File | Runs on | Purpose |
|------|---------|---------|
| `run-msi-tests.sh` | macOS | Orchestrator: copy files, run PS1, report |
| `test-on-windows.ps1` | Windows VM | Three test scenarios |
| `fetch-logs.sh` | macOS | Pull results + install logs after a run |

## Scenarios

| Scenario | What it tests |
|----------|---------------|
| A — baseline | Plain install leaves `update.json` absent |
| B — DISABLE_AUTO_UPDATES=1 | Property written as current user context |
| C — SYSTEM context (SCCM sim) | Property written via PsExec -s (SYSTEM account) |

## Running

```bash
# Full run (copies an existing MSI, executes tests, prints summary)
MSI_PATH=dist/rocketchat-4.14.0-win-x64.msi ./scripts/msi-test/run-msi-tests.sh

# Or pass as argument
./scripts/msi-test/run-msi-tests.sh dist/rocketchat-4.14.0-win-x64.msi

# Fetch logs from a previous run without re-running tests
./scripts/msi-test/fetch-logs.sh
```

## VM not reachable?

The orchestrator will print a message with the Proxmox web UI URL if port 22 is closed.
Start the VM there, wait ~30 s, then retry.

## Results

- Live output printed to stdout during run
- `scripts/msi-test/logs/<timestamp>/test-results.json` — structured pass/fail per scenario
- `scripts/msi-test/logs/<timestamp>/install-*.log` — verbose MSI logs from each scenario
