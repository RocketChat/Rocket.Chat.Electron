---
id: SV-QA-001
title: SHA-prefixed supported-version exception allows matching server commit
platforms: [windows, macos, linux]
priority: smoke
qase:
  suite: Supported versions
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [repo_checkout, dependencies_installed]
test_links: []
expected_result: A server matching a sha-prefixed exception is treated as supported and does not show the unsupported-version block.
---

# SHA-Prefixed Supported-Version Exception

## Review Basis

- Comparison range: `master` to `feat/telephony-deeplink`.
- Changed surface: Supported-version exception matching in
  `src/servers/supportedVersions/main.ts`.
- User-visible risk: A customer can be blocked by the unsupported-version
  dialog even though their server commit is explicitly allowed by a
  `sha-<commit-prefix>` exception.
- Hypothesis: When supported-version data contains an exception like
  `sha-bb83777` and the server reports git commit hash `bb83777b51a42d`, Desktop
  treats the server as supported.
- Smallest useful proof: Targeted Jest coverage in
  `src/servers/supportedVersions/main.main.spec.ts`; runtime validation requires
  a server and supported-version data fixture controlled by the release owner.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | From a terminal at the Rocket.Chat Desktop repo root, confirm the branch under test is checked out with `git branch --show-current`. | Expected branch: `feat/telephony-deeplink` or the release branch containing the supported-version exception change. | Terminal shows the intended branch name. | Run `git branch --show-current` and record the output. |
| 2 | Run the targeted supported-version test file: `yarn test src/servers/supportedVersions/main.main.spec.ts --runInBand`. | Test case names include `should support sha-prefixed exception versions by git commit hash` and `should not match malformed exception versions by git commit hash`. | The targeted test command exits successfully. | Execute the command and capture pass/fail output. |
| 3 | In the terminal output, find the test named `should support sha-prefixed exception versions by git commit hash`. | Exception version: `sha-bb83777`; server git commit hash: `bb83777b51a42d`. | The matching SHA-prefixed exception test passes. | Inspect the test output or rerun the specific test if the runner supports name filtering. |
| 4 | If the release owner provides a runtime fixture, launch the Desktop build and add the server whose supported-version data contains the `sha-<commit-prefix>` exception. | Fixture must include the same server domain/unique ID rules used by supported-version data and a matching server git commit hash. | Desktop opens the server without showing the unsupported-version block. | If a fixture is unavailable, mark runtime validation as blocked and keep the targeted test as code-path proof. |
| 5 | Record the result using `qa/supported-versions/README.md` result format. | Include branch, platform, test command, and whether runtime fixture validation was available. | Result clearly distinguishes confirmed test proof from blocked runtime validation. | Write a concise result note without committing machine-specific logs unless requested. |

## Evidence

- Targeted test output showing the SHA-prefixed exception test passed.
- Optional screenshot showing the app opened the matching server without the
  unsupported-version block.

## Failure Signals

- Targeted supported-version test fails.
- Matching `sha-<commit-prefix>` exception is treated as unsupported.
- Unsupported-version block appears for the matching runtime fixture.
- Runtime fixture is unavailable but the result is reported as fully validated.
