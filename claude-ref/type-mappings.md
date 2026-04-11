---
ref: type-mappings
load_when: adding/changing OpenAPI→Go type conversion, working in utils/go-types.ts
---

# OpenAPI → Go

Source: `src/utils/go-types.ts`

| OpenAPI | Go |
|---|---|
| object | `struct{}` + fields |
| enum | type alias + `const` block |
| allOf | struct w/ embedded types |
| oneOf / anyOf | `interface{}` (basic) |
| string `date`/`date-time` | `time.Time` |
| string `uuid` | `string` |
| string `byte`/`binary` | `[]byte` |
| integer +min/max | inferred int size (uint8, int32, …) |

## Name Conversion
- `toGoTypeName`: PascalCase (`user_profile` → `UserProfile`)
- `toGoFieldName`: PascalCase + Go-keyword guard (appends `Field`)
- Guarded keywords: `type`, `interface`, `map`, …

## Struct Tags (`go-types.ts:264`)
- `json:"name,omitempty"` — omitempty only for non-required
- `validate:"min=X,max=Y"` — from min/max
- `validate:"regexp=..."` — from pattern

## Extending
New OpenAPI type:
1. `mapOpenAPITypeToGo()` in `go-types.ts`
2. Template in `src/templates/go-templates.ts` (if needed)
3. Convert logic in `go-generator.ts`

New keyword (discriminator, xml, …):
1. Verify `openapi-types` support
2. Handle in `convertSchemaToGoType()` `go-generator.ts:135`
3. Decide Go representation
