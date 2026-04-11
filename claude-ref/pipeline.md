# Pipeline

3-stage OpenAPI → Go type generation pipeline.

## Stages

```
YAML/JSON input
  │
  ▼
┌─────────────────────────────────────────┐
│ 1. PARSE — src/parser/openapi-parser.ts │
│    js-yaml load · validate 3.0/3.1      │
│    delegate $ref → resolver             │
├─────────────────────────────────────────┤
│ 2. RESOLVE — src/resolver/reference-    │
│    resolver.ts                          │
│    internal #/components/schemas/X      │
│    external ./file.yaml#/path           │
│    cache: Map<absPath, doc>             │
│    cycle: resolving Set → stub          │
│    depth: max 10 (configurable)         │
├─────────────────────────────────────────┤
│ 3. GENERATE — src/generator/            │
│    go-generator.ts                      │
│    schema → GoStruct/GoEnum/GoType      │
│    organize → files per --grouping      │
│    render via src/templates/             │
│    emit go.mod + main.go                │
└─────────────────────────────────────────┘
  │
  ▼
output/ (*.go + go.mod + main.go)
```

## Entry Points

| Entry | File | Purpose |
|---|---|---|
| Programmatic | `src/index.ts` | All public exports |
| CLI | `src/cli.ts` → `bin/go-type-gen.js` | User-facing command |
| Package main | `dist/index.js` | npm consumption |

## Error Types (`src/errors.ts`)

| Error | Thrown When |
|---|---|
| `CircularReferenceError` | `$ref` A→B→A detected |
| `MaxDepthExceededError` | Object traversal > maxDepth |
| `UnresolvedReferenceError` | `$ref` path/file not found |
| `ParseError` | YAML/JSON parse failure |

## Deps

`commander` · `js-yaml` · `openapi-types` · `chalk`
