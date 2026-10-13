---
name: coderabbit-triage
description: Triage unresolved CodeRabbit review threads on a PR. Classify each one as accept, reject or verify, apply accepted fixes, then reply and resolve
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
gh api graphql --paginate -f query='
query($owner:String!, $repo:String!, $pr:Int!, $endCursor:String) {
  repository(owner:$owner, name:$repo) {
    pullRequest(number:$pr) {
      reviewThreads(first: 100, after: $endCursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          isResolved
          isOutdated
          path
          line
          comments(first: 100) {
            pageInfo { hasNextPage endCursor }
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

`--paginate` requests the next page of threads until `hasNextPage` is
false. It reads the first `pageInfo` in the response. Keep the
`reviewThreads` `pageInfo` above `nodes` so that it comes first.

A thread can have more comments than one page holds. If the
`comments.pageInfo.hasNextPage` of a thread is true, fetch the remaining
comments. Pass the `endCursor` of that thread as the start cursor:

```bash
gh api graphql --paginate -f query='
query($id:ID!, $endCursor:String) {
  node(id:$id) {
    ... on PullRequestReviewThread {
      comments(first: 100, after: $endCursor) {
        pageInfo { hasNextPage endCursor }
        nodes { author { login } body url }
      }
    }
  }
}' -f id=<THREAD_ID> -f endCursor=<COMMENTS_END_CURSOR> \
  --jq '.data.node.comments.nodes[]'
```

Note `isOutdated` per thread; an outdated thread
still needs a decision, just flag it as possibly stale (the line moved).

### 2. Classify each thread

For every unresolved CodeRabbit thread, assign one of:

- **ACCEPT** — clear correctness or convention win (real bug, matches an
  existing repo pattern, cites a rule from AGENTS.md).
- **REJECT** — wrong, style-only against this repo's conventions, or
  already handled elsewhere. State WHY with a concrete code reference
  (file:line or existing pattern), not just "disagree".
- **VERIFY** — the call requires running a test or reproducing behavior
  before deciding.

Treat review-bot feedback with caution. Bots are often confidently
wrong. Verify each claim against the actual code before you agree.
Do not accept a suggestion only because it sounds plausible.

### 3. Present the table and STOP

```
Thread | File:Line | Classification | Reason
```

Stop here for explicit user confirmation before touching any code or
calling any mutation.

### 4. On go: apply ACCEPT items

Apply straightforward ACCEPT fixes inline. Delegate a fix to a
subagent when it touches 2+ files or needs real logic changes. Run the
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
