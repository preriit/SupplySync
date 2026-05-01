# Product Workflow (Lightweight)

This is the operating workflow to avoid losing context while still shipping fast.

## Weekly Cadence
1. **Set weekly goal** linked to one measurable outcome.
2. **Pick 1-2 high-impact slices** from roadmap/idea backlog.
3. **Implement and ship** to pilot users quickly.
4. **Review metrics + feedback** at week end.
5. **Decide keep/iterate/drop** and update docs.

## Required Docs to Keep Updated
- `docs/vision.md`
- `docs/roadmap.md`
- `docs/idea-backlog.md`
- `docs/decisions/` (for major decisions)
- `docs/features/` (for feature-level specs)

## Documentation Rules
- Keep entries short and decision-focused.
- Update docs in the same PR as code changes when behavior changes.
- If a decision changes, add a new ADR that supersedes the previous one.

## Definition of Ready (before building)
- Problem and user are clear.
- Success metric is defined.
- Scope is bounded.
- Rollout and rollback are considered.

## Definition of Done (before merging)
- Acceptance criteria satisfied.
- Minimal tests added for business-critical paths.
- Telemetry or logs added for validation.
- Related docs updated.

## Revision Log
- 2026-04-30: Initial lightweight workflow created.
