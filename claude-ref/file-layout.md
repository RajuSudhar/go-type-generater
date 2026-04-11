---
ref: file-layout
load_when: changing grouping strategies, output file organization, or categorization
---

# File Organization

Controlled via `-g, --grouping` · impl: `go-generator.ts:369` (`organizeTypesIntoFiles`)

| Strategy | Behavior |
|---|---|
| `category` (default) | `models.go` · `enums.go` · `requests.go` (name has "Request") · `responses.go` (name has "Response") |
| `single` | All types → `types.go` |
| `custom` | Placeholder; currently same as category |

## Always Emitted
- Type files (per strategy)
- `go.mod` (uses `--package-name`)
- `main.go` (export declarations)

## Templates (`src/templates/go-templates.ts`)
- "DO NOT EDIT" header + timestamp
- Imports auto-sorted
- Enum const naming: `TypeNameValue`
- Preserves OpenAPI `description` as comments

## Adding a Strategy
1. Extend `GeneratorOptions.grouping` union
2. New case in `organizeTypesIntoFiles()`
3. Update `categorizeType()` if needed
