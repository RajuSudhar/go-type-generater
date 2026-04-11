import {
  generatePackageTemplate,
  generateStructTemplate,
  generateEnumTemplate,
  generateInterfaceTemplate,
  generateTypeAliasTemplate,
  generateConstructorTemplate,
  generateGoModTemplate,
  generateMainExportTemplate,
  generateFileHeaderTemplate,
  generateGoFile,
  formatGoCode,
  generateDecoderTemplate,
  generateDecoderHelpersTemplate,
} from '../../src/templates/go-templates';
import { GoStruct, GoEnum, GoField } from '../../src/utils/go-types';

// ─── Package template ───────────────────────────────────────

describe('generatePackageTemplate', () => {
  it('generates package with no imports', () => {
    const result = generatePackageTemplate('mypkg', []);
    expect(result).toBe('package mypkg');
  });

  it('generates sorted import block', () => {
    const result = generatePackageTemplate('mypkg', ['time', 'fmt']);
    expect(result).toContain('import (');
    expect(result.indexOf('"fmt"')).toBeLessThan(result.indexOf('"time"'));
  });
});

// ─── Struct template ────────────────────────────────────────

describe('generateStructTemplate', () => {
  it('generates struct with fields', () => {
    const s: GoStruct = {
      name: 'User',
      fields: [
        { name: 'id', goName: 'Id', goType: 'int64', tags: '`json:"id"`', required: true },
        { name: 'name', goName: 'Name', goType: 'string', tags: '`json:"name"`', required: true },
      ],
    };
    const result = generateStructTemplate(s);
    expect(result).toContain('type User struct {');
    expect(result).toContain('Id int64');
    expect(result).toContain('Name string');
  });

  it('includes embedded types', () => {
    const s: GoStruct = {
      name: 'Admin',
      fields: [],
      embeddedTypes: ['User'],
    };
    const result = generateStructTemplate(s);
    expect(result).toContain('\tUser');
  });

  it('includes comment', () => {
    const s: GoStruct = { name: 'Foo', fields: [], comment: 'A foo' };
    const result = generateStructTemplate(s);
    expect(result).toContain('// Foo A foo');
  });

  it('generates default comment when none provided', () => {
    const s: GoStruct = { name: 'Foo', fields: [] };
    const result = generateStructTemplate(s);
    expect(result).toContain('// Foo represents a data structure');
  });
});

// ─── Enum template ──────────────────────────────────────────

describe('generateEnumTemplate', () => {
  it('generates type + const block', () => {
    const e: GoEnum = {
      name: 'Status',
      baseType: 'string',
      values: [
        { name: 'StatusActive', value: 'active' },
        { name: 'StatusInactive', value: 'inactive' },
      ],
    };
    const result = generateEnumTemplate(e);
    expect(result).toContain('type Status string');
    expect(result).toContain('const (');
    expect(result).toContain('StatusActive Status = "active"');
    expect(result).toContain('StatusInactive Status = "inactive"');
  });

  it('handles numeric enum', () => {
    const e: GoEnum = {
      name: 'Priority',
      baseType: 'int',
      values: [{ name: 'PriorityHigh', value: 1 }],
    };
    const result = generateEnumTemplate(e);
    expect(result).toContain('type Priority int');
    expect(result).toContain('PriorityHigh Priority = 1');
  });

  it('handles empty enum (no const block)', () => {
    const e: GoEnum = { name: 'Empty', baseType: 'string', values: [] };
    const result = generateEnumTemplate(e);
    expect(result).not.toContain('const (');
  });
});

// ─── Interface template ─────────────────────────────────────

describe('generateInterfaceTemplate', () => {
  it('generates interface with methods', () => {
    const result = generateInterfaceTemplate('Reader', [
      { name: 'Read', signature: 'Read(p []byte) (n int, err error)' },
    ]);
    expect(result).toContain('type Reader interface {');
    expect(result).toContain('Read(p []byte) (n int, err error)');
  });
});

// ─── Type alias ─────────────────────────────────────────────

describe('generateTypeAliasTemplate', () => {
  it('generates alias', () => {
    const result = generateTypeAliasTemplate('ID', 'int64');
    expect(result).toContain('type ID = int64');
  });
});

// ─── Constructor ────────────────────────────────────────────

describe('generateConstructorTemplate', () => {
  it('generates constructor for required fields', () => {
    const fields: GoField[] = [
      { name: 'id', goName: 'Id', goType: 'int64', tags: '', required: true },
      { name: 'name', goName: 'Name', goType: 'string', tags: '', required: true },
      { name: 'age', goName: 'Age', goType: 'int', tags: '', required: false },
    ];
    const result = generateConstructorTemplate('User', fields);
    expect(result).toContain('func NewUser(');
    expect(result).toContain('id int64');
    expect(result).toContain('name string');
    expect(result).not.toContain('age');
  });
});

// ─── go.mod ─────────────────────────────────────────────────

describe('generateGoModTemplate', () => {
  it('generates basic go.mod', () => {
    const result = generateGoModTemplate('mymod', '1.21');
    expect(result).toContain('module mymod');
    expect(result).toContain('go 1.21');
  });

  it('includes validator when requested', () => {
    const result = generateGoModTemplate('mymod', '1.21', true);
    expect(result).toContain('go-playground/validator');
  });
});

// ─── main export ────────────────────────────────────────────

describe('generateMainExportTemplate', () => {
  it('lists exported types', () => {
    const result = generateMainExportTemplate('mypkg', ['User', 'Product']);
    expect(result).toContain('package mypkg');
    expect(result).toContain('User is exported');
    expect(result).toContain('Product is exported');
  });

  it('handles empty types', () => {
    const result = generateMainExportTemplate('mypkg', []);
    expect(result).toContain('No types to export');
  });
});

// ─── File header ────────────────────────────────────────────

describe('generateFileHeaderTemplate', () => {
  it('includes DO NOT EDIT and timestamp', () => {
    const result = generateFileHeaderTemplate();
    expect(result).toContain('DO NOT EDIT');
    expect(result).toContain('Generated on:');
  });

  it('uses custom description', () => {
    const result = generateFileHeaderTemplate('My types');
    expect(result).toContain('My types');
  });
});

// ─── formatGoCode ───────────────────────────────────────────

describe('formatGoCode', () => {
  it('trims trailing whitespace', () => {
    expect(formatGoCode('foo   \nbar  ')).toBe('foo\nbar');
  });

  it('collapses triple+ newlines', () => {
    expect(formatGoCode('a\n\n\n\nb')).toBe('a\n\nb');
  });
});

// ─── generateGoFile ─────────────────────────────────────────

describe('generateGoFile', () => {
  it('assembles header + package + types', () => {
    const result = generateGoFile('mypkg', ['fmt'], [
      { type: 'struct', content: 'type Foo struct {}' },
    ], 'Test file');
    expect(result).toContain('DO NOT EDIT');
    expect(result).toContain('package mypkg');
    expect(result).toContain('import (');
    expect(result).toContain('type Foo struct {}');
  });
});

// ─── Decoder template ───────────────────────────────────────

describe('generateDecoderTemplate', () => {
  it('wraps body in function', () => {
    const result = generateDecoderTemplate('parseUser', 'User', '\treturn nil, nil');
    expect(result).toContain('func parseUser(raw interface{}) (*User, error)');
    expect(result).toContain('return nil, nil');
  });
});

// ─── Decoder helpers ────────────────────────────────────────

describe('generateDecoderHelpersTemplate', () => {
  it('includes isObject helper', () => {
    const result = generateDecoderHelpersTemplate(false);
    expect(result).toContain('func isObject(');
  });

  it('includes validator init when validation enabled', () => {
    const result = generateDecoderHelpersTemplate(true);
    expect(result).toContain('validate = validator.New()');
  });
});
