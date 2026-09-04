---
name: coderabbit-triage
description: Triage unresolved CodeRabbit review threads on a PR: classify accept/reject/verify, apply accepted fixes, reply and resolve
disable-model-invocation: true
---

# CodeRabbit Triage

Triage unresolved CodeRabbit review threads on a PR, classify each one,
apply the fixes worth applying, and close the loop with a reply and
resolution. Never commit or push — this skill hands off, it does not
ship.

## Argument

PR number. If not given, resolve it for the current branch:

```bash
gh pr view --json number --jq '.number'
```

## Steps

### 1. Fetch unresolved CodeRabbit threads

```bash
gh api graphql -f query='
query($owner:String!, $repo:String!, $pr:Int!) {
  repository(owner:$owner, name:$repo) {
    pullRequest(number:$pr) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          isOutdated
          path
          line
          comments(first: 10) {
            nodes {
              author { login }
              body
              url
            }
          }
        }
      }
    }
  }
}' -f owner=RocketChat -f repo=Rocket.Chat.Electron -F pr=<PR_NUMBER> \
  --jq '.data.repository.pullRequest.reviewThreads.nodes[]
        | select(.comments.nodes[0].author.login == "coderabbitai")
        | select(.isResolved == false)'
```

Threads with more than 10 comments need a second page
(`comments(first: 10, after: $cursor)`) — check `comments.pageInfo` if a
thread looks truncated. Note `isOutdated` per thread; an outdated thread
still needs a decision, just flag it as possibly stale (the line moved).

### 2. Classify each thread

For every unresolved CodeRabbit thread, assign one of:

- **ACCEPT** — clear correctness or convention win (real bug, matches an
  existing repo pattern, cites a rule from AGENTS.md/CLAUDE.md).
- **REJECT** — wrong, style-only against this repo's conventions, or
  already handled elsewhere. State WHY with a concrete code reference
  (file:line or existing pattern), not just "disagree".
- **VERIFY** — the call requires running a test or reproducing behavior
  before deciding.

Apply the `personal-engineering-rules` skill's guidance on cautious
treatment of review-bot feedback: bots are frequently confidently
wrong — verify each claim against the actual code before agreeing, do
not rubber-stamp a suggestion just because it sounds plausible.

### 3. Present the table and STOP

```
Thread | File:Line | Classification | Reason
```

Stop here for explicit user confirmation before touching any code or
calling any mutation.

### 4. On go: apply ACCEPT items

Apply straightforward ACCEPT fixes inline; dispatch `builder-fast` for
anything touching 2+ files or requiring real logic changes. Run the
narrowest test scope that covers the change (see AGENTS.md Testing /
`pr-check` skill step 4 for the spec-mapping approach). Do not touch
REJECT or VERIFY items' code — VERIFY items get whatever check resolves
the question (run the test, reproduce the behavior), not a code change
unless the verification confirms the suggestion.

### 5. Reply and resolve per thread

Reply on every thread (ACCEPT, REJECT, and VERIFY once resolved) before
resolving it:

```bash
gh api graphql -f query='
mutation($threadId:ID!, $body:String!) {
  addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$threadId, body:$body}) {
    comment { id url }
  }
}' -f threadId=<THREAD_ID> -f body="<reply text>"
```

```bash
gh api graphql -f query='
mutation($threadId:ID!) {
  resolveReviewThread(input:{threadId:$threadId}) {
    thread { id isResolved }
  }
}' -f threadId=<THREAD_ID>
```

Never resolve a REJECT thread without a reply explaining why first —
silent resolution loses the reasoning for the next person who reads the
PR.

### 6. Hand off

Report what was applied, what was rejected (with reasons), and what
still needs the user's own verification. Never `git commit` or
`git push` — that decision stays with the user.
