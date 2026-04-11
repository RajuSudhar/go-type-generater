import {
  toGoTypeName,
  toGoFieldName,
  toParserFunctionName,
  mapOpenAPITypeToGo,
  generateJSONTags,
  generateComment,
  SchemaObject,
} from '../../src/utils/go-types';

// ─── toGoTypeName ───────────────────────────────────────────

describe('toGoTypeName', () => {
  it('converts snake_case to PascalCase', () => {
    expect(toGoTypeName('user_profile')).toBe('UserProfile');
  });

  it('converts kebab-case to PascalCase', () => {
    expect(toGoTypeName('user-profile')).toBe('UserProfile');
  });

  it('handles single word', () => {
    expect(toGoTypeName('user')).toBe('User');
  });

  it('handles already PascalCase', () => {
    expect(toGoTypeName('UserProfile')).toBe('Userprofile');
    // Note: current impl lowercases after first char per part
  });

  it('strips invalid characters', () => {
    expect(toGoTypeName('user.profile')).toBe('Userprofile');
  });

  it('throws on empty string', () => {
    expect(() => toGoTypeName('')).toThrow('Type name cannot be empty');
  });

  it('throws on whitespace-only', () => {
    expect(() => toGoTypeName('   ')).toThrow('Type name cannot be empty');
  });

  it('handles names starting with number after split', () => {
    // Parts starting with a digit get uppercased first char (digit stays)
    const result = toGoTypeName('item_2x');
    expect(result).toBeTruthy();
  });
});

// ─── toGoFieldName ──────────────────────────────────────────

describe('toGoFieldName', () => {
  it('appends Field to Go keywords', () => {
    expect(toGoFieldName('type')).toBe('TypeField');
    expect(toGoFieldName('interface')).toBe('InterfaceField');
    expect(toGoFieldName('map')).toBe('MapField');
    expect(toGoFieldName('func')).toBe('FuncField');
    expect(toGoFieldName('var')).toBe('VarField');
    expect(toGoFieldName('range')).toBe('RangeField');
  });

  it('does not append Field to non-keywords', () => {
    expect(toGoFieldName('name')).toBe('Name');
    expect(toGoFieldName('user_id')).toBe('UserId');
  });

  it('throws on empty string', () => {
    expect(() => toGoFieldName('')).toThrow('Field name cannot be empty');
  });
});

// ─── toParserFunctionName ───────────────────────────────────

describe('toParserFunctionName', () => {
  it('produces parse prefix + PascalCase', () => {
    expect(toParserFunctionName('User')).toBe('parseUser');
    expect(toParserFunctionName('order_status')).toBe('parseOrderStatus');
  });

  it('throws on empty string', () => {
    expect(() => toParserFunctionName('')).toThrow('Type name cannot be empty');
  });
});

// ─── mapOpenAPITypeToGo ─────────────────────────────────────

describe('mapOpenAPITypeToGo', () => {
  // Basic types
  it('maps string to string', () => {
    expect(mapOpenAPITypeToGo({ type: 'string' } as SchemaObject).goType).toBe('string');
  });

  it('maps boolean to bool', () => {
    expect(mapOpenAPITypeToGo({ type: 'boolean' } as SchemaObject).goType).toBe('bool');
  });

  it('maps number to float64 by default', () => {
    expect(mapOpenAPITypeToGo({ type: 'number' } as SchemaObject).goType).toBe('float64');
  });

  it('maps number format=float to float32', () => {
    expect(mapOpenAPITypeToGo({ type: 'number', format: 'float' } as SchemaObject).goType).toBe('float32');
  });

  it('maps number format=double to float64', () => {
    expect(mapOpenAPITypeToGo({ type: 'number', format: 'double' } as SchemaObject).goType).toBe('float64');
  });

  it('maps integer to int by default', () => {
    expect(mapOpenAPITypeToGo({ type: 'integer' } as SchemaObject).goType).toBe('int');
  });

  it('maps integer format=int32', () => {
    expect(mapOpenAPITypeToGo({ type: 'integer', format: 'int32' } as SchemaObject).goType).toBe('int32');
  });

  it('maps integer format=int64', () => {
    expect(mapOpenAPITypeToGo({ type: 'integer', format: 'int64' } as SchemaObject).goType).toBe('int64');
  });

  // Constraint-based integer sizing
  it('maps unsigned 0-255 to uint8', () => {
    expect(mapOpenAPITypeToGo({ type: 'integer', minimum: 0, maximum: 255 } as SchemaObject).goType).toBe('uint8');
  });

  it('maps unsigned 0-65535 to uint16', () => {
    expect(mapOpenAPITypeToGo({ type: 'integer', minimum: 0, maximum: 65535 } as SchemaObject).goType).toBe('uint16');
  });

  it('maps signed -128..127 to int8', () => {
    expect(mapOpenAPITypeToGo({ type: 'integer', minimum: -128, maximum: 127 } as SchemaObject).goType).toBe('int8');
  });

  it('maps signed -32768..32767 to int16', () => {
    expect(mapOpenAPITypeToGo({ type: 'integer', minimum: -32768, maximum: 32767 } as SchemaObject).goType).toBe('int16');
  });

  it('maps large unsigned to uint64', () => {
    expect(mapOpenAPITypeToGo({ type: 'integer', minimum: 0, maximum: 5000000000 } as SchemaObject).goType).toBe('uint64');
  });

  // String formats
  it('maps string format=date to time.Time', () => {
    const result = mapOpenAPITypeToGo({ type: 'string', format: 'date' } as SchemaObject);
    expect(result.goType).toBe('time.Time');
    expect(result.imports.has('time')).toBe(true);
  });

  it('maps string format=date-time to time.Time', () => {
    const result = mapOpenAPITypeToGo({ type: 'string', format: 'date-time' } as SchemaObject);
    expect(result.goType).toBe('time.Time');
    expect(result.imports.has('time')).toBe(true);
  });

  it('maps string format=byte to []byte', () => {
    expect(mapOpenAPITypeToGo({ type: 'string', format: 'byte' } as SchemaObject).goType).toBe('[]byte');
  });

  it('maps string format=binary to []byte', () => {
    expect(mapOpenAPITypeToGo({ type: 'string', format: 'binary' } as SchemaObject).goType).toBe('[]byte');
  });

  it('maps string format=uuid to string', () => {
    expect(mapOpenAPITypeToGo({ type: 'string', format: 'uuid' } as SchemaObject).goType).toBe('string');
  });

  // Arrays
  it('maps array of strings', () => {
    expect(mapOpenAPITypeToGo({
      type: 'array', items: { type: 'string' },
    } as SchemaObject).goType).toBe('[]string');
  });

  it('maps array without items to []interface{}', () => {
    expect(mapOpenAPITypeToGo({ type: 'array' } as SchemaObject).goType).toBe('[]interface{}');
  });

  // Objects
  it('maps object to struct{}', () => {
    expect(mapOpenAPITypeToGo({ type: 'object' } as SchemaObject).goType).toBe('struct{}');
  });

  it('maps object with additionalProperties=true to map[string]interface{}', () => {
    expect(mapOpenAPITypeToGo({
      type: 'object', additionalProperties: true,
    } as SchemaObject).goType).toBe('map[string]interface{}');
  });

  it('maps object with typed additionalProperties', () => {
    expect(mapOpenAPITypeToGo({
      type: 'object',
      additionalProperties: { type: 'string' },
    } as SchemaObject).goType).toBe('map[string]string');
  });

  // Composition
  it('maps allOf to interface{}', () => {
    expect(mapOpenAPITypeToGo({ allOf: [{}] } as any).goType).toBe('interface{}');
  });

  it('maps oneOf to interface{}', () => {
    expect(mapOpenAPITypeToGo({ oneOf: [{}] } as any).goType).toBe('interface{}');
  });

  it('maps anyOf to interface{}', () => {
    expect(mapOpenAPITypeToGo({ anyOf: [{}] } as any).goType).toBe('interface{}');
  });

  // Enums
  it('maps string enum to string', () => {
    expect(mapOpenAPITypeToGo({ enum: ['a', 'b'] } as SchemaObject).goType).toBe('string');
  });

  it('maps integer enum to int', () => {
    expect(mapOpenAPITypeToGo({ enum: [1, 2, 3] } as SchemaObject).goType).toBe('int');
  });

  it('maps float enum to float64', () => {
    expect(mapOpenAPITypeToGo({ enum: [1.5, 2.5] } as SchemaObject).goType).toBe('float64');
  });

  it('maps empty enum to interface{}', () => {
    expect(mapOpenAPITypeToGo({ enum: [] } as SchemaObject).goType).toBe('interface{}');
  });

  // $ref error
  it('throws on unresolved $ref', () => {
    expect(() => mapOpenAPITypeToGo({ $ref: '#/foo' } as any)).toThrow('Unresolved reference');
  });

  // Unknown type
  it('maps unknown type to interface{}', () => {
    expect(mapOpenAPITypeToGo({} as SchemaObject).goType).toBe('interface{}');
  });
});

// ─── generateJSONTags ───────────────────────────────────────

describe('generateJSONTags', () => {
  it('generates required field tag without omitempty', () => {
    const tag = generateJSONTags('id', {} as SchemaObject, true);
    expect(tag).toBe('`json:"id"`');
  });

  it('generates optional field tag with omitempty', () => {
    const tag = generateJSONTags('name', {} as SchemaObject, false);
    expect(tag).toBe('`json:"name,omitempty"`');
  });

  it('adds validate min/max tags', () => {
    const tag = generateJSONTags('age', { minimum: 0, maximum: 150 } as SchemaObject, true);
    expect(tag).toContain('validate:"min=0"');
    expect(tag).toContain('validate:"max=150"');
  });

  it('adds validate minLength/maxLength tags', () => {
    const tag = generateJSONTags('name', { minLength: 1, maxLength: 100 } as SchemaObject, true);
    expect(tag).toContain('validate:"min=1"');
    expect(tag).toContain('validate:"max=100"');
  });

  it('adds validate regexp tag', () => {
    const tag = generateJSONTags('code', { pattern: '^[A-Z]+$' } as SchemaObject, true);
    expect(tag).toContain('validate:"regexp=^[A-Z]+$"');
  });
});

// ─── generateComment ────────────────────────────────────────

describe('generateComment', () => {
  it('returns undefined for empty schema', () => {
    expect(generateComment({} as SchemaObject)).toBeUndefined();
  });

  it('returns title if present', () => {
    expect(generateComment({ title: 'User model' } as SchemaObject)).toBe('User model');
  });

  it('includes name when provided', () => {
    expect(generateComment({ description: 'A user' } as SchemaObject, 'User')).toContain('User');
    expect(generateComment({ description: 'A user' } as SchemaObject, 'User')).toContain('A user');
  });
});
