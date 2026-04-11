import { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

export type SchemaObject = OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject;

export interface GoType {
  name: string;
  goType: string;
  comment?: string;
  tags?: string;
  imports?: Set<string>;
}

export interface GoField {
  name: string;
  goName: string;
  goType: string;
  comment?: string;
  tags: string;
  required: boolean;
  imports?: Set<string>;
}

export interface GoEnum {
  name: string;
  baseType: string;
  values: Array<{
    name: string;
    value: string | number;
    comment?: string;
  }>;
  comment?: string;
}

export interface GoStruct {
  name: string;
  fields: GoField[];
  comment?: string;
  embeddedTypes?: string[];
  imports?: Set<string>;
}

export interface GoInterface {
  name: string;
  methods: Array<{
    name: string;
    signature: string;
  }>;
  comment?: string;
}

export interface GoDecoder {
  name: string;              // e.g., "parseUser"
  typeName: string;          // e.g., "User"
  decoderType: 'struct' | 'enum' | 'array' | 'primitive';
  body: string;              // Generated decoder function body
  dependencies: string[];    // Other decoders this depends on
}

export interface GeneratedType {
  type: 'struct' | 'enum' | 'interface' | 'alias';
  definition: GoStruct | GoEnum | GoInterface | GoType;
  dependencies: string[];
  category: 'model' | 'enum' | 'request' | 'response' | 'common';
  decoder?: GoDecoder;       // Optional decoder function
}

/**
 * Convert OpenAPI schema name to Go type name following Go naming conventions
 */
export function toGoTypeName(name: string): string {
  // Handle special cases
  if (!name || name.trim() === '') {
    throw new Error('Type name cannot be empty');
  }

  // Remove invalid characters and split by common separators
  const parts = name
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .split(/[-_]/)
    .filter(part => part.length > 0);

  // Convert each part to PascalCase
  return parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert OpenAPI field name to Go field name
 */
export function toGoFieldName(name: string): string {
  if (!name || name.trim() === '') {
    throw new Error('Field name cannot be empty');
  }

  // Handle special Go keywords
  const goKeywords = new Set([
    'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else',
    'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface',
    'map', 'package', 'range', 'return', 'select', 'struct', 'switch', 'type',
    'var'
  ]);

  let goName = toGoTypeName(name);

  if (goKeywords.has(goName.toLowerCase())) {
    goName += 'Field';
  }

  return goName;
}

/**
 * Convert type name to parser function name in camelCase (e.g., User -> parseUser)
 */
export function toParserFunctionName(typeName: string): string {
  if (!typeName || typeName.trim() === '') {
    throw new Error('Type name cannot be empty');
  }

  // Convert to camelCase by lowercasing first character
  const pascalCase = toGoTypeName(typeName);
  return 'parse' + pascalCase;
}

/**
 * Map OpenAPI type to Go type
 */
export function mapOpenAPITypeToGo(schema: SchemaObject): { goType: string; imports: Set<string> } {
  const imports = new Set<string>();

  // Handle $ref (should be resolved by now, but just in case)
  if ('$ref' in schema) {
    throw new Error('Unresolved reference found. References should be resolved before type mapping.');
  }

  // Handle allOf, oneOf, anyOf
  if ('allOf' in schema && schema.allOf) {
    return { goType: 'interface{}', imports }; // Will be handled as embedded structs
  }

  if ('oneOf' in schema && schema.oneOf) {
    return { goType: 'interface{}', imports }; // Will be handled as interface
  }

  if ('anyOf' in schema && schema.anyOf) {
    return { goType: 'interface{}', imports }; // Will be handled as interface
  }

  // Handle arrays
  if (schema.type === 'array') {
    if (schema.items) {
      const itemType = mapOpenAPITypeToGo(schema.items as SchemaObject);
      imports.forEach(imp => itemType.imports.add(imp));
      return { 
        goType: `[]${itemType.goType}`, 
        imports: itemType.imports 
      };
    }
    return { goType: '[]interface{}', imports };
  }

  // Handle objects
  if (schema.type === 'object') {
    if (schema.additionalProperties === true) {
      return { goType: 'map[string]interface{}', imports };
    }
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      const valueType = mapOpenAPITypeToGo(schema.additionalProperties as SchemaObject);
      imports.forEach(imp => valueType.imports.add(imp));
      return { 
        goType: `map[string]${valueType.goType}`, 
        imports: valueType.imports 
      };
    }
    return { goType: 'struct{}', imports }; // Will be defined as named struct
  }

  // Handle enums
  if (schema.enum) {
    return mapEnumType(schema);
  }

  // Handle basic types
  switch (schema.type) {
    case 'string':
      return mapStringType(schema, imports);
    case 'number':
      return mapNumberType(schema);
    case 'integer':
      return mapIntegerType(schema);
    case 'boolean':
      return { goType: 'bool', imports };
    default:
      return { goType: 'interface{}', imports };
  }
}

function mapStringType(schema: SchemaObject, imports: Set<string>): { goType: string; imports: Set<string> } {
  // Handle format-specific types
  switch (schema.format) {
    case 'date':
      imports.add('time');
      return { goType: 'time.Time', imports };
    case 'date-time':
      imports.add('time');
      return { goType: 'time.Time', imports };
    case 'byte':
      return { goType: '[]byte', imports };
    case 'binary':
      return { goType: '[]byte', imports };
    case 'uuid':
      return { goType: 'string', imports }; // Could use github.com/google/uuid
    default:
      return { goType: 'string', imports };
  }
}

function mapNumberType(schema: SchemaObject): { goType: string; imports: Set<string> } {
  const imports = new Set<string>();
  
  switch (schema.format) {
    case 'float':
      return { goType: 'float32', imports };
    case 'double':
      return { goType: 'float64', imports };
    default:
      return { goType: 'float64', imports };
  }
}

function mapIntegerType(schema: SchemaObject): { goType: string; imports: Set<string> } {
  const imports = new Set<string>();
  
  switch (schema.format) {
    case 'int32':
      return { goType: 'int32', imports };
    case 'int64':
      return { goType: 'int64', imports };
    default:
      // Choose int type based on constraints if available
      if ('minimum' in schema && 'maximum' in schema) {
        const min = schema.minimum as number;
        const max = schema.maximum as number;
        
        if (min >= 0) {
          // Unsigned types
          if (max <= 255) return { goType: 'uint8', imports };
          if (max <= 65535) return { goType: 'uint16', imports };
          if (max <= 4294967295) return { goType: 'uint32', imports };
          return { goType: 'uint64', imports };
        } else {
          // Signed types
          if (min >= -128 && max <= 127) return { goType: 'int8', imports };
          if (min >= -32768 && max <= 32767) return { goType: 'int16', imports };
          if (min >= -2147483648 && max <= 2147483647) return { goType: 'int32', imports };
          return { goType: 'int64', imports };
        }
      }
      
      return { goType: 'int', imports };
  }
}

function mapEnumType(schema: SchemaObject): { goType: string; imports: Set<string> } {
  const imports = new Set<string>();
  
  // Determine base type from enum values
  if (schema.enum && schema.enum.length > 0) {
    const firstValue = schema.enum[0];
    if (typeof firstValue === 'string') {
      return { goType: 'string', imports };
    } else if (typeof firstValue === 'number') {
      return Number.isInteger(firstValue) 
        ? { goType: 'int', imports }
        : { goType: 'float64', imports };
    }
  }
  
  return { goType: 'interface{}', imports };
}

/**
 * Generate JSON tags for Go struct fields
 */
export function generateJSONTags(fieldName: string, schema: SchemaObject, required: boolean): string {
  const tags: string[] = [];
  
  // JSON tag
  let jsonTag = fieldName;
  if (!required) {
    jsonTag += ',omitempty';
  }
  tags.push(`json:"${jsonTag}"`);
  
  // Add validation tags if available
  if ('minimum' in schema) {
    tags.push(`validate:"min=${schema.minimum}"`);
  }
  if ('maximum' in schema) {
    tags.push(`validate:"max=${schema.maximum}"`);
  }
  if ('minLength' in schema) {
    tags.push(`validate:"min=${schema.minLength}"`);
  }
  if ('maxLength' in schema) {
    tags.push(`validate:"max=${schema.maxLength}"`);
  }
  if ('pattern' in schema) {
    tags.push(`validate:"regexp=${schema.pattern}"`);
  }
  
  return '`' + tags.join(' ') + '`';
}

/**
 * Generate Go comment from OpenAPI schema
 */
export function generateComment(schema: SchemaObject, name?: string): string | undefined {
  const parts: string[] = [];
  
  if (name) {
    parts.push(`${name} represents`);
  }
  
  if (schema.title) {
    parts.push(schema.title);
  }
  
  if (schema.description) {
    parts.push(schema.description);
  }
  
  return parts.length > 0 ? parts.join(' ') : undefined;
}
