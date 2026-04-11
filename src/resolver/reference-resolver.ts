import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import * as yaml from 'js-yaml';
import { CircularReferenceError, MaxDepthExceededError, UnresolvedReferenceError } from '../errors';

export interface ResolverOptions {
  verbose?: boolean;
  maxDepth?: number;
}

export interface ResolvedReference {
  value: any;
  resolved: boolean;
  circular: boolean;
}

export class ReferenceResolver {
  private options: Required<ResolverOptions>;
  private cache: Map<string, any> = new Map();
  private resolving: Set<string> = new Set();

  constructor(options: ResolverOptions = {}) {
    this.options = {
      verbose: options.verbose || false,
      maxDepth: options.maxDepth || 10
    };
  }

  async resolve(document: any, basePath: string, depth = 0): Promise<any> {
    if (depth > this.options.maxDepth) {
      throw new MaxDepthExceededError('(document traversal)', this.options.maxDepth);
    }

    if (typeof document !== 'object' || document === null) {
      return document;
    }

    // Handle arrays
    if (Array.isArray(document)) {
      return Promise.all(
        document.map(item => this.resolve(item, basePath, depth + 1))
      );
    }

    // Handle $ref objects
    if (document.$ref && typeof document.$ref === 'string') {
      return this.resolveReference(document.$ref, basePath, depth);
    }

    // Handle regular objects
    const resolved: any = {};
    for (const [key, value] of Object.entries(document)) {
      resolved[key] = await this.resolve(value, basePath, depth + 1);
    }

    return resolved;
  }

  private async resolveReference(ref: string, basePath: string, depth: number): Promise<any> {
    if (this.options.verbose) {
      console.log(`Resolving reference: ${ref}`);
    }

    // Check for circular reference
    const resolveKey = `${basePath}#${ref}`;
    if (this.resolving.has(resolveKey)) {
      if (this.options.verbose) {
        console.warn(`Circular reference detected: ${ref}`);
      }
      // Return stub to prevent infinite loop; consumers can detect via $ref key
      return { $ref: ref, _circular: true };
    }

    // Check cache
    if (this.cache.has(resolveKey)) {
      return this.cache.get(resolveKey);
    }

    this.resolving.add(resolveKey);

    try {
      let resolved: any;

      if (ref.startsWith('#/')) {
        // Internal reference
        resolved = await this.resolveInternalReference(ref, basePath);
      } else if (ref.includes('#')) {
        // External reference with fragment
        const [filePath, fragment] = ref.split('#');
        resolved = await this.resolveExternalReference(filePath, fragment, basePath);
      } else {
        // External file reference
        resolved = await this.resolveExternalReference(ref, '', basePath);
      }

      // Recursively resolve the resolved content
      const fullyResolved = await this.resolve(resolved, basePath, depth + 1);
      
      this.cache.set(resolveKey, fullyResolved);
      return fullyResolved;
    } finally {
      this.resolving.delete(resolveKey);
    }
  }

  private async resolveInternalReference(ref: string, basePath: string): Promise<any> {
    // Load the base document if not already loaded
    const baseDocument = this.loadDocument(basePath);
    
    // Navigate to the referenced path
    const path = ref.substring(2); // Remove '#/'
    const pathParts = path.split('/');
    
    let current = baseDocument;
    for (const part of pathParts) {
      // Handle encoded path parts
      const decodedPart = decodeURIComponent(part);
      if (current && typeof current === 'object' && decodedPart in current) {
        current = current[decodedPart];
      } else {
        throw new UnresolvedReferenceError(ref, basePath);
      }
    }

    return current;
  }

  private async resolveExternalReference(filePath: string, fragment: string, basePath: string): Promise<any> {
    // Resolve the absolute path
    const baseDir = dirname(basePath);
    const absolutePath = resolve(baseDir, filePath);

    if (!existsSync(absolutePath)) {
      throw new UnresolvedReferenceError(`${filePath}${fragment ? '#' + fragment : ''}`, absolutePath);
    }

    // Load the external document
    const document = this.loadDocument(absolutePath);

    // If there's a fragment, navigate to it
    if (fragment && fragment.startsWith('/')) {
      const pathParts = fragment.substring(1).split('/');
      let current = document;
      
      for (const part of pathParts) {
        const decodedPart = decodeURIComponent(part);
        if (current && typeof current === 'object' && decodedPart in current) {
          current = current[decodedPart];
        } else {
          throw new UnresolvedReferenceError(`${filePath}#${fragment}`, absolutePath);
        }
      }
      
      return current;
    }

    return document;
  }

  private loadDocument(filePath: string): any {
    const cacheKey = `doc:${filePath}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf8');
    const ext = filePath.toLowerCase();
    
    let document: any;
    try {
      if (ext.endsWith('.yaml') || ext.endsWith('.yml')) {
        document = yaml.load(content);
      } else {
        document = JSON.parse(content);
      }
    } catch (error) {
      throw new Error(`Failed to parse ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }

    this.cache.set(cacheKey, document);
    return document;
  }

  /**
   * Clear the internal cache
   */
  clearCache(): void {
    this.cache.clear();
    this.resolving.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { documents: number; references: number } {
    const documents = Array.from(this.cache.keys()).filter(key => key.startsWith('doc:')).length;
    const references = this.cache.size - documents;
    
    return { documents, references };
  }
}
