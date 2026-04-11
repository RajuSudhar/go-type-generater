---
name: feat-configurable-mappings
description: User-supplied overrides for OpenAPI→Go type mappings via config file
phase: 2
status: planned
owner: tbd
---

# Goal
Allow users to override/extend the built-in type mapping table without patching `go-types.ts` — e.g. map `string(format=uuid)` → `github.com/google/uuid.UUID`.

# Triggers
- `-c, --config <path>` CLI flag
- `typeMappings` key in config

# Inputs
- Config schema (JSON/YAML)
- `src/utils/go-types.ts` `mapOpenAPITypeToGo()`
- `src/templates/go-templates.ts` import emission

# Steps
1. Define config schema + loader (`src/config/`)
2. Thread config through `GeneratorOptions`
3. In `mapOpenAPITypeToGo()`, consult user map before defaults
4. Emit required imports when a mapped type declares one
5. Validate config at load; friendly errors

# Outputs / Acceptance
- [ ] Config overrides built-in mappings
- [ ] Imports auto-added for mapped types
- [ ] Invalid config → clear error
- [ ] Docs: `docs/API.md` mapping table extension

# Refs
- `claude-ref/type-mappings.md`
- `claude-ref/commands.md`

# Risks / Unknowns
- Conflict resolution if multiple matchers apply
- Scope of match keys (format-only vs type+format vs schema name)
