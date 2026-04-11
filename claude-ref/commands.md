# Commands

Build/test/lint/format commands and CLI reference for go-type-generater.

## Dev

| Command | Action |
|---|---|
| `pnpm build` | TS → `dist/` |
| `pnpm dev <in> <out>` | Run via ts-node (no build) |
| `pnpm test` | Jest (115 tests) |
| `pnpm lint` | ESLint `src/**/*.ts` |
| `pnpm format` | Prettier `src/**/*.ts` |

## CLI

```
node bin/go-type-gen.js <input> <output> [opts]
```

| Flag | Type | Default | Purpose |
|---|---|---|---|
| `-p, --package-name` | string | dir basename | Go package name |
| `-g, --grouping` | `category\|single\|custom` | `category` | File layout strategy |
| `-v, --verbose` | bool | `false` | Verbose logs |
| `-f, --format` | `yaml\|json\|auto` | `auto` | Input format override |
| `--version` | `3.0\|3.1\|auto` | `auto` | OpenAPI version pin |
| `--generate-decoders` | bool | `true` | Emit `parse<Type>()` decoders |
| `--generate-validation` | bool | `false` | Emit validator tags + init |

## TS Config

ES2020 · CommonJS · strict · `outDir: dist/` · `rootDir: src/` · excludes `**/*.test.ts`
