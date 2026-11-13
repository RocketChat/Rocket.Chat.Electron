# Code comments

These rules adapt the Rocket.Chat repository's
[code comment guidelines](https://github.com/RocketChat/Rocket.Chat/blob/develop/docs/code-comments.md)
to the desktop app.

Comment the **intent** of a function: what a caller gets and what it guarantees.
Do not narrate the implementation. The code already says how it works.

Inside a function body, a comment is the exception. Use one when the reason is
not in the code:

- a workaround for an upstream bug in Electron, Chromium or an OS, with a link
  to the issue
- a platform, protocol or vendor constraint, such as a Windows Action Center
  card that stays repliable after `close()`
- an invariant that a future edit would break silently

## Let the declaration carry it

Before you write a docblock, cover it and read the signature: the name, the
parameters and the return type. If you can write the comment again from that,
delete the comment. If you cannot, but only because the declaration is vague,
fix the declaration.

The fix is often a parameter name, not the function name. `canRing(member,
now?)` needs no comment that says it means _now_.

An interface and its implementation are one function declared twice. Document
one of them.

## Better still, make the code say it

A comment that explains a value or a relationship is often a constant that you
can derive:

```ts
// three missed ticks at the rate a browser throttles a hidden tab to
const LEASE_MS = 180_000;
```

```ts
const THROTTLED_TICK_MS = 60_000;
const TICKS_TOLERATED = 3;
const LEASE_MS = THROTTLED_TICK_MS * TICKS_TOLERATED;
```

The second version cannot drift, because it is not a description of the code.
It is the code. Use a named intermediate value or a narrower type before you use
a comment.

## Do not explain code that lives in another file

A comment in `src/main.ts` that describes how a renderer component paints
cannot stay true. Nobody who edits that component sees the comment. It is also
feature documentation in the wrong place: the story splits across many files,
and nobody can read it.

Put it in a doc in [`docs/`](./) and keep it coarse. Document the model, not
the mechanism. If a sentence breaks when someone renames a function or changes
a constant, the sentence does not belong there.

## Where the reasoning goes

| Reasoning                                         | Place                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| How a subsystem works                             | a flow or topic doc in `docs/`, such as [`supported-versions-flow.md`](supported-versions-flow.md) |
| Why a fix has its shape, after an incident        | a post-mortem, `docs/postmortem-<topic>.md`                                                 |
| A trap that the next change can hit again         | [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md), or [`AGENTS.md`](../AGENTS.md) for agent instructions |
| Why this change, and what you tried and dropped   | the PR description                                                                          |
| Why _this line_ is odd                            | a comment, on that line                                                                     |

Link to `docs/` or to a public issue, not to Confluence, Jira or Zoho Desk.
This repository is public, and those links are dead ends for contributors
outside the company. From code, link by a path relative to the file. That path
resolves on GitHub and in the editor.

## Do not commit

- narration: `// Now we need to...`
- history: `// Changed from X to Y`. Git keeps the history.
- analysis: alternatives weighed, edge cases listed, "verified that..."
- the same explanation at four call sites. Put it on the function that they
  call.
- commented-out code
- `*_SUMMARY.md` or `*_ANALYSIS.md` files that describe how you made a change

## Tests

These rules are for production code. In a test, the assertion already says
_what_. A comment that says why the case is worth having earns its place, and
the length limit below does not apply to it.

## Length

Six lines is a lot for a comment. If you need more, the reader needs a doc, or
the code needs to be split.
