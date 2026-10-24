# QA Results

Store local run notes, screenshots, logs, or diagnostics JSON here while
testing. Do not commit run-specific evidence unless a release owner asks for it.

Recommended filename format:

```text
YYYY-MM-DD-platform-flow-id-result.md
```

Recommended result note format:

```text
Flow ID:
Platform:
Build:
Review range:
Coverage: Full requested range | Partial surface review
Result: Pass | Fail | Blocked
Finding status: confirmed | suspected | blocked | none
Evidence:
Notes:
```

Use `confirmed` only when the issue or pass condition was reproduced with
evidence. Use `suspected` when the code path is credible but not fully
reproduced. Use `blocked` when platform, permissions, environment, or build
access prevents validation.
