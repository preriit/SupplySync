# Behavior Contract System

This folder defines how SupplySync tracks feature behavior over time, including new behavior rollout and old behavior deprecation/obsolescence.

Use this system for every new idea or feature.

## Goals

- Keep product behavior explicit and testable.
- Avoid hidden behavior drift between UI, API, and business logic.
- Maintain a clear history of what is active, deprecated, or obsolete.
- Make release and handover reviews faster.

## Folder structure

- `docs/templates/BEHAVIOR_CONTRACT_TEMPLATE.md`
  - template for creating new contracts
- `docs/contracts/INDEX.md`
  - master registry of all behavior contracts
- `docs/contracts/*.md`
  - one contract file per feature behavior set

## Status model

Each behavior item must have one status:

- `active`: currently supported and expected
- `deprecated`: still supported, but scheduled for replacement/removal
- `obsolete`: no longer valid; kept only for historical traceability
- `draft`: proposed but not approved for implementation

## Required metadata per behavior

Each behavior entry should include:

- `Behavior ID` (stable key, example `INV-HIST-001`)
- `Status`
- `Introduced in` (release, date, or commit)
- `Deprecated in` (optional)
- `Obsolete in` (optional)
- `Replaced by` (optional Behavior ID)
- `Owner` (team/person accountable)

## Recommended lifecycle

1. Create contract entry in `draft`.
2. Review and approve acceptance criteria.
3. Implement behavior and tests.
4. Mark behavior `active`.
5. When superseded, mark old one `deprecated` with replacement ID.
6. After rollout window, mark old one `obsolete`.

## Change workflow (for every feature)

1. Start from the template and create/extend a contract file.
2. Add/update rows in `docs/contracts/INDEX.md`.
3. Link contract IDs in PR description.
4. Ensure acceptance criteria are verifiable.
5. Merge code + contract together (same PR preferred).

## Obsolescence rules

- Do not hard-delete old behavior records from contracts.
- Move retired behavior to `obsolete` and retain:
  - reason
  - replacement ID
  - effective date/version
- If no replacement exists, state `Replaced by: N/A`.

## Ownership and upkeep

- Product/engineering owner updates behavior intent and status.
- Implementer updates technical contract details and API shape.
- Reviewer ensures acceptance criteria match implementation/tests.

## Quick start

1. Copy `docs/templates/BEHAVIOR_CONTRACT_TEMPLATE.md`.
2. Name file with domain and feature, for example:
   - `docs/contracts/INV-HIST_normalized-ledger.md`
3. Add behavior IDs and fill metadata.
4. Register it in `docs/contracts/INDEX.md`.

