# Behavior Contract Template

Use this template for every new feature idea or behavior change.

## Contract metadata

- Contract Name:
- Domain:
- Owner:
- Reviewers:
- Created On:
- Last Updated:

## Problem and intent

- Problem statement:
- User/business outcome:
- In scope:
- Out of scope:

## Behavior matrix

| Behavior ID | Scenario | Expected Behavior | Status | Introduced in | Deprecated in | Obsolete in | Replaced by | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EXAMPLE-001 | ... | ... | draft | ... |  |  |  |  |

Allowed status values: `draft`, `active`, `deprecated`, `obsolete`.

## Functional contract

### Inputs

- Actor(s):
- Preconditions:
- Trigger/action:
- Data inputs:

### Outputs

- User-visible output:
- System output:
- Persistence side effects:

### Errors and edge cases

- Validation failures:
- Permission failures:
- Data anomalies:
- Fallback behavior:

## API contract (if applicable)

### Endpoint

- Method:
- Path:
- Auth:

### Request shape

```json
{
  "example": "request"
}
```

### Response shape

```json
{
  "example": "response"
}
```

### Error shape

```json
{
  "detail": "message"
}
```

## UI contract (if applicable)

- Screens/components affected:
- States (loading/empty/error/success):
- Labels/formatting rules:
- Accessibility requirements:

## Data contract (if applicable)

- Tables/models involved:
- New fields:
- Default values:
- Migration notes:

## Permissions contract

- Roles allowed:
- Roles denied:
- Audit/logging expectations:

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Test plan

- Unit tests:
- Integration tests:
- Manual smoke checks:

## Rollout and compatibility

- Rollout strategy:
- Backward compatibility notes:
- Monitoring signals:
- Rollback plan:

## Traceability

- Related PRs:
- Related commits:
- Related docs:
- Related tickets:

