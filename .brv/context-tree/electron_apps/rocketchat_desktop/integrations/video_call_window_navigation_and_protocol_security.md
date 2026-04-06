---
title: Video Call Window Navigation and Protocol Security
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:45:28.666Z'
updatedAt: '2026-04-04T18:45:28.666Z'
---
## Raw Concept
**Task:**
Document URL validation, protocol handling, and navigation security

**Changes:**
- Allowed protocols: http, https, file, data, about
- Blocked protocols: SMB
- Google URLs opened externally

**Flow:**
will-navigate event -> validate URL -> check protocol -> detect close pages -> check isProtocolAllowed -> open externally or proceed

**Timestamp:** 2026-04-04

## Narrative
### Structure
Navigation security implemented via will-navigate handler (logs all attempts, detects close.html/close2.html, checks protocols) and setWindowOpenHandler (denies SMB, opens HTTP/HTTPS externally, allows others).

### Dependencies
Requires isProtocolAllowed() function for protocol validation.

### Highlights
Google shortened URLs (*.g.co) always open externally. Close page navigation (close.html/close2.html) handled gracefully. All navigation attempts logged for debugging.

### Rules
Rule 1: Allowed protocols: http:, https:, file:, data:, about:
Rule 2: SMB protocol blocked (preventDefault)
Rule 3: Google URLs (*.g.co) open externally
Rule 4: HTTP/HTTPS new windows open externally
