/**
 * Custom error types for the go-type-generator pipeline.
 */

export class CircularReferenceError extends Error {
  public readonly ref: string;
  public readonly chain: string[];

  constructor(ref: string, chain: string[] = []) {
    super(`Circular reference detected: ${ref}${chain.length ? ` (chain: ${chain.join(' → ')})` : ''}`);
    this.name = 'CircularReferenceError';
    this.ref = ref;
    this.chain = chain;
  }
}

export class MaxDepthExceededError extends Error {
  public readonly maxDepth: number;
  public readonly ref: string;

  constructor(ref: string, maxDepth: number) {
    super(`Maximum resolution depth (${maxDepth}) exceeded at: ${ref}`);
    this.name = 'MaxDepthExceededError';
    this.maxDepth = maxDepth;
    this.ref = ref;
  }
}

export class UnresolvedReferenceError extends Error {
  public readonly ref: string;
  public readonly filePath?: string;

  constructor(ref: string, filePath?: string) {
    super(`Reference path not found: ${ref}${filePath ? ` in ${filePath}` : ''}`);
    this.name = 'UnresolvedReferenceError';
    this.ref = ref;
    this.filePath = filePath;
  }
}

export class ParseError extends Error {
  public readonly filePath: string;
  public readonly format: string;

  constructor(filePath: string, format: string, cause?: Error) {
    super(`Failed to parse ${format.toUpperCase()} file: ${filePath}${cause ? `: ${cause.message}` : ''}`);
    this.name = 'ParseError';
    this.filePath = filePath;
    this.format = format;
  }
}
