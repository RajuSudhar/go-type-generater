#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { resolve, basename } from 'path';
import { existsSync } from 'fs';
import { OpenAPIParser } from './parser/openapi-parser';
import { GoGenerator } from './generator/go-generator';
import { version } from '../package.json';

const program = new Command();

interface CliOptions {
  packageName?: string;
  grouping: 'category' | 'single' | 'custom';
  verbose: boolean;
  format: 'yaml' | 'json' | 'auto';
  version: '3.0' | '3.1' | 'auto';
  generateDecoders: boolean;
  generateValidation: boolean;
}

program
  .name('go-type-gen')
  .description('Generate Go types from OpenAPI 3.0/3.1 specifications')
  .version(version)
  .argument('<input>', 'OpenAPI specification file (YAML or JSON)')
  .argument('<output>', 'Output directory for generated Go files')
  .option('-p, --package-name <name>', 'Go package name (default: derived from output directory)')
  .option('-g, --grouping <type>', 'File grouping strategy', 'category')
  .option('-v, --verbose', 'Enable verbose logging', false)
  .option('-f, --format <type>', 'Input format', 'auto')
  .option('--version <version>', 'OpenAPI version', 'auto')
  .option('--generate-decoders', 'Generate decoder/parser functions (default: true)', true)
  .option('--no-generate-decoders', 'Skip decoder/parser generation')
  .option('--generate-validation', 'Add OpenAPI constraint validation to decoders (default: false)', false)
  .action(async (input: string, output: string, options: CliOptions) => {
    try {
      await generateTypes(input, output, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

async function generateTypes(input: string, output: string, options: CliOptions): Promise<void> {
  // Validate input file
  const inputPath = resolve(input);
  if (!existsSync(inputPath)) {
    throw new Error(`Input file not found: ${input}`);
  }

  // Prepare output directory
  const outputPath = resolve(output);
  const packageName = options.packageName || basename(outputPath);

  if (options.verbose) {
    console.log(chalk.blue('Configuration:'));
    console.log(chalk.gray(`  Input: ${inputPath}`));
    console.log(chalk.gray(`  Output: ${outputPath}`));
    console.log(chalk.gray(`  Package: ${packageName}`));
    console.log(chalk.gray(`  Grouping: ${options.grouping}`));
    console.log('');
  }

  // Parse OpenAPI specification
  console.log(chalk.yellow('📖 Parsing OpenAPI specification...'));
  const parser = new OpenAPIParser({
    verbose: options.verbose,
    format: options.format,
    version: options.version
  });
  
  const spec = await parser.parse(inputPath);
  
  if (options.verbose) {
    console.log(chalk.green(`✓ Parsed OpenAPI ${spec.openapi} specification`));
    console.log(chalk.gray(`  Schemas found: ${Object.keys(spec.components?.schemas || {}).length}`));
  }

  // Generate Go types
  console.log(chalk.yellow('🔧 Generating Go types...'));
  const generator = new GoGenerator({
    packageName,
    grouping: options.grouping,
    verbose: options.verbose,
    generateDecoders: options.generateDecoders,
    generateValidation: options.generateValidation
  });

  const result = await generator.generate(spec, outputPath);

  console.log(chalk.green('✅ Generation complete!'));
  console.log(chalk.gray(`  Files generated: ${result.filesGenerated}`));
  console.log(chalk.gray(`  Types generated: ${result.typesGenerated}`));
  
  if (options.verbose) {
    result.files.forEach(file => {
      console.log(chalk.gray(`    - ${file}`));
    });
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});

if (require.main === module) {
  program.parse();
}

export { program };
