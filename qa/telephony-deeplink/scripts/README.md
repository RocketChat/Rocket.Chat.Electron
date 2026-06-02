# QA Helper Scripts

This folder is reserved for small helper scripts used by the telephony QA flows.

Rules for future scripts:

- Keep scripts platform-specific when they call OS tools.
- Print a short pass/fail summary and the exact commands run.
- Do not change system defaults unless the flow explicitly says to do so.
- Prefer read-only checks for registry, desktop files, and protocol handlers.

Shared QA scripts live in `qa/scripts/`:

- `validate-flows.mjs` checks source Markdown structure.
- `export-qase-csv.mjs` generates the Qase import CSV.
