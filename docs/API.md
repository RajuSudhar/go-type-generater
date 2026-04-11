# API Reference

This document provides comprehensive API documentation for using Go Type Generator programmatically in your Node.js/TypeScript applications.

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Core Classes](#core-classes)
4. [Type Definitions](#type-definitions)
5. [Advanced Usage](#advanced-usage)
6. [Error Handling](#error-handling)
7. [Examples](#examples)

## Installation

```bash
npm install go-type-generator
```

## Quick Start

### Basic Programmatic Usage

```typescript
import { OpenAPIParser, GoGenerator } from 'go-type-generator';

async function generateTypes() {
  // Parse OpenAPI specification
  const parser = new OpenAPIParser({ verbose: true });
  const document = await parser.parse('./openapi.yaml');

  // Generate Go types
  const generator = new GoGenerator({
    packageName: 'myapi',
    grouping: 'category',
    generateDecoders: true,
    verbose: true,
  });

  const result = await generator.generate(document, './output');

  console.log(`Generated ${result.typesGenerated} types in ${result.filesGenerated} files`);
}

generateTypes().catch(console.error);
```

## Core Classes

### OpenAPIParser

Parses and validates OpenAPI 3.0/3.1 specifications.

#### Constructor

```typescript
class OpenAPIParser {
  constructor(options?: ParseOptions);
}
```

**Parameters:**

- `options` (optional): Configuration options

**ParseOptions Interface:**

```typescript
interface ParseOptions {
  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;

  /**
   * Input format detection
   * @default 'auto'
   */
  format?: 'yaml' | 'json' | 'auto';

  /**
   * OpenAPI version
   * @default 'auto'
   */
  version?: '3.0' | '3.1' | 'auto';
}
```

#### Methods

##### parse()

Parses an OpenAPI specification file.

```typescript
async parse(filePath: string): Promise<OpenAPIDocument>
```

**Parameters:**

- `filePath`: Absolute or relative path to the OpenAPI file (YAML or JSON)

**Returns:**

- Promise resolving to an `OpenAPIDocument`

**Throws:**

- `ParseError`: If the file cannot be read or parsed
- `ValidationError`: If the OpenAPI specification is invalid

**Example:**

```typescript
const parser = new OpenAPIParser({ verbose: true });

try {
  const document = await parser.parse('./api/openapi.yaml');
  console.log('Successfully parsed:', document.info.title);
} catch (error) {
  if (error instanceof ParseError) {
    console.error('Parse failed:', error.message);
  }
}
```

### GoGenerator

Generates Go type definitions from OpenAPI documents.

#### Constructor

```typescript
class GoGenerator {
  constructor(options?: GeneratorOptions);
}
```

**Parameters:**

- `options` (optional): Generation configuration

**GeneratorOptions Interface:**

```typescript
interface GeneratorOptions {
  /**
   * Go package name for generated code
   * @default Derived from output directory name
   */
  packageName?: string;

  /**
   * File organization strategy
   * @default 'category'
   */
  grouping?: 'category' | 'single' | 'custom';

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;

  /**
   * Generate runtime decoder functions
   * @default true
   */
  generateDecoders?: boolean;

  /**
   * Enable go-playground/validator validation in decoders
   * @default false
   */
  generateValidation?: boolean;

  /**
   * Custom file organization function
   * Only used when grouping is 'custom'
   */
  customGrouping?: (typeName: string, typeCategory: TypeCategory) => string;
}
```

**TypeCategory Enum:**

```typescript
enum TypeCategory {
  Model = 'model',
  Enum = 'enum',
  Request = 'request',
  Response = 'response',
  Error = 'error',
}
```

#### Methods

##### generate()

Generates Go code from an OpenAPI document.

```typescript
async generate(
  document: OpenAPIDocument,
  outputPath: string
): Promise<GenerationResult>
```

**Parameters:**

- `document`: Parsed OpenAPI document (from `OpenAPIParser`)
- `outputPath`: Directory path for generated Go files

**Returns:**

Promise resolving to a `GenerationResult`

**GenerationResult Interface:**

```typescript
interface GenerationResult {
  /**
   * Number of types generated
   */
  typesGenerated: number;

  /**
   * Number of files created
   */
  filesGenerated: number;

  /**
   * List of generated file paths
   */
  files: string[];

  /**
   * Generation statistics by category
   */
  stats: {
    models: number;
    enums: number;
    requests: number;
    responses: number;
    errors: number;
  };

  /**
   * Whether decoders were generated
   */
  decodersGenerated: boolean;

  /**
   * Whether validation was enabled
   */
  validationEnabled: boolean;
}
```

**Example:**

```typescript
const generator = new GoGenerator({
  packageName: 'myapi',
  generateDecoders: true,
  generateValidation: true,
});

const result = await generator.generate(document, './output');

console.log(`Generated ${result.typesGenerated} types:`);
console.log(`  - ${result.stats.models} models`);
console.log(`  - ${result.stats.enums} enums`);
console.log(`  - ${result.stats.requests} requests`);
console.log(`  - ${result.stats.responses} responses`);
```

### ReferenceResolver

Resolves `$ref` references in OpenAPI documents.

> **Note**: This class is used internally by `OpenAPIParser` and typically doesn't need to be used directly.

#### Constructor

```typescript
class ReferenceResolver {
  constructor(baseDocument: OpenAPIDocument, basePath?: string);
}
```

#### Methods

##### resolve()

Resolves a `$ref` reference.

```typescript
resolve(ref: string): Schema
```

**Parameters:**

- `ref`: Reference string (e.g., `#/components/schemas/User` or `./user.yaml#/User`)

**Returns:**

Resolved schema object

**Throws:**

- `ReferenceError`: If the reference cannot be resolved

**Example:**

```typescript
const resolver = new ReferenceResolver(document, './api');
const userSchema = resolver.resolve('#/components/schemas/User');
```

## Type Definitions

### OpenAPIDocument

```typescript
interface OpenAPIDocument {
  openapi: '3.0.0' | '3.0.1' | '3.0.2' | '3.0.3' | '3.1.0';
  info: Info;
  servers?: Server[];
  paths?: Paths;
  components?: Components;
  security?: SecurityRequirement[];
  tags?: Tag[];
  externalDocs?: ExternalDocumentation;
}
```

### Schema

```typescript
interface Schema {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  format?: string;
  description?: string;
  enum?: (string | number)[];
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  allOf?: Schema[];
  oneOf?: Schema[];
  anyOf?: Schema[];
  $ref?: string;

  // Validation constraints
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
}
```

### ParseError

```typescript
class ParseError extends Error {
  constructor(message: string, public filePath?: string);
}
```

### ValidationError

```typescript
class ValidationError extends Error {
  constructor(
    message: string,
    public details?: ValidationDetail[]
  );
}

interface ValidationDetail {
  path: string;
  message: string;
}
```

### ReferenceError

```typescript
class ReferenceError extends Error {
  constructor(message: string, public ref: string);
}
```

## Advanced Usage

### Custom File Organization

Implement custom file grouping logic:

```typescript
const generator = new GoGenerator({
  packageName: 'myapi',
  grouping: 'custom',
  customGrouping: (typeName, category) => {
    // Group by domain
    if (typeName.startsWith('User') || typeName.startsWith('Account')) {
      return 'auth.go';
    }
    if (typeName.startsWith('Product') || typeName.startsWith('Order')) {
      return 'commerce.go';
    }
    return 'common.go';
  },
});
```

### Batch Processing Multiple Specs

Process multiple OpenAPI specifications:

```typescript
import { OpenAPIParser, GoGenerator } from 'go-type-generator';
import { promises as fs } from 'fs';
import path from 'path';

async function batchGenerate(specDir: string, outputDir: string) {
  const parser = new OpenAPIParser({ verbose: true });
  const generator = new GoGenerator({
    generateDecoders: true,
    generateValidation: true,
  });

  // Find all OpenAPI files
  const files = await fs.readdir(specDir);
  const specFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.json'));

  const results = [];

  for (const file of specFiles) {
    const specPath = path.join(specDir, file);
    const outputPath = path.join(outputDir, path.parse(file).name);

    console.log(`Processing ${file}...`);

    try {
      // Parse spec
      const document = await parser.parse(specPath);

      // Generate types
      const result = await generator.generate(document, outputPath);

      results.push({
        spec: file,
        success: true,
        result,
      });

      console.log(`  ✓ Generated ${result.typesGenerated} types`);
    } catch (error) {
      results.push({
        spec: file,
        success: false,
        error: error.message,
      });

      console.error(`  ✗ Failed: ${error.message}`);
    }
  }

  return results;
}

// Usage
batchGenerate('./specs', './generated')
  .then(results => {
    const successful = results.filter(r => r.success).length;
    console.log(`\nCompleted: ${successful}/${results.length} successful`);
  });
```

### Programmatic Decoder Configuration

Control decoder generation programmatically:

```typescript
import { GoGenerator } from 'go-type-generator';

async function generateWithConditionalDecoders(
  document: OpenAPIDocument,
  outputPath: string,
  enableValidation: boolean
) {
  const generator = new GoGenerator({
    packageName: 'api',
    generateDecoders: true,
    generateValidation: enableValidation,
  });

  const result = await generator.generate(document, outputPath);

  if (result.decodersGenerated) {
    console.log('✓ Decoders generated');

    if (result.validationEnabled) {
      console.log('✓ Validation enabled - remember to:');
      console.log('  go get github.com/go-playground/validator/v10');
    }
  }

  return result;
}
```

### Error Recovery and Logging

Implement robust error handling:

```typescript
import { OpenAPIParser, GoGenerator, ParseError, ValidationError } from 'go-type-generator';

async function generateWithRecovery(inputPath: string, outputPath: string) {
  const logger = {
    info: (msg: string) => console.log(`[INFO] ${msg}`),
    warn: (msg: string) => console.warn(`[WARN] ${msg}`),
    error: (msg: string) => console.error(`[ERROR] ${msg}`),
  };

  try {
    logger.info(`Parsing ${inputPath}...`);
    const parser = new OpenAPIParser({ verbose: false });
    const document = await parser.parse(inputPath);
    logger.info(`Parsed successfully: ${document.info.title}`);

    logger.info('Generating Go types...');
    const generator = new GoGenerator({
      packageName: 'api',
      grouping: 'category',
      generateDecoders: true,
      verbose: false,
    });

    const result = await generator.generate(document, outputPath);

    logger.info(`✓ Generation complete:`);
    logger.info(`  - ${result.typesGenerated} types generated`);
    logger.info(`  - ${result.filesGenerated} files created`);

    return { success: true, result };

  } catch (error) {
    if (error instanceof ParseError) {
      logger.error(`Parse error in ${error.filePath}: ${error.message}`);
      return { success: false, error: 'parse_error', details: error.message };
    }

    if (error instanceof ValidationError) {
      logger.error('OpenAPI validation failed:');
      error.details?.forEach(detail => {
        logger.error(`  - ${detail.path}: ${detail.message}`);
      });
      return { success: false, error: 'validation_error', details: error.details };
    }

    logger.error(`Unexpected error: ${error.message}`);
    return { success: false, error: 'unknown_error', details: error.message };
  }
}

// Usage
generateWithRecovery('./openapi.yaml', './output')
  .then(result => {
    if (result.success) {
      console.log('Generation successful!');
    } else {
      console.log(`Generation failed: ${result.error}`);
      process.exit(1);
    }
  });
```

### Integration with Build Tools

Integrate with build systems:

```typescript
// build-script.ts
import { OpenAPIParser, GoGenerator } from 'go-type-generator';
import { watch } from 'chokidar';

async function buildTypes(specPath: string, outputPath: string) {
  console.log('Building Go types...');

  const parser = new OpenAPIParser();
  const document = await parser.parse(specPath);

  const generator = new GoGenerator({
    packageName: 'api',
    generateDecoders: true,
    generateValidation: true,
  });

  await generator.generate(document, outputPath);
  console.log('✓ Build complete');
}

// Watch mode
function watchMode(specPath: string, outputPath: string) {
  console.log(`Watching ${specPath} for changes...`);

  watch(specPath).on('change', async () => {
    console.log('OpenAPI spec changed, rebuilding...');
    try {
      await buildTypes(specPath, outputPath);
    } catch (error) {
      console.error('Build failed:', error.message);
    }
  });
}

// Usage
const specPath = process.argv[2] || './openapi.yaml';
const outputPath = process.argv[3] || './generated';
const watch = process.argv.includes('--watch');

if (watch) {
  watchMode(specPath, outputPath);
} else {
  buildTypes(specPath, outputPath).catch(console.error);
}
```

## Error Handling

### Error Types

The library throws specific error types for different failure scenarios:

```typescript
import {
  ParseError,
  ValidationError,
  ReferenceError,
  GenerationError
} from 'go-type-generator';

try {
  const document = await parser.parse(specPath);
  const result = await generator.generate(document, outputPath);
} catch (error) {
  if (error instanceof ParseError) {
    // Handle YAML/JSON parsing errors
    console.error('Failed to parse file:', error.filePath);
  } else if (error instanceof ValidationError) {
    // Handle OpenAPI validation errors
    console.error('Invalid OpenAPI spec:');
    error.details?.forEach(d => console.error(`  ${d.path}: ${d.message}`));
  } else if (error instanceof ReferenceError) {
    // Handle $ref resolution errors
    console.error('Failed to resolve reference:', error.ref);
  } else if (error instanceof GenerationError) {
    // Handle code generation errors
    console.error('Generation failed:', error.message);
  } else {
    // Handle unexpected errors
    console.error('Unexpected error:', error);
  }
}
```

## Examples

### Example 1: Basic CLI Replacement

Replace CLI usage with programmatic code:

```typescript
// Instead of: go-type-gen openapi.yaml ./output --verbose
import { OpenAPIParser, GoGenerator } from 'go-type-generator';

async function main() {
  const parser = new OpenAPIParser({ verbose: true });
  const document = await parser.parse('./openapi.yaml');

  const generator = new GoGenerator({
    packageName: 'output',
    verbose: true,
  });

  await generator.generate(document, './output');
}

main().catch(console.error);
```

### Example 2: TypeScript Build Integration

Use in a TypeScript build script:

```typescript
// scripts/generate-types.ts
import { OpenAPIParser, GoGenerator } from 'go-type-generator';

export async function generateAPITypes(): Promise<void> {
  const parser = new OpenAPIParser();
  const document = await parser.parse('./api-spec.yaml');

  const generator = new GoGenerator({
    packageName: 'apitypes',
    grouping: 'category',
    generateDecoders: true,
    generateValidation: true,
  });

  const result = await generator.generate(document, './go/apitypes');

  console.log(`Generated ${result.typesGenerated} API types`);
}

// In package.json:
// "scripts": {
//   "generate:types": "ts-node scripts/generate-types.ts"
// }
```

### Example 3: Dynamic Configuration

Generate different outputs based on environment:

```typescript
import { OpenAPIParser, GoGenerator } from 'go-type-generator';

async function generateForEnvironment(env: 'dev' | 'prod') {
  const parser = new OpenAPIParser({
    verbose: env === 'dev',
  });

  const specPath = env === 'dev'
    ? './openapi.dev.yaml'
    : './openapi.prod.yaml';

  const document = await parser.parse(specPath);

  const generator = new GoGenerator({
    packageName: env === 'dev' ? 'devapi' : 'prodapi',
    generateDecoders: true,
    generateValidation: env === 'prod', // Only validate in prod
    verbose: env === 'dev',
  });

  const outputPath = `./generated/${env}`;
  await generator.generate(document, outputPath);

  console.log(`Generated ${env} API types`);
}

// Usage
const env = (process.env.NODE_ENV as 'dev' | 'prod') || 'dev';
generateForEnvironment(env).catch(console.error);
```

## Related Documentation

- [README.md](../README.md) - User guide and CLI documentation
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup and contributing
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DECODER_DESIGN.md](./DECODER_DESIGN.md) - Decoder implementation details
