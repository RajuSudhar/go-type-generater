import { readFileSync } from 'fs';
import { extname } from 'path';
import * as yaml from 'js-yaml';
import { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import { ReferenceResolver } from '../resolver/reference-resolver';

export interface ParseOptions {
  verbose?: boolean;
  format?: 'yaml' | 'json' | 'auto';
  version?: '3.0' | '3.1' | 'auto';
}

export type OpenAPIDocument = OpenAPIV3.Document | OpenAPIV3_1.Document;

export class OpenAPIParser {
  private options: Required<ParseOptions>;
  private resolver: ReferenceResolver;

  constructor(options: ParseOptions = {}) {
    this.options = {
      verbose: options.verbose || false,
      format: options.format || 'auto',
      version: options.version || 'auto'
    };
    this.resolver = new ReferenceResolver({ verbose: this.options.verbose });
  }

  async parse(filePath: string): Promise<OpenAPIDocument> {
    // Read file content
    const content = readFileSync(filePath, 'utf8');
    
    // Determine format
    const format = this.detectFormat(filePath, content);
    
    if (this.options.verbose) {
      console.log(`Detected format: ${format}`);
    }

    // Parse content
    let document: any;
    try {
      if (format === 'yaml') {
        document = yaml.load(content) as any;
      } else {
        document = JSON.parse(content);
      }
    } catch (error) {
      throw new Error(`Failed to parse ${format.toUpperCase()} file: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Validate OpenAPI version
    this.validateOpenAPIVersion(document);

    // Resolve references
    const resolvedDocument = await this.resolver.resolve(document, filePath);

    return resolvedDocument as OpenAPIDocument;
  }

  private detectFormat(filePath: string, content: string): 'yaml' | 'json' {
    if (this.options.format !== 'auto') {
      return this.options.format;
    }

    // First try by file extension
    const ext = extname(filePath).toLowerCase();
    if (ext === '.yaml' || ext === '.yml') {
      return 'yaml';
    }
    if (ext === '.json') {
      return 'json';
    }

    // Try to detect by content
    const trimmedContent = content.trim();
    if (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
      return 'json';
    }

    // Default to YAML if ambiguous
    return 'yaml';
  }

  private validateOpenAPIVersion(document: any): void {
    if (!document || typeof document !== 'object') {
      throw new Error('Invalid document: not an object');
    }

    const openapi = document.openapi;
    const swagger = document.swagger;

    if (openapi) {
      // OpenAPI 3.x
      if (!openapi.startsWith('3.')) {
        throw new Error(`Unsupported OpenAPI version: ${openapi}. Only OpenAPI 3.x is supported.`);
      }

      if (this.options.version !== 'auto') {
        const expectedMajorMinor = this.options.version;
        if (!openapi.startsWith(expectedMajorMinor)) {
          throw new Error(`Expected OpenAPI ${expectedMajorMinor} but found ${openapi}`);
        }
      }
    } else if (swagger) {
      // Swagger 2.0 is not supported
      throw new Error('Swagger 2.0 is not supported. Please use OpenAPI 3.0 or 3.1.');
    } else {
      throw new Error('Invalid document: missing openapi or swagger field');
    }

    // Validate required fields
    if (!document.info) {
      throw new Error('Invalid document: missing info field');
    }

    if (!document.info.title) {
      throw new Error('Invalid document: missing info.title field');
    }

    if (!document.info.version) {
      throw new Error('Invalid document: missing info.version field');
    }
  }

  /**
   * Extract schemas from components section
   */
  extractSchemas(document: OpenAPIDocument): Record<string, OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject> {
    if ('components' in document && document.components?.schemas) {
      return document.components.schemas as Record<string, OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject>;
    }
    return {};
  }

  /**
   * Check if document is OpenAPI 3.1
   */
  isOpenAPI31(document: OpenAPIDocument): document is OpenAPIV3_1.Document {
    return document.openapi.startsWith('3.1');
  }
}
