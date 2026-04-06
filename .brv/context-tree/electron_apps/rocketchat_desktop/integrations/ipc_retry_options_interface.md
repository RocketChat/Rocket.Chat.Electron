---
title: IPC Retry Options Interface
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:18:06.064Z'
updatedAt: '2026-04-04T18:18:06.064Z'
---
## Raw Concept
**Task:**
Define and document IPC retry options for resilient communication

**Changes:**
- maxAttempts: number (default 3) - Maximum number of retry attempts
- retryDelay: number (default 1000) - Delay between retries in milliseconds
- logRetries: boolean (default true) - Whether to log retry attempts
- shouldRetry: (error, attempt) => boolean - Custom retry condition predicate

## Narrative
### Structure
IRetryOptions interface provides configuration for invokeWithRetry(). All properties are optional with sensible defaults. The shouldRetry predicate allows custom logic to determine if a retry should occur based on error type and attempt number.

### Highlights
Flexible retry strategy: combine maxAttempts limit with custom shouldRetry logic for domain-specific retry decisions. Default 1000ms delay is suitable for network operations but can be customized per call.

### Rules
Rule 1: Retries occur on any thrown error. Rule 2: Also retries when result object has success:false property. Rule 3: Stops retrying when maxAttempts reached OR shouldRetry returns false. Rule 4: Logging includes attempt count, retry delay, and final error after all attempts exhausted.
