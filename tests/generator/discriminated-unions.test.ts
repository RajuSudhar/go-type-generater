import { resolve } from 'path';
import { existsSync, readFileSync, mkdirSync, rmSync } from 'fs';
import { GoGenerator } from '../../src/generator/go-generator';
import { OpenAPIParser } from '../../src/parser/openapi-parser';

const FIXTURES = resolve(__dirname, '../fixtures');
const TMP_OUT = resolve('/tmp', 'go-type-gen-union-test-output');

describe('GoGenerator — discriminated unions', () => {
  let parser: OpenAPIParser;
  let typesContent: string;

  beforeAll(async () => {
    parser = new OpenAPIParser();
    if (existsSync(TMP_OUT)) rmSync(TMP_OUT, { recursive: true });
    mkdirSync(TMP_OUT, { recursive: true });

    const doc = await parser.parse(resolve(FIXTURES, 'discriminated-union.yaml'));
    const gen = new GoGenerator({ packageName: 'testpkg', grouping: 'single' });
    await gen.generate(doc, TMP_OUT);
    typesContent = readFileSync(resolve(TMP_OUT, 'types.go'), 'utf8');
  });

  afterAll(() => {
    if (existsSync(TMP_OUT)) rmSync(TMP_OUT, { recursive: true });
  });

  it('emits a marker interface for oneOf', () => {
    expect(typesContent).toMatch(/type Pet interface \{/);
    expect(typesContent).toContain('isPet()');
  });

  it('emits a struct per discriminated variant using the title', () => {
    expect(typesContent).toMatch(/type Dog struct \{/);
    expect(typesContent).toMatch(/type Cat struct \{/);
  });

  it('emits marker method implementations on every variant', () => {
    expect(typesContent).toContain('func (Dog) isPet()');
    expect(typesContent).toContain('func (Cat) isPet()');
  });

  it('emits UnmarshalJSON wrapper when discriminator.propertyName is present', () => {
    expect(typesContent).toContain('type PetWrapper struct');
    expect(typesContent).toContain('func (w *PetWrapper) UnmarshalJSON(data []byte) error');
    expect(typesContent).toContain('case "dog":');
    expect(typesContent).toContain('case "cat":');
    expect(typesContent).toContain('encoding/json');
  });

  it('handles anyOf without discriminator (no wrapper emitted)', () => {
    expect(typesContent).toMatch(/type Shape interface \{/);
    expect(typesContent).toContain('isShape()');
    expect(typesContent).toMatch(/type Circle struct \{/);
    expect(typesContent).toMatch(/type Square struct \{/);
    expect(typesContent).not.toContain('ShapeWrapper');
  });

  it('falls back to synthesized names for scalar oneOf variants', () => {
    expect(typesContent).toMatch(/type Scalar interface \{/);
    expect(typesContent).toContain('type ScalarVariant1 string');
    expect(typesContent).toContain('type ScalarVariant2 int');
    expect(typesContent).toContain('func (ScalarVariant1) isScalar()');
    expect(typesContent).toContain('func (ScalarVariant2) isScalar()');
  });
});
