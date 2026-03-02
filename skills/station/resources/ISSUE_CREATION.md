# Issue Creation Guide

Create a Station issue when the work item is:
- Larger than one short burst
- Likely to need notes later
- Connected to other tasks by blockers or context

## Good issues

- Specific outcome
- Clear acceptance notes
- Correct priority and dependency edges

Example:

```bash
station create \
  --title "Add token refresh endpoint" \
  --description "Implement refresh token grant flow" \
  --acceptance "Refresh endpoint rotates token and updates tests" \
  --priority 1
```

## Bad issues

- "Do coding stuff"
- Vague scope with no acceptance
- Copying a whole sprint into one giant ticket

Break large work into parent + `child` dependencies.
