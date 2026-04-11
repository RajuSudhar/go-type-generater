---
name: feat-yaml-type-gen
description: Generate idiomatic Go types from a .yaml OpenAPI 3.0/3.1 spec end-to-end
phase: 1
status: in-progress
owner: sudhar
---

# Goal
Read a `.yaml` OpenAPI 3.x document, resolve $refs (internal + external), emit Go structs/enums/aliases with JSON tags and validation annotations, grouped into files per the selected strategy.

# Triggers
- User runs `pnpm dev <spec.yaml> <out>` or `node bin/go-type-gen.js <spec.yaml> <out>`
- `-f yaml` or `-f auto` with a `.yaml`/`.yml` path

# Inputs
- OpenAPI 3.0/3.1 spec (`.yaml`/`.yml`), optionally with sibling files for external `$ref`s
- CLI flags: `-p`, `-g`, `--version`, `-f`, `-v`
- Fixtures in `examples/`

# Steps
1. Parse — `src/parser/openapi-parser.ts`
   - `js-yaml` load → validate `openapi` field is `3.0.x` or `3.1.x`
2. Resolve — `src/resolver/reference-resolver.ts`
   - Walk schema; dereference `$ref` (internal + external file refs relative to base doc)
   - Cache by absolute path; cycle-detect via `resolving` Set; cap depth (default 10)
3. Generate — `src/generator/go-generator.ts`
   - `convertSchemaToGoType()` per schema → Go AST shape
   - `organizeTypesIntoFiles()` per `--grouping`
   - Render via `src/templates/go-templates.ts`; sort imports; emit `go.mod`, `main.go`
4. Validate output compiles: `cd out && go build ./...` (manual for now; automate in testing feat)

# Outputs / Acceptance
- [x] Reads `examples/simple-api.yaml` without error
- [x] Emits `models.go` / `enums.go` / `requests.go` / `responses.go` under `category` grouping
- [x] `single` grouping emits `types.go`
- [x] Internal `$ref` resolves
- [x] External file `$ref` resolves
- [ ] Generated output compiles with `go build` across all bundled examples
- [ ] Integration test asserts round-trip for each example fixture
- [ ] Circular `$ref` produces clear error, not stack overflow

# Refs
- `claude-ref/pipeline.md`
- `claude-ref/type-mappings.md`
- `claude-ref/file-layout.md`
- `docs/ARCHITECTURE.md`
- `src/parser/openapi-parser.ts`, `src/resolver/reference-resolver.ts`, `src/generator/go-generator.ts`, `src/utils/go-types.ts`, `src/templates/go-templates.ts`

# Risks / Unknowns
- `oneOf`/`anyOf` currently collapse to `interface{}` — see `phase-2/feat-discriminated-unions`
- Integer size inference heuristic may over/under-size on edge constraints
- External `$ref` over URL (not file) is out of scope for phase 1
