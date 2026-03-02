# Resumability Guide

Compaction kills chat memory. Station notes survive.

Write notes for your future self with no context:
- What was completed
- Why key decisions were made
- What is currently blocked
- Exact next action

Example:

```bash
station update station-18 --notes "
COMPLETED: Added retry logic for webhook delivery.
DECISION: Exponential backoff (1s, 2s, 4s) with max 3 retries.
BLOCKER: Need product confirmation on duplicate-event policy.
NEXT: Implement idempotency key check once policy is confirmed.
"
```

If notes are lazy, the next session pays the price.
