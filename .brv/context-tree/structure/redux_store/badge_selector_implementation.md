---
title: Badge Selector Implementation
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:25:38.644Z'
updatedAt: '2026-04-04T18:25:38.644Z'
---
## Raw Concept
**Task:**
Document memoized badge selector implementations using reselect

**Changes:**
- Implemented selectGlobalBadge using createSelector for memoization
- Created selectGlobalBadgeText for display formatting
- Created selectGlobalBadgeCount for numeric badge aggregation

**Files:**
- src/ui/selectors.ts

**Flow:**
servers state -> selectGlobalBadge memoized selector -> aggregates all badges -> returns count | "•" | undefined -> selectGlobalBadgeText formats for display

**Timestamp:** 2026-04-04

## Narrative
### Structure
selectGlobalBadge uses createSelector to memoize across servers array. Input selector extracts servers from RootState, then result selector aggregates badges. selectGlobalBadgeText derives from selectGlobalBadge to format output. selectGlobalBadgeCount derives to provide numeric value. Type system uses Selector<T> and RootSelector<T> generic types.

### Dependencies
Depends on reselect createSelector for memoization. Imports Server type from servers/common and RootState from store/rootReducer. Uses Number.isInteger() for type guard.

### Highlights
selectGlobalBadge aggregates mention count across all servers by filtering numeric badges and reducing to sum. Returns "•" indicator if any server has unread but no numeric count. selectGlobalBadgeText converts badge to displayable string: "•" stays as-is, numeric becomes string, undefined becomes empty string. selectGlobalBadgeCount provides numeric fallback (0 if no badge).

### Rules
Rule 1: selectGlobalBadge must use createSelector for memoization performance
Rule 2: Badge aggregation filters numeric badges with Number.isInteger() type guard
Rule 3: Mention count is sum of all numeric badges across servers
Rule 4: Dot indicator ("•") shows when any server has unread but no numeric count
Rule 5: selectGlobalBadgeText always returns string (empty string if no badge)

### Examples
selectGlobalBadge([{badge: 5}, {badge: 3}, {badge: undefined}]) returns 8
selectGlobalBadge([{badge: undefined}, {badge: "•"}, {badge: undefined}]) returns "•"
selectGlobalBadgeText(8) returns "8"
selectGlobalBadgeCount("•") returns 0
