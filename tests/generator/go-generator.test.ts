import { resolve } from 'path';
import { existsSync, readFileSync, mkdirSync, rmSync } from 'fs';
import { GoGenerator, GeneratorOptions } from '../../src/generator/go-generator';
import { OpenAPIParser } from '../../src/parser/openapi-parser';

const EXAMPLES = resolve(__dirname, '../../examples');
const TMP_OUT = resolve('/tmp', 'go-type-gen-test-output');

function defaultOpts(overrides: Partial<GeneratorOptions> = {}): GeneratorOptions {
  return {
    packageName: 'testpkg',
    grouping: 'category',
    ...overrides,
  };
}

describe('GoGenerator', () => {
  let parser: OpenAPIParser;

  beforeAll(() => {
    parser = new OpenAPIParser();
  });

  beforeEach(() => {
    if (existsSync(TMP_OUT)) rmSync(TMP_OUT, { recursive: true });
    mkdirSync(TMP_OUT, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(TMP_OUT)) rmSync(TMP_OUT, { recursive: true });
  });

  // ─── End-to-end generation ────────────────────────────────

  describe('generate (end-to-end)', () => {
    it('generates files with category grouping', async () => {
      const doc = await parser.parse(resolve(EXAMPLES, 'simple-api.yaml'));
      const gen = new GoGenerator(defaultOpts());
      const result = await gen.generate(doc, TMP_OUT);

      expect(result.filesGenerated).toBeGreaterThanOrEqual(3); // at least types + go.mod + main
      expect(result.files).toContain('go.mod');
      expect(result.files).toContain('main.go');
      expect(result.typesGenerated).toBeGreaterThan(0);

      // Verify go.mod created
      const gomod = readFileSync(resolve(TMP_OUT, 'go.mod'), 'utf8');
      expect(gomod).toContain('module testpkg');

      // Verify main.go created
      const main = readFileSync(resolve(TMP_OUT, 'main.go'), 'utf8');
      expect(main).toContain('package testpkg');
    });

    it('generates single file with single grouping', async () => {
      const doc = await parser.parse(resolve(EXAMPLES, 'simple-api.yaml'));
      const gen = new GoGenerator(defaultOpts({ grouping: 'single' }));
      const result = await gen.generate(doc, TMP_OUT);

      expect(result.files).toContain('types.go');
      const typesContent = readFileSync(resolve(TMP_OUT, 'types.go'), 'utf8');
      expect(typesContent).toContain('package testpkg');
      expect(typesContent).toContain('struct');
    });

    it('creates output directory if missing', async () => {
      const missingDir = resolve(TMP_OUT, 'nested', 'dir');
      const doc = await parser.parse(resolve(EXAMPLES, 'simple-api.yaml'));
      const gen = new GoGenerator(defaultOpts());
      await gen.generate(doc, missingDir);
      expect(existsSync(missingDir)).toBe(true);
    });
  });

  // ─── Category grouping ───────────────────────────────────

  describe('category grouping', () => {
    it('creates enums.go for enum types', async () => {
      const doc = await parser.parse(resolve(EXAMPLES, 'simple-api.yaml'));
      const gen = new GoGenerator(defaultOpts());
      await gen.generate(doc, TMP_OUT);

      expect(existsSync(resolve(TMP_OUT, 'enums.go'))).toBe(true);
      const content = readFileSync(resolve(TMP_OUT, 'enums.go'), 'utf8');
      expect(content).toContain('Category');
      expect(content).toContain('Orderstatus');
    });

    it('puts request schemas in requests.go', async () => {
      const doc = await parser.parse(resolve(EXAMPLES, 'simple-api.yaml'));
      const gen = new GoGenerator(defaultOpts());
      await gen.generate(doc, TMP_OUT);

      expect(existsSync(resolve(TMP_OUT, 'requests.go'))).toBe(true);
      const content = readFileSync(resolve(TMP_OUT, 'requests.go'), 'utf8');
      expect(content).toContain('Createuserrequest');
    });

    it('puts response schemas in responses.go', async () => {
      const doc = await parser.parse(resolve(EXAMPLES, 'simple-api.yaml'));
      const gen = new GoGenerator(defaultOpts());
      await gen.generate(doc, TMP_OUT);

      expect(existsSync(resolve(TMP_OUT, 'responses.go'))).toBe(true);
      const content = readFileSync(resolve(TMP_OUT, 'responses.go'), 'utf8');
      expect(content).toContain('Userresponse');
    });
  });

  // ─── Type conversion ─────────────────────────────────────

  describe('type conversion', () => {
    it('generates structs with proper fields', async () => {
      const doc = await parser.parse(resolve(EXAMPLES, 'simple-api.yaml'));
      const gen = new GoGenerator(defaultOpts({ grouping: 'single' }));
      await gen.generate(doc, TMP_OUT);

      const content = readFileSync(resolve(TMP_OUT, 'types.go'), 'utf8');
      // User struct should have json tags
      expect(content).toContain('json:"id"');
      expect(content).toContain('json:"name"');
      expect(content).toContain('json:"email"');
    });

    it('generates enum const blocks', async () => {
      const doc = await parser.parse(resolve(EXAMPLES, 'simple-api.yaml'));
      const gen = new GoGenerator(defaultOpts({ grouping: 'single' }));
      await gen.generate(doc, TMP_OUT);

      const content = readFileSync(resolve(TMP_OUT, 'types.go'), 'utf8');
      expect(content).toContain('const (');
      expect(content).toContain('"electronics"');
    });

    it('handles allOf with embedded types', async () => {
      const doc = await parser.parse(resolve(EXAMPLES, 'simple-api.yaml'));
      const gen = new GoGenerator(defaultOpts({ grouping: 'single' }));
      await gen.generate(doc, TMP_OUT);

      const content = readFileSync(resolve(TMP_OUT, 'types.go'), 'utf8');
      // UserResponse uses allOf → should have embedded User or inline fields
      expect(content).toContain('Userresponse');
    });
  });

  // ─── Decoder generation ───────────────────────────────────

  describe('decoder generation', () => {
    it('generates decoders by default', async () => {
      const doc = await parser.parse(resolve(EXAMPLES, 'simple-api.yaml'));
      const gen = new GoGenerator(defaultOpts({ grouping: 'single' }));
      await gen.generate(doc, TMP_OUT);

      const content = readFileSync(resolve(TMP_OUT, 'types.go'), 'utf8');
      expect(content).toContain('func parseUser');
      expect(content).toContain('func parseCategory');
    });

    it('skips decoders when disabled', async () => {
      const doc = await parser.parse(resolve(EXAMPLES, 'simple-api.yaml'));
      const gen = new GoGenerator(defaultOpts({ grouping: 'single', generateDecoders: false }));
      await gen.generate(doc, TMP_OUT);

      const content = readFileSync(resolve(TMP_OUT, 'types.go'), 'utf8');
      expect(content).not.toContain('func parse');
    });
  });

  // ─── go.mod generation ────────────────────────────────────

  describe('go.mod', () => {
    it('includes validator dep when validation enabled', async () => {
      const doc = await parser.parse(resolve(EXAMPLES, 'simple-api.yaml'));
      const gen = new GoGenerator(defaultOpts({ generateValidation: true }));
      await gen.generate(doc, TMP_OUT);

      const gomod = readFileSync(resolve(TMP_OUT, 'go.mod'), 'utf8');
      expect(gomod).toContain('go-playground/validator');
    });

    it('excludes validator dep by default', async () => {
      const doc = await parser.parse(resolve(EXAMPLES, 'simple-api.yaml'));
      const gen = new GoGenerator(defaultOpts());
      await gen.generate(doc, TMP_OUT);

      const gomod = readFileSync(resolve(TMP_OUT, 'go.mod'), 'utf8');
      expect(gomod).not.toContain('go-playground/validator');
    });

    it('does not overwrite existing go.mod', async () => {
      const doc = await parser.parse(resolve(EXAMPLES, 'simple-api.yaml'));

      // Write a go.mod first
      const gomodPath = resolve(TMP_OUT, 'go.mod');
      const { writeFileSync } = require('fs');
      writeFileSync(gomodPath, 'module existing\n');

      const gen = new GoGenerator(defaultOpts());
      await gen.generate(doc, TMP_OUT);

      const gomod = readFileSync(gomodPath, 'utf8');
      expect(gomod).toContain('module existing');
    });
  });

  // ─── Generated file headers ───────────────────────────────

  describe('file headers', () => {
    it('includes DO NOT EDIT warning', async () => {
      const doc = await parser.parse(resolve(EXAMPLES, 'simple-api.yaml'));
      const gen = new GoGenerator(defaultOpts({ grouping: 'single' }));
      await gen.generate(doc, TMP_OUT);

      const content = readFileSync(resolve(TMP_OUT, 'types.go'), 'utf8');
      expect(content).toContain('DO NOT EDIT');
    });
  });
});
