import { resolve } from 'path';
import { ReferenceResolver } from '../../src/resolver/reference-resolver';
import { MaxDepthExceededError, UnresolvedReferenceError } from '../../src/errors';

const FIXTURES = resolve(__dirname, '../fixtures');

describe('ReferenceResolver', () => {
  let resolver: ReferenceResolver;

  beforeEach(() => {
    resolver = new ReferenceResolver();
  });

  afterEach(() => {
    resolver.clearCache();
  });

  // ─── Internal references ──────────────────────────────────

  describe('internal references', () => {
    it('resolves internal $ref from file-loaded doc', async () => {
      // Use the external-ref-main.yaml which has an Order schema
      const filePath = resolve(FIXTURES, 'external-ref-main.yaml');
      const result = await resolver.resolve(
        { $ref: '#/components/schemas/Order' },
        filePath,
      );
      expect(result.type).toBe('object');
      expect(result.properties.id.type).toBe('integer');
    });

    it('resolves $ref embedded inside a document', async () => {
      // circular-refs.yaml has internal $refs between NodeA and NodeB
      const filePath = resolve(FIXTURES, 'circular-refs.yaml');
      const result = await resolver.resolve(
        { $ref: '#/components/schemas/NodeA' },
        filePath,
      );
      expect(result.type).toBe('object');
      expect(result.properties).toBeDefined();
    });

    it('throws UnresolvedReferenceError on invalid path', async () => {
      const filePath = resolve(FIXTURES, 'external-ref-main.yaml');
      await expect(
        resolver.resolve({ $ref: '#/components/schemas/Nonexistent' }, filePath),
      ).rejects.toThrow(UnresolvedReferenceError);
    });
  });

  // ─── External references ──────────────────────────────────

  describe('external references', () => {
    it('resolves external file with fragment', async () => {
      const filePath = resolve(FIXTURES, 'external-ref-main.yaml');
      const result = await resolver.resolve(
        { $ref: './external-ref-status.yaml#/OrderStatus' },
        filePath,
      );
      expect(result.type).toBe('string');
      expect(result.enum).toEqual(['pending', 'shipped', 'delivered']);
    });

    it('throws UnresolvedReferenceError on missing external file', async () => {
      const filePath = resolve(FIXTURES, 'external-ref-main.yaml');
      await expect(
        resolver.resolve({ $ref: './nonexistent.yaml#/Foo' }, filePath),
      ).rejects.toThrow(UnresolvedReferenceError);
    });
  });

  // ─── Circular references ──────────────────────────────────

  describe('circular references', () => {
    it('detects circular ref and returns $ref stub', async () => {
      const filePath = resolve(FIXTURES, 'circular-refs.yaml');
      const result = await resolver.resolve(
        { $ref: '#/components/schemas/NodeA' },
        filePath,
      );
      // Should eventually hit the circular guard and return { $ref: ... }
      // instead of infinite recursion
      expect(result).toBeDefined();
      // One of the nested children should be a $ref stub
      const childRef = result?.properties?.child?.properties?.parent;
      expect(childRef).toBeDefined();
      // It should have a $ref key with _circular marker
      expect(childRef.$ref).toBeDefined();
      expect(childRef._circular).toBe(true);
    });
  });

  // ─── Max depth ────────────────────────────────────────────

  describe('max depth', () => {
    it('throws MaxDepthExceededError when depth exceeded', async () => {
      const shallowResolver = new ReferenceResolver({ maxDepth: 2 });
      // Build a deeply nested object — depth increments per object traversal level
      const deep: any = { a: { b: { c: { d: { e: { f: 'leaf' } } } } } };
      await expect(
        shallowResolver.resolve(deep, resolve(FIXTURES, 'external-ref-main.yaml')),
      ).rejects.toThrow(MaxDepthExceededError);
    });
  });

  // ─── Caching ──────────────────────────────────────────────

  describe('caching', () => {
    it('caches resolved references', async () => {
      const filePath = resolve(FIXTURES, 'external-ref-main.yaml');
      await resolver.resolve(
        { $ref: './external-ref-status.yaml#/OrderStatus' },
        filePath,
      );
      const stats = resolver.getCacheStats();
      expect(stats.documents).toBeGreaterThanOrEqual(1);
    });

    it('clearCache resets stats', async () => {
      const filePath = resolve(FIXTURES, 'external-ref-main.yaml');
      await resolver.resolve(
        { $ref: './external-ref-status.yaml#/OrderStatus' },
        filePath,
      );
      resolver.clearCache();
      const stats = resolver.getCacheStats();
      expect(stats.documents).toBe(0);
      expect(stats.references).toBe(0);
    });
  });

  // ─── Primitives ───────────────────────────────────────────

  describe('primitive passthrough', () => {
    it('returns string as-is', async () => {
      expect(await resolver.resolve('hello', '/fake')).toBe('hello');
    });

    it('returns number as-is', async () => {
      expect(await resolver.resolve(42, '/fake')).toBe(42);
    });

    it('returns null as-is', async () => {
      expect(await resolver.resolve(null, '/fake')).toBeNull();
    });
  });
});
