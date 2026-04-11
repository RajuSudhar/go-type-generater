# TRACK

Live status of features across phases. Source of truth for "what's done / what's next".

## Legend
[x] done   [~] in-progress   [ ] todo   [!] blocked

## Phase 1 — Core OpenAPI → Go

### feat-yaml-type-gen → docs/plans/phase-1/feat-yaml-type-gen/PLAN.md

- [x] Parse OpenAPI 3.0/3.1 YAML via js-yaml with version validation
- [x] Resolve internal `$ref` (`#/components/schemas/...`)
- [x] Resolve external file `$ref` (relative paths)
- [x] Cache document reads by absolute path (no duplicate loads)
- [x] Emit `models.go`, `enums.go`, `requests.go`, `responses.go` under category grouping
- [x] Emit `types.go` under single grouping
- [x] Generate `go.mod` and `main.go` with proper exports
- [x] Generate JSON tags with `omitempty` for non-required fields
- [x] Type mapping: string → string, int → inferred (uint8/int8/int16/int32/int64 per min/max), float64, bool, time.Time for date/date-time
- [x] Enum generation with const blocks
- [x] Struct with field comments from OpenAPI descriptions
- [x] allOf support (embedded struct merging)
- [x] CLI flags wired: `-p`, `-g`, `-f`, `--version`, `-v`
- [x] Circular `$ref` detection with `_circular` marker stub (prevents stack overflow)
- [ ] Generated output compiles with `go build` (manually verified for examples, not automated)
- [x] Integration test asserting round-trip for each example fixture (115 tests across 5 suites)
- [x] Clear error on circular reference (returns `{ $ref, _circular: true }` stub)

### feat-ref-resolver → docs/plans/phase-1/feat-ref-resolver/PLAN.md

- [x] Internal reference resolution with path navigation
- [x] External file reference loading and resolution
- [x] Document caching by absolute path
- [x] Resolving Set to detect in-progress resolution chains
- [x] Max depth check (default 10, configurable)
- [x] Relative path resolution from base document directory
- [x] Cycle detection with `_circular` marker on stub (consumers can detect; `CircularReferenceError` class available)
- [x] Depth exceed produces `MaxDepthExceededError` (custom error class in `src/errors.ts`)
- [x] Unit tests covering error paths (115 tests in `tests/` — resolver, parser, generator, utils, templates)

## Phase 2 — Type Fidelity

### feat-discriminated-unions → docs/plans/phase-2/feat-discriminated-unions/PLAN.md

- [ ] Detect `oneOf`/`anyOf` in `convertSchemaToGoType()`
- [ ] Emit interface + implementing structs for discriminated unions
- [ ] Generate `UnmarshalJSON` switching on discriminator.propertyName
- [ ] Handle non-discriminated `oneOf` with wrapper struct
- [ ] Handle `anyOf` (subset logic)
- [ ] New template in `go-templates.ts` for union types
- [ ] Generated code compiles; round-trip test passes
- **Note**: Currently `oneOf`/`anyOf` → `interface{}` (placeholder)

### feat-configurable-mappings → docs/plans/phase-2/feat-configurable-mappings/PLAN.md

- [ ] Define config schema and loader (`src/config/`)
- [ ] Thread config through `GeneratorOptions`
- [ ] Consult user map in `mapOpenAPITypeToGo()` before defaults
- [ ] Auto-emit required imports for mapped types
- [ ] Validate config at load with friendly errors
- [ ] Docs: extend `docs/API.md` with mapping table
- **Note**: No `-c, --config` flag in CLI yet

## Phase 3 — Ergonomics

### feat-validation-methods → docs/plans/phase-3/feat-validation-methods/PLAN.md

- [ ] Wire `--generate-validators`, `--generate-stringers`, `--generate-constructors` flags
- [ ] Emit `Validate() error` per struct using min/max/pattern/enum/required constraints
- [ ] Emit `String() string` for enum types and select structs
- [ ] Emit `NewX(...) (X, error)` constructors for required-field structs
- [ ] Golden tests per flag combination
- [ ] Docs update in `docs/API.md`
- **Note**: Flags exist in CLI (e.g., `generateValidation` for decoders) but not full method generation

## Decoder/Parser Generation

- [x] `--generate-decoders` flag wired (default: true)
- [x] Enum decoder generation with switch statements
- [x] Struct decoder generation with field-by-field type assertions
- [x] `parse<TypeName>()` function naming
- [x] Error handling with `fmt.Errorf` for missing/type mismatches
- [x] Required field validation in decoders
- [~] Optional `--generate-validation` flag for go-playground/validator tags (flag exists; integration partial)
- [ ] Struct decoder validation logic (conditional code path exists but untested)

## Cross-cutting / Unassigned

- [x] **Test suite** — 115 tests across 5 suites (utils, resolver, parser, generator, templates)
- [ ] **CI integration tests** — examples compile manually, not in CI pipeline
- [ ] **Swagger 2.0 support** — explicitly not planned (rejected in parser)
- [ ] **URL-based `$ref`** (http/https) — deferred, not implemented
- [ ] **oneOf/anyOf without discriminator** — currently generate `interface{}`, needs wrapper pattern
- [x] **Error types** — `CircularReferenceError`, `MaxDepthExceededError`, `UnresolvedReferenceError`, `ParseError` in `src/errors.ts`; wired into resolver
- [ ] **Refs in non-schema parts** — only `components/schemas` extracted; no request/response body schema extraction
- [ ] **Field name collision with Go keywords** — toGoFieldName appends "Field" suffix (e.g., `type` → `typeField`) but untested
- [ ] **Validation with go-playground/validator** — import wired in templates but no actual validation integration test

## Next Up (ordered)

1. ~~**Write test suite**~~ — Done: 115 tests across 5 suites
2. ~~**Finish error types**~~ — Done: 4 custom error classes in `src/errors.ts`
3. **Implement discriminated unions** — Replace `interface{}` fallback for oneOf/anyOf with proper sum-type pattern
4. **Add CI integration tests** — Golden tests comparing generated output to expected .go files; run `go build` in CI
5. **Configurable type mappings** — Add `-c, --config` flag and type mapping overrides
6. **Validation methods** — Wire constructor, validator, and stringer generation flags
