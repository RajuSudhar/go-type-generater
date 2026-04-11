# Limitations

Known gaps and constraints. Check before answering feasibility questions.

## Current Gaps

| Limitation | Impact | Planned Fix |
|---|---|---|
| `oneOf`/`anyOf` → `interface{}` | No type safety for union types | Phase 2: `feat-discriminated-unions` |
| No Swagger 2.0 | Parser rejects `swagger: "2.0"` | Not planned |
| No configurable type mappings | Can't override built-in OpenAPI→Go map | Phase 2: `feat-configurable-mappings` |
| Constructor/Validate/String stubs | CLI flags exist, no generation impl | Phase 3: `feat-validation-methods` |
| No URL-based `$ref` | Only file-relative `$ref` supported | Deferred |
| No path/response schema extraction | Only `components/schemas` processed | Deferred |
| Array decoder incomplete | `// TODO: Parse array elements` in generated code | Phase 1 remaining |
| No CI pipeline | Tests run locally only | Unassigned |
