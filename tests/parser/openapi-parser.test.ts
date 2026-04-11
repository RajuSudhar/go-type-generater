import { resolve } from 'path';
import { OpenAPIParser } from '../../src/parser/openapi-parser';

const FIXTURES = resolve(__dirname, '../fixtures');
const EXAMPLES = resolve(__dirname, '../../examples');

describe('OpenAPIParser', () => {
  let parser: OpenAPIParser;

  beforeEach(() => {
    parser = new OpenAPIParser();
  });

  // ─── Format detection & parsing ───────────────────────────

  describe('parse', () => {
    it('parses valid YAML file', async () => {
      const doc = await parser.parse(resolve(EXAMPLES, 'simple-api.yaml'));
      expect(doc.openapi).toBe('3.0.3');
      expect(doc.info.title).toBe('Simple API');
    });

    it('parses valid JSON file', async () => {
      const doc = await parser.parse(resolve(FIXTURES, 'minimal.json'));
      expect(doc.openapi).toBe('3.0.3');
      expect(doc.info.title).toBe('Minimal');
    });

    it('rejects Swagger 2.0', async () => {
      await expect(
        parser.parse(resolve(FIXTURES, 'swagger2.yaml')),
      ).rejects.toThrow('Swagger 2.0 is not supported');
    });

    it('resolves internal $ref during parse', async () => {
      const doc = await parser.parse(resolve(EXAMPLES, 'simple-api.yaml'));
      // UserResponse has allOf with $ref to User — should be resolved
      const schemas = (doc as any).components?.schemas;
      expect(schemas).toBeDefined();
      expect(schemas.User.type).toBe('object');
    });
  });

  // ─── Format option override ───────────────────────────────

  describe('format override', () => {
    it('respects explicit yaml format', async () => {
      const p = new OpenAPIParser({ format: 'yaml' });
      const doc = await p.parse(resolve(EXAMPLES, 'simple-api.yaml'));
      expect(doc.openapi).toBeDefined();
    });
  });

  // ─── Version validation ───────────────────────────────────

  describe('version validation', () => {
    it('accepts 3.0 when version=3.0', async () => {
      const p = new OpenAPIParser({ version: '3.0' });
      const doc = await p.parse(resolve(EXAMPLES, 'simple-api.yaml'));
      expect(doc.openapi).toMatch(/^3\.0/);
    });

    it('rejects 3.0 when version=3.1', async () => {
      const p = new OpenAPIParser({ version: '3.1' });
      await expect(
        p.parse(resolve(EXAMPLES, 'simple-api.yaml')),
      ).rejects.toThrow('Expected OpenAPI 3.1');
    });
  });

  // ─── extractSchemas ───────────────────────────────────────

  describe('extractSchemas', () => {
    it('extracts all schemas from components', async () => {
      const doc = await parser.parse(resolve(EXAMPLES, 'simple-api.yaml'));
      const schemas = parser.extractSchemas(doc);
      expect(Object.keys(schemas)).toContain('User');
      expect(Object.keys(schemas)).toContain('Product');
      expect(Object.keys(schemas)).toContain('Category');
    });

    it('returns empty for doc without components', () => {
      const schemas = parser.extractSchemas({ openapi: '3.0.3', info: { title: 'x', version: '1' }, paths: {} });
      expect(Object.keys(schemas)).toHaveLength(0);
    });
  });

  // ─── isOpenAPI31 ──────────────────────────────────────────

  describe('isOpenAPI31', () => {
    it('returns false for 3.0 doc', async () => {
      const doc = await parser.parse(resolve(EXAMPLES, 'simple-api.yaml'));
      expect(parser.isOpenAPI31(doc)).toBe(false);
    });
  });

  // ─── Error cases ──────────────────────────────────────────

  describe('error handling', () => {
    it('throws on nonexistent file', async () => {
      await expect(parser.parse('/nonexistent.yaml')).rejects.toThrow();
    });
  });
});
