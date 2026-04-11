---
name: feat-ref-resolver
description: Robust $ref resolution for internal and external OpenAPI references with cycle detection
phase: 1
status: in-progress
owner: sudhar
---

# Goal
Dereference every `$ref` a spec can produce (internal pointers, external file paths, nested) with caching, depth limit, and cycle detection.

# Triggers
- Any spec using `#/components/schemas/...` or `./other.yaml#/...`
- Bug reports mentioning "unresolved ref", "infinite loop", "circular"

# Inputs
- Base document path (for relative resolution)
- `openapi-types` schema types
- Fixtures exercising: nested refs, external files, cycles

# Steps
1. Absolute-path cache for loaded documents
2. `resolving: Set<string>` guard per resolution chain
3. Default `maxDepth = 10`, surfaced via options
4. External file load: resolve `./x.yaml` relative to base doc dir, then re-enter resolver
5. Error shape: `UnresolvedReferenceError`, `CircularReferenceError`, `MaxDepthExceededError`

# Outputs / Acceptance
- [x] Internal `$ref` resolves
- [x] External file `$ref` resolves
- [x] Cache prevents duplicate reads
- [ ] Cycles detected with named error (no stack overflow)
- [ ] Depth exceed produces named error
- [ ] Unit tests covering each error path

# Refs
- `claude-ref/pipeline.md`
- `src/resolver/reference-resolver.ts`

# Risks / Unknowns
- URL-based `$ref` (http/https) — deferred
- Refs into non-schema parts of document (responses, parameters) — scope TBD
