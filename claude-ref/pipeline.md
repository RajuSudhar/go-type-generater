---
ref: pipeline
load_when: editing parser/resolver/generator, tracing data flow, debugging end-to-end
---

# Pipeline (3 stages)

1. **Parse** — `src/parser/openapi-parser.ts`
   - YAML/JSON read · validates OpenAPI 3.0/3.1 · delegates $ref to resolver
2. **Resolve** — `src/resolver/reference-resolver.ts`
   - Recursive $ref (internal `#/components/...` + external `./x.yaml#/Y`)
   - Cache by abs path · `resolving` Set for cycles · max depth 10
   - External paths resolved relative to base doc dir
3. **Generate** — `src/generator/go-generator.ts`
   - Schema → Go types · organizes files · writes output

## Entry Points
- Programmatic: `src/index.ts`
- CLI: `src/cli.ts` → `bin/go-type-gen.js`
- Package main: `dist/index.js`

## Deps
`commander` · `js-yaml` · `openapi-types` · `chalk`
