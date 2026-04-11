# go-type-generater — Agent Instructions

TypeScript CLI: OpenAPI 3.0/3.1 → idiomatic Go types. Pipeline: parse → resolve `$ref` → generate.

<constraints>

## Output Rules

- Token-efficient. No filler, recaps, summaries, preamble, postamble.
- Never explain design/patterns/concepts unless explicitly asked.
- Edits → diff/result only. No walkthrough.
- `"why"` / `"explain"` → then go deep.
- Never duplicate ref content in response — read it, apply it, done.

</constraints>

## Task Router

Read the matching ref **before** acting. If multiple match, load all.

| Signal | Load |
|---|---|
| build · test · lint · CLI flags · TS config | `claude-ref/commands.md` |
| parser · resolver · generator · data flow · `$ref` | `claude-ref/pipeline.md` |
| OpenAPI→Go mapping · struct tags · naming · new keyword | `claude-ref/type-mappings.md` |
| grouping · output files · templates | `claude-ref/file-layout.md` |
| feasibility · gap analysis · `"can we…"` | `claude-ref/limitations.md` |
| public API surface | `docs/API.md` |
| dev workflow | `docs/DEVELOPMENT.md` |
| decoder internals | `docs/DECODER_DESIGN.md` |
| contribution rules · commit conventions | `docs/CONTRIBUTING.md` |
| branch naming · git workflow | `docs/BRANCH-MANAGEMENT.md` |
| project summary · quick start | `README.md` |
| planning a feature · phase work | `docs/plans/phase-*/feat-*/PLAN.md` |
| status · done · next | `TRACK.md` |

⚠ **On conflict: plan > ref > convention > preference.**

## Phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Core: parse/resolve/generate, YAML+JSON, category/single grouping | in-progress |
| 2 | Type fidelity: discriminated unions (`oneOf`/`anyOf`), configurable mappings | planned |
| 3 | Ergonomics: constructors, `String()`, `Validate()`, custom grouping | planned |

Plans: `docs/plans/phase-<n>/feat-<slug>/PLAN.md`

## Branch Convention

Format: `<type>/<description>` — see `docs/BRANCH-MANAGEMENT.md`.
Commits: conventional commits, body mandatory. See `docs/BRANCH-MANAGEMENT.md`.
