# Contributing to Go Type Generator

Thank you for your interest in contributing to Go Type Generator! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors. We expect:

- **Respectful communication** - Be considerate and professional in all interactions
- **Constructive feedback** - Provide helpful, actionable feedback
- **Collaborative attitude** - Work together to improve the project
- **Inclusive behavior** - Welcome contributors of all backgrounds and skill levels

## How to Contribute

### Reporting Bugs

Before creating a bug report:

1. **Check existing issues** - Search to see if the bug has already been reported
2. **Verify the bug** - Make sure it's reproducible with the latest version
3. **Gather information** - Collect relevant details about your environment

When creating a bug report, include:

- **Clear title** - Descriptive summary of the issue
- **Reproduction steps** - Minimal steps to reproduce the bug
- **Expected behavior** - What you expected to happen
- **Actual behavior** - What actually happened
- **Environment details**:
  - Node.js version
  - npm/pnpm version
  - Operating system
  - go-type-generator version
- **Sample OpenAPI spec** - If applicable, a minimal OpenAPI spec that reproduces the issue
- **Generated output** - The incorrect Go code that was generated

### Suggesting Features

We welcome feature suggestions! When proposing a new feature:

1. **Check existing feature requests** - Avoid duplicates
2. **Describe the use case** - Explain the problem you're trying to solve
3. **Provide examples** - Show how the feature would be used
4. **Consider alternatives** - Mention other approaches you've considered

Feature requests should include:

- **Clear title** - Concise description of the feature
- **Motivation** - Why this feature would be valuable
- **Proposed solution** - How you envision it working
- **Example usage** - Code examples showing the feature in action
- **Alternatives considered** - Other approaches you've thought about

### Submitting Pull Requests

We love pull requests! To submit a PR:

1. **Fork the repository** - Create your own fork
2. **Create a branch** - Use a descriptive branch name
   ```bash
   git checkout -b feature/add-custom-type-mapping
   git checkout -b fix/enum-parser-bug
   ```
3. **Make your changes** - Follow the coding standards below
4. **Test your changes** - Ensure all tests pass
5. **Commit your changes** - Use clear commit messages
6. **Push to your fork** - Push your branch
7. **Open a pull request** - Provide a detailed description

#### Pull Request Guidelines

Your PR should:

- **Focus on one thing** - Address a single bug or feature
- **Include tests** - Add tests for new functionality
- **Update documentation** - Update README.md and relevant docs
- **Pass all checks** - Ensure linting and tests pass
- **Have a clear description** - Explain what and why

#### PR Description Template

```markdown
## Description
Brief description of the changes

## Motivation
Why is this change needed?

## Changes
- List of specific changes made
- Another change

## Testing
How was this tested?

## Screenshots (if applicable)
Before/after comparisons for UI changes

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Linting passes
- [ ] All tests pass
```

## Coding Standards

### TypeScript Style

We follow these TypeScript conventions:

- **Use TypeScript strict mode** - All code should be type-safe
- **Prefer interfaces over types** - For object shapes
- **Use descriptive names** - Clear, self-documenting variable/function names
- **Avoid `any`** - Use proper types or `unknown` with type guards
- **Export types** - Make reusable types available

#### Naming Conventions

- **Classes**: PascalCase - `OpenAPIParser`, `GoGenerator`
- **Interfaces**: PascalCase - `GeneratorOptions`, `ParsedSchema`
- **Functions**: camelCase - `parseSchema`, `generateGoType`
- **Variables**: camelCase - `schemaName`, `outputPath`
- **Constants**: UPPER_SNAKE_CASE - `DEFAULT_PACKAGE_NAME`
- **Private members**: prefix with `_` - `_internalHelper`

#### Code Style

```typescript
// Good
interface GeneratorOptions {
  packageName: string;
  generateDecoders?: boolean;
}

class GoGenerator {
  private _options: GeneratorOptions;

  constructor(options: GeneratorOptions) {
    this._options = options;
  }

  public generate(document: OpenAPIDocument): GenerationResult {
    // Implementation
  }
}

// Avoid
class generator {  // Should be PascalCase
  public generate(doc: any) {  // Avoid 'any'
    var result = {};  // Use 'const' or 'let', not 'var'
    return result;
  }
}
```

### Code Organization

- **One class per file** - Keep files focused
- **Group related functionality** - Use directories to organize
- **Separate concerns** - Parser, generator, and utilities should be distinct
- **Use barrel exports** - Export from `index.ts` for clean imports

### Comments and Documentation

- **Document public APIs** - All exported functions/classes need JSDoc
- **Explain why, not what** - Code should be self-explanatory; comments explain reasoning
- **Update docs with code** - Keep documentation in sync

```typescript
/**
 * Generates Go type definitions from an OpenAPI document.
 *
 * @param document - Parsed OpenAPI specification
 * @param outputPath - Directory path for generated files
 * @returns Generation result with statistics
 *
 * @example
 * ```typescript
 * const generator = new GoGenerator({ packageName: 'myapi' });
 * const result = await generator.generate(document, './output');
 * console.log(`Generated ${result.typesGenerated} types`);
 * ```
 */
public async generate(
  document: OpenAPIDocument,
  outputPath: string
): Promise<GenerationResult> {
  // Implementation
}
```

### Testing Requirements

All contributions should include appropriate tests:

- **Unit tests** - For individual functions/classes
- **Integration tests** - For end-to-end workflows
- **Test coverage** - Aim for >80% coverage on new code
- **Test naming** - Descriptive test names explaining what's being tested

```typescript
describe('GoGenerator', () => {
  describe('generate', () => {
    it('should generate decoder functions when enabled', async () => {
      // Test implementation
    });

    it('should skip decoders when disabled', async () => {
      // Test implementation
    });

    it('should throw error for invalid OpenAPI spec', async () => {
      // Test implementation
    });
  });
});
```

### Commit Message Format

Use clear, descriptive commit messages following this format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

#### Examples

```
feat(decoder): add support for nested object parsing

Implements recursive parsing for nested objects in decoder functions.
This allows proper type safety for deeply nested JSON structures.

Closes #123
```

```
fix(enum): handle numeric enum values correctly

Previously, numeric enums would fail type assertion. Now correctly
handles both string and numeric enum values from JSON.

Fixes #456
```

```
docs(readme): add decoder usage examples

Added comprehensive examples showing how to use generated decoder
functions with JSON unmarshaling and error handling.
```

## Development Workflow

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed development setup and workflow instructions.

Quick start:

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/go-type-generator.git
cd go-type-generator

# Install dependencies
pnpm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Format
npm run format
```

## Getting Help

If you need help:

- **Check documentation** - Start with [DEVELOPMENT.md](./DEVELOPMENT.md)
- **Search issues** - Someone may have had the same question
- **Ask questions** - Open an issue with the "question" label
- **Join discussions** - Participate in GitHub Discussions (if available)

## Recognition

Contributors will be recognized in:

- **CHANGELOG.md** - Credited for their contributions
- **GitHub contributors** - Listed automatically by GitHub
- **Release notes** - Mentioned in relevant releases

Thank you for contributing to Go Type Generator! Your efforts help make this tool better for everyone.
