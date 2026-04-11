# Development Guide

This guide will help you set up your development environment and understand the development workflow for Go Type Generator.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 16.0.0 or higher
  ```bash
  node --version  # Should be >= 16.0.0
  ```

- **pnpm**: Package manager (version 10.21.0 or compatible)
  ```bash
  npm install -g pnpm
  pnpm --version
  ```

- **Git**: For version control
  ```bash
  git --version
  ```

- **Go** (optional): For testing generated code
  ```bash
  go version  # Recommended: 1.20 or higher
  ```

## Initial Setup

### 1. Clone the Repository

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/go-type-generator.git
cd go-type-generator

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/go-type-generator.git
```

### 2. Install Dependencies

```bash
# Install all dependencies
pnpm install
```

This will install:
- TypeScript and build tools
- CLI dependencies (commander, js-yaml, chalk)
- Development tools (eslint, prettier, jest)
- Type definitions

### 3. Build the Project

```bash
# Build TypeScript to JavaScript
npm run build
```

This compiles TypeScript files from `src/` to JavaScript in `dist/`.

### 4. Link for Local Development

To use the CLI globally from your development environment:

```bash
# Create global symlink
npm link

# Now you can use the CLI anywhere
go-type-gen --help
```

After linking, the CLI will automatically use your latest built code. When you make changes:

```bash
# Rebuild
npm run build

# The linked CLI will now use the new code
go-type-gen <your-test-file>
```

To unlink when done developing:

```bash
npm unlink -g go-type-generator
```

## Development Workflow

### Running in Development Mode

For quick testing without building:

```bash
# Run directly with ts-node
npm run dev examples/simple-api.yaml examples/output --verbose
```

This uses `ts-node` to run TypeScript directly without compilation.

### Building

```bash
# Build once
npm run build

# Watch mode (rebuilds on changes)
npm run build -- --watch
```

### Testing the CLI

#### Using npm link (Recommended)

```bash
# After npm link
go-type-gen examples/simple-api.yaml examples/output --verbose
go-type-gen examples/simple-api.yaml examples/output --generate-validation
```

#### Using npm run dev

```bash
# Direct TypeScript execution
npm run dev examples/simple-api.yaml examples/output --verbose
npm run dev examples/simple-api.yaml examples/output --generate-decoders --generate-validation
```

#### Using Node directly

```bash
# After building
node bin/go-type-gen.js examples/simple-api.yaml examples/output --verbose
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- parser.test.ts
```

### Linting

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint -- --fix
```

### Code Formatting

```bash
# Format all TypeScript files
npm run format

# Check formatting without making changes
npm run format -- --check
```

## Project Structure

Understanding the codebase organization:

```
go-type-generator/
├── src/                      # Source TypeScript files
│   ├── cli.ts               # CLI entry point and argument parsing
│   ├── index.ts             # Main library exports
│   ├── parser/              # OpenAPI parsing logic
│   │   ├── OpenAPIParser.ts # Main parser class
│   │   └── validator.ts     # Spec validation
│   ├── generator/           # Go code generation
│   │   ├── GoGenerator.ts   # Main generator orchestrator
│   │   ├── TypeConverter.ts # OpenAPI to Go type mapping
│   │   ├── DecoderGenerator.ts # Decoder function generation
│   │   └── FileOrganizer.ts # File grouping strategies
│   ├── templates/           # Code generation templates
│   │   ├── struct.ts        # Struct type templates
│   │   ├── enum.ts          # Enum type templates
│   │   └── decoder.ts       # Decoder function templates
│   ├── resolver/            # Reference resolution
│   │   └── ReferenceResolver.ts # $ref resolution logic
│   └── utils/               # Utility functions
│       ├── naming.ts        # Name conversion (camelCase, PascalCase)
│       ├── logger.ts        # Logging utilities
│       └── fileUtils.ts     # File system operations
├── bin/                     # CLI executable
│   └── go-type-gen.js       # Node.js shebang wrapper
├── dist/                    # Compiled JavaScript (gitignored)
├── examples/                # Example OpenAPI specs
│   ├── simple-api.yaml      # Basic example
│   └── output*/             # Generated output (gitignored)
├── tests/                   # Test files
│   ├── parser.test.ts       # Parser tests
│   ├── generator.test.ts    # Generator tests
│   └── integration.test.ts  # End-to-end tests
├── docs/                    # Documentation
│   ├── CONTRIBUTING.md      # Contribution guidelines
│   ├── ARCHITECTURE.md      # Architecture documentation
│   ├── DECODER_DESIGN.md    # Decoder implementation details
│   └── API.md               # Programmatic API reference
├── package.json             # Project metadata and dependencies
├── tsconfig.json            # TypeScript configuration
├── .eslintrc.js            # ESLint configuration
└── README.md                # User documentation
```

### Key Files Explained

- **src/cli.ts**: Entry point for the command-line tool. Handles argument parsing with Commander.js and orchestrates the generation process.

- **src/index.ts**: Main library entry point. Exports classes and types for programmatic usage.

- **src/parser/OpenAPIParser.ts**: Parses YAML/JSON OpenAPI specs, validates them, and creates an internal representation.

- **src/generator/GoGenerator.ts**: Main generation orchestrator. Coordinates type conversion, file organization, and code output.

- **src/generator/TypeConverter.ts**: Converts OpenAPI types to Go types. Handles type mapping, constraints, and validation tags.

- **src/generator/DecoderGenerator.ts**: Generates runtime decoder/parser functions for type-safe unmarshaling.

- **src/resolver/ReferenceResolver.ts**: Resolves `$ref` references in OpenAPI specs, including cross-file references.

## Testing

### Writing Tests

Tests are located in the `tests/` directory and use Jest.

```typescript
// Example test structure
import { GoGenerator } from '../src/generator/GoGenerator';

describe('GoGenerator', () => {
  let generator: GoGenerator;

  beforeEach(() => {
    generator = new GoGenerator({
      packageName: 'testpkg',
      generateDecoders: true,
    });
  });

  describe('decoder generation', () => {
    it('should generate decoder for struct types', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };

      const result = generator.generateType('User', schema);

      expect(result).toContain('func parseUser');
      expect(result).toContain('interface{}');
    });
  });
});
```

### Test Categories

1. **Unit Tests**: Test individual functions/classes in isolation
   - `parser.test.ts` - OpenAPI parsing logic
   - `typeConverter.test.ts` - Type mapping
   - `decoderGenerator.test.ts` - Decoder generation

2. **Integration Tests**: Test complete workflows
   - `integration.test.ts` - End-to-end generation
   - `cli.test.ts` - CLI argument parsing and execution

3. **Snapshot Tests**: Verify generated code doesn't change unexpectedly
   ```typescript
   it('should generate expected code', () => {
     const result = generator.generate(schema);
     expect(result).toMatchSnapshot();
   });
   ```

## Debugging

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CLI",
      "runtimeArgs": ["-r", "ts-node/register"],
      "args": [
        "${workspaceFolder}/src/cli.ts",
        "examples/simple-api.yaml",
        "examples/output",
        "--verbose"
      ],
      "cwd": "${workspaceFolder}",
      "protocol": "inspector"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Console Logging

For quick debugging:

```typescript
// In your code
console.log('Schema:', JSON.stringify(schema, null, 2));
console.log('Generated type:', goType);

// Run with verbose flag
go-type-gen input.yaml output --verbose
```

### Debugging Generated Go Code

To verify generated code compiles:

```bash
# Generate code
go-type-gen examples/simple-api.yaml examples/output

# Navigate to output
cd examples/output

# Check for Go syntax errors
go build .

# Run Go tests if you've added them
go test .
```

## Common Development Tasks

### Adding a New Feature

1. **Create a branch**
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Write tests first** (TDD approach)
   ```typescript
   // tests/myfeature.test.ts
   it('should do something new', () => {
     // Test implementation
   });
   ```

3. **Implement the feature**
   ```typescript
   // src/generator/MyFeature.ts
   export class MyFeature {
     // Implementation
   }
   ```

4. **Update documentation**
   - Update README.md
   - Add JSDoc comments
   - Update relevant docs/ files

5. **Test manually**
   ```bash
   npm run build
   go-type-gen examples/simple-api.yaml examples/output
   ```

6. **Run tests and linting**
   ```bash
   npm test
   npm run lint
   npm run format
   ```

### Fixing a Bug

1. **Write a failing test** that reproduces the bug
2. **Fix the bug** until the test passes
3. **Verify** with manual testing
4. **Update** documentation if needed

### Adding CLI Options

1. **Update src/cli.ts**:
   ```typescript
   program
     .option('--my-option', 'Description of my option', false);
   ```

2. **Update GeneratorOptions interface**:
   ```typescript
   export interface GeneratorOptions {
     myOption?: boolean;
   }
   ```

3. **Update README.md** CLI Options table

4. **Add tests** for the new option

## Common Issues

### Build Errors

**Issue**: TypeScript compilation errors

**Solution**:
```bash
# Clean and rebuild
rm -rf dist/
npm run build
```

### npm link Not Working

**Issue**: Changes not reflected after npm link

**Solution**:
```bash
# Rebuild after changes
npm run build

# Or unlink and relink
npm unlink -g go-type-generator
npm link
```

### Tests Failing

**Issue**: Tests fail after making changes

**Solution**:
```bash
# Update snapshots if needed
npm test -- -u

# Clear Jest cache
npm test -- --clearCache
```

### Import Errors

**Issue**: Cannot find module errors

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## Performance Optimization

### Profiling

To identify performance bottlenecks:

```typescript
// Add timing logs
console.time('parser');
const document = await parser.parse(input);
console.timeEnd('parser');

console.time('generation');
const result = await generator.generate(document, output);
console.timeEnd('generation');
```

### Large Spec Files

For testing with large OpenAPI specs:

```bash
# Use verbose mode to see progress
go-type-gen large-spec.yaml output --verbose

# Time the execution
time go-type-gen large-spec.yaml output
```

## Release Process

See the maintainer documentation for the full release process. As a contributor:

1. **Version bumps** are handled by maintainers
2. **CHANGELOG.md** is updated during releases
3. **Your PR** should focus on the feature/fix, not version numbers

## Getting Help

If you're stuck:

1. **Check this guide** and [ARCHITECTURE.md](./ARCHITECTURE.md)
2. **Search existing issues** for similar problems
3. **Ask in your PR** if it's related to your contribution
4. **Open a discussion** for general questions

## Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system design
- Check [DECODER_DESIGN.md](./DECODER_DESIGN.md) for decoder implementation details
- See [API.md](./API.md) for programmatic usage
- Review [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines

Happy coding! 🚀
