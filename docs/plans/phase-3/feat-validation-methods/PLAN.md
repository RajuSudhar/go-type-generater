---
name: feat-validation-methods
description: Generate Validate(), String(), and constructor methods for emitted Go types
phase: 3
status: planned
owner: tbd
---

# Goal
Finish the half-wired flags that promise `Validate()`, `String()`, and `New<Type>()` on generated types. Drive `Validate()` off OpenAPI constraints (min/max/pattern/enum/required).

# Triggers
- CLI flags: `--generate-validators`, `--generate-stringers`, `--generate-constructors`

# Inputs
- Existing stub flags in `src/cli.ts`
- Constraint data already collected in `go-types.ts:264`
- Templates in `src/templates/go-templates.ts`

# Steps
1. Wire flags through `GeneratorOptions`
2. Emit `Validate() error` per struct using collected constraints (no external validator dep)
3. Emit `String() string` for enum types and select structs
4. Emit `NewX(...) (X, error)` constructors for required-field structs
5. Golden tests per flag combination

# Outputs / Acceptance
- [ ] Each flag toggles emission independently
- [ ] Generated code compiles with zero external deps beyond stdlib
- [ ] `Validate()` covers: required, min/max, pattern, enum
- [ ] Docs updated in `docs/API.md`

# Refs
- `claude-ref/type-mappings.md`
- `claude-ref/limitations.md`
- `docs/API.md`

# Risks / Unknowns
- Whether to use `go-playground/validator` tags vs hand-rolled — current impl leans hand-rolled
- `String()` on non-enum structs may conflict with user expectations
