# Start Session Command

Start a new development session with full context loading.

## Process

1. Read `docs/CURRENT_STATUS.md`
2. Read `docs/decisions/_index.md` (only the index, not individual ADRs)
3. Run: `gh issue list --label "in-progress" --limit 5`
4. Run: `gh pr list --state open --limit 5`

## Summary Format

Provide a brief summary:
- Current work in progress
- Open issues assigned or in progress
- Open PRs awaiting review
- Suggested focus for this session based on priorities in CURRENT_STATUS.md

Keep the summary under 20 lines. Do NOT read source code files.

## Usage

```
/session:start
```

OR use the simpler version (docs only, no GitHub CLI):
```
/project:status
```

## Example Output

```
📋 Session Start - 2026-03-03

## Current Work
- No active work — ready to pick up next priority

## Open Issues (in-progress)
- (none)

## Open PRs
- (none)

## Recent Decisions
- ADR-001: Initial Architecture (2026-03-02)

## Suggested Focus
1. Wire up routing API to replace hardcoded distanceKm
2. Add .env file and connect api.js to real backend
3. Integrate Stripe Elements for payment
```

## Notes

- This command integrates with GitHub CLI (requires `gh` installed)
- Does NOT read source code files
- Provides context overview only, not implementation details
- Run this at the start of EVERY work session

## See Also

- `/project:status` - Simpler version without GitHub CLI integration
- `/decision:new` - Document new architectural decision
