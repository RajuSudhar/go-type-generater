# Plans

Feature rollout by phase. Each feature lives in `phase-<n>/feat-<slug>/PLAN.md` and follows the **skill definition format** (SKILL.md-style frontmatter + sections).

## Structure

```
docs/plans/
  phase-1/           # Core OpenAPI → Go
    feat-<slug>/PLAN.md
  phase-2/           # Type fidelity
  phase-3/           # Ergonomics
```

## PLAN.md Template (skill-format)

```markdown
---
name: feat-<slug>
description: one-line trigger / what it does
phase: <n>
status: planned | in-progress | done | blocked
owner: <name>
---

# Goal
What the feature delivers. One paragraph.

# Triggers
When this work gets pulled in (user signals, upstream deps).

# Inputs
Code paths, schemas, config, fixtures needed.

# Steps
1. ...
2. ...

# Outputs / Acceptance
- [ ] Verifiable criterion 1
- [ ] Verifiable criterion 2

# Refs
- `claude-ref/<relevant>.md`
- `docs/<relevant>.md`
- source files touched

# Risks / Unknowns
- ...
```

## Index
See `TRACK.md` (repo root) for live done/todo across phases.
