---
ref: commands
load_when: running build/test/lint/format, using CLI
---

# Commands

## Dev
- `pnpm build` → TS → `dist/`
- `pnpm dev <in> <out>` → run via ts-node
- `pnpm test` · `pnpm lint` · `pnpm format`

## CLI
`node bin/go-type-gen.js <input> <output> [opts]`

| Flag | Values | Purpose |
|---|---|---|
| `-p, --package-name` | string | Go package |
| `-g, --grouping` | `category`\|`single`\|`custom` | File layout |
| `-v, --verbose` | — | Verbose logs |
| `-f, --format` | `yaml`\|`json`\|`auto` | Input fmt |
| `--version` | `3.0`\|`3.1`\|`auto` | OpenAPI ver |

## TS Config
ES2020 · CommonJS · strict · out `dist/` · src `src/` (excl `**/*.test.ts`)
