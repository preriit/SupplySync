# Engineering Standards

This document defines baseline coding standards for SupplySync to improve readability, maintainability, and knowledge transfer.

## 1) Naming and Intent

- Use descriptive names that reflect business meaning (`merchantId`, `teamMember`, `isActive`).
- Avoid overloaded names for different concepts in the same flow.
- Prefer consistent naming between frontend payload keys and backend request models.

## 2) Function and Component Size

- Keep functions focused on one responsibility.
- Extract helpers for repeated logic (normalization, error mapping, validation).
- In UI components, prefer small local helpers over repeated inline object spreads.

## 3) Comments

- Write comments for **why** a rule exists, not what obvious code does.
- Add comments for:
  - business rules (for example, identity = mobile number)
  - non-obvious compatibility behavior
  - cross-system constraints (DB schema vs UI behavior)
- Avoid noise comments like "set value in state".

## 4) Validation and Error Handling

- Validate required fields in both frontend and backend.
- Keep backend as source of truth for business constraints.
- Return user-facing backend error messages that are actionable.
- Normalize raw technical errors in frontend before showing them in UI.

## 5) API and Domain Rules

- Keep domain rules centralized in backend helpers.
- Keep route handlers thin: parse request, call helpers, return response.
- If a field is part of identity semantics, document it clearly in code.

## 6) Routing and Titles

- Keep route metadata centralized (path -> title).
- Use a single utility/hook to map route to document title.
- Ensure navigation links always match defined routes.

## 7) Formatting and Consistency

- Follow existing formatter/linter rules.
- Prefer early returns for validation failures.
- Prefer immutable updates and predictable state transitions.

## 8) Change Safety

- Make small, behavior-preserving refactors when improving readability.
- After edits:
  - run lint checks for touched files
  - run syntax checks for backend Python files
- Commit related changes together with clear "why-focused" messages.

