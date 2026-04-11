# Type Mappings

OpenAPI → Go type conversion rules. Source: `src/utils/go-types.ts`.

## Core Mapping Table

| OpenAPI | Go | Import |
|---|---|---|
| `string` | `string` | — |
| `string` format=`date\|date-time` | `time.Time` | `time` |
| `string` format=`byte\|binary` | `[]byte` | — |
| `string` format=`uuid` | `string` | — |
| `number` | `float64` | — |
| `number` format=`float` | `float32` | — |
| `integer` | `int` | — |
| `integer` format=`int32` | `int32` | — |
| `integer` format=`int64` | `int64` | — |
| `integer` min=0 max≤255 | `uint8` | — |
| `integer` min=0 max≤65535 | `uint16` | — |
| `integer` min≥-128 max≤127 | `int8` | — |
| `boolean` | `bool` | — |
| `object` | `struct{}` | — |
| `object` additionalProperties=true | `map[string]interface{}` | — |
| `object` additionalProperties={schema} | `map[string]T` | — |
| `array` items=T | `[]T` | — |
| `enum` (string values) | `string` + `const` block | — |
| `enum` (int values) | `int` + `const` block | — |
| `allOf` | struct w/ embedded types | — |
| `oneOf\|anyOf` | `interface{}` ⚠ | — |

⚠ `oneOf`/`anyOf` → `interface{}` is Phase 2 gap. See `docs/plans/phase-2/feat-discriminated-unions/PLAN.md`.

## Name Conversion

| Function | Rule | Example |
|---|---|---|
| `toGoTypeName(s)` | PascalCase, strip invalid chars, split on `-_` | `user_profile` → `UserProfile` |
| `toGoFieldName(s)` | PascalCase + append `Field` if Go keyword | `type` → `TypeField` |
| `toParserFunctionName(s)` | `parse` + PascalCase | `User` → `parseUser` |

Go keywords guarded: `break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var`

## Struct Tags

Generated at `go-types.ts:286`:

| Tag | Condition |
|---|---|
| `json:"name"` | always (required field) |
| `json:"name,omitempty"` | optional field |
| `validate:"min=N"` | schema has `minimum\|minLength` |
| `validate:"max=N"` | schema has `maximum\|maxLength` |
| `validate:"regexp=P"` | schema has `pattern` |

## Extending

New OpenAPI type:
1. Add case in `mapOpenAPITypeToGo()` → `src/utils/go-types.ts`
2. Add template in `src/templates/go-templates.ts` if new Go shape needed
3. Add conversion in `convertSchemaToGoType()` → `src/generator/go-generator.ts`
4. Add test in `tests/utils/go-types.test.ts`

New OpenAPI keyword (discriminator, xml, …):
1. Verify `openapi-types` package supports it
2. Handle in `convertSchemaToGoType()` at `go-generator.ts:141`
3. Decide Go representation, add template
