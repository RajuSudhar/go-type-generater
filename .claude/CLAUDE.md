# CLAUDE.md

## Interaction Rules (MUST)
- Concise. Token-efficient. No filler, no recaps, no "here's what I did".
- No granular explanation unless asked.
- No design/pattern/concept lectures unless asked.
- No preamble/postamble.
- Edits → show diff/result, not walkthrough.
- "Why"/"explain" → then go deep.

## Task Router — READ THE MATCHING REF BEFORE ACTING

| Task signal | Load |
|---|---|
| build/test/lint/CLI flags/TS config | `claude-ref/commands.md` |
| parser / resolver / generator / data flow / $ref | `claude-ref/pipeline.md` + `docs/ARCHITECTURE.md` |
| OpenAPI→Go mapping, struct tags, naming, new keyword | `claude-ref/type-mappings.md` |
| grouping, output files, templates | `claude-ref/file-layout.md` |
| feasibility, gap analysis, "can we…" | `claude-ref/limitations.md` |
| public API surface | `docs/API.md` |
| dev workflow | `docs/DEVELOPMENT.md` |
| decoder internals | `docs/DECODER_DESIGN.md` |
| contribution rules | `docs/CONTRIBUTING.md` |
| project summary / quick start | `README.md` |
| planning a feature / phase work | `docs/plans/phase-*/feat-*/` + `TRACK.md` |
| status / what's done / what's next | `TRACK.md` |

Rule: **read the ref, do not duplicate its content in the response.**

## Summary
TypeScript CLI: OpenAPI 3.0/3.1 → idiomatic Go types. Pipeline: parse → resolve $refs → generate.

## Phases
- Phase 1 — Core OpenAPI→Go (parse/resolve/generate, YAML+JSON input, category/single grouping)
- Phase 2 — Type fidelity (discriminated unions for oneOf/anyOf, richer validation, configurable mappings)
- Phase 3 — Ergonomics (constructors, String(), Validate(), custom grouping, Swagger 2.0?)

Per-feature plans: `docs/plans/phase-<n>/feat-<slug>/PLAN.md` (skill-format).
