# Branch Management

## Naming Convention

### Format
```
<type>/<description>
<type>/<TICKET-ID>-<description>
```

### Valid Types

| Type | Purpose | Example |
|---|---|---|
| `feature` | New features | `feature/add-discriminated-unions` |
| `fix` | Bug fixes | `fix/circular-ref-stack-overflow` |
| `docs` | Documentation | `docs/rewrite-instruction-set-llm-aligned` |
| `test` | Test additions | `test/add-integration-golden-tests` |
| `chore` | Maintenance | `chore/update-dependencies` |
| `refactor` | Restructuring | `refactor/extract-decoder-module` |
| `release` | Release prep | `release/v1.0.0` |
| `hotfix` | Urgent prod fix | `hotfix/security-patch` |

### Rejected Aliases

| Rejected | Use Instead |
|---|---|
| `feat` | `feature` |
| `bugfix` | `fix` |
| `perf` | `refactor` or `feature` |

### Rules

- kebab-case descriptions only
- Minimum 3 words when no ticket ID (no `fix/update` or `feature/change`)
- Vague terms (`fix`, `update`, `change`) rejected without context

### Protected Branches

`main`, `master`, `develop` — bypass validation.

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

- **type**: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `ci`, `style`
- **scope**: optional, e.g. `parser`, `resolver`, `generator`, `cli`
- **subject**: imperative, lowercase, no period
- **body**: mandatory — explain *what* and *why*, not *how*
- **footer**: `Co-Authored-By`, `Closes #N`, `BREAKING CHANGE:` as needed

## Examples

```
feature/add-discriminated-unions     → feat(generator): add oneOf/anyOf discriminated union support
fix/circular-ref-stack-overflow      → fix(resolver): prevent stack overflow on circular $ref chains
docs/rewrite-instruction-set        → docs(claude-ref): rewrite instruction set for llm token efficiency
test/add-integration-golden-tests   → test(generator): add golden file comparison tests
```
