---
name: feat-discriminated-unions
description: Convert OpenAPI oneOf/anyOf with discriminator into proper Go sum-type representations
phase: 2
status: planned
owner: tbd
---

# Goal
Replace the `interface{}` fallback for `oneOf`/`anyOf` with a Go idiom that preserves type identity — interface + implementing structs, with custom `UnmarshalJSON` driven by `discriminator.propertyName`.

# Triggers
- Spec declares `oneOf` or `anyOf` (with or without `discriminator`)

# Inputs
- `openapi-types` discriminator support
- `src/generator/go-generator.ts` `convertSchemaToGoType()`
- `src/templates/go-templates.ts` for new union template

# Steps
1. Detect `oneOf`/`anyOf` in `convertSchemaToGoType()` (`go-generator.ts:135`)
2. If `discriminator.propertyName` present:
   - Emit marker interface `IsX()`
   - Each variant implements it
   - Generate `UnmarshalJSON` on a wrapper that switches on discriminator
3. Without discriminator: emit tagged wrapper struct with exclusive fields + custom Marshal/Unmarshal
4. New template in `go-templates.ts`
5. Fixture + golden test

# Outputs / Acceptance
- [ ] Discriminated `oneOf` emits interface + structs + switching unmarshal
- [ ] Non-discriminated `oneOf` round-trips via wrapper
- [ ] `anyOf` handled (subset of `oneOf` logic)
- [ ] Generated code compiles; round-trip test passes

# Refs
- `claude-ref/type-mappings.md`
- `claude-ref/limitations.md`
- `docs/DECODER_DESIGN.md`

# Risks / Unknowns
- `discriminator.mapping` (explicit ref overrides)
- Nested `oneOf` / `oneOf` inside `allOf`
