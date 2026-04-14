import { GoStruct, GoEnum, GoField, GoDecoder, GoUnion } from '../utils/go-types';

/**
 * Template for generating Go package header
 */
export function generatePackageTemplate(packageName: string, imports: string[]): string {
  const sortedImports = imports.sort();
  const importSection = sortedImports.length > 0 
    ? `\nimport (\n${sortedImports.map(imp => `\t"${imp}"`).join('\n')}\n)\n`
    : '';

  return `package ${packageName}${importSection}`;
}

/**
 * Template for generating Go struct
 */
export function generateStructTemplate(goStruct: GoStruct): string {
  const comment = goStruct.comment 
    ? `// ${goStruct.name} ${goStruct.comment}\n`
    : `// ${goStruct.name} represents a data structure\n`;

  const embeddedTypes = goStruct.embeddedTypes || [];
  const embeddedFields = embeddedTypes.map(type => `\t${type}`).join('\n');
  const regularFields = goStruct.fields.map(field => generateFieldTemplate(field)).join('\n');

  const allFields = [embeddedFields, regularFields].filter(Boolean).join('\n');

  return `${comment}type ${goStruct.name} struct {
${allFields}
}`;
}

/**
 * Template for generating Go struct field
 */
function generateFieldTemplate(field: GoField): string {
  const comment = field.comment ? ` // ${field.comment}` : '';
  return `\t${field.goName} ${field.goType} ${field.tags}${comment}`;
}

/**
 * Template for generating Go enum
 */
export function generateEnumTemplate(goEnum: GoEnum): string {
  const comment = goEnum.comment 
    ? `// ${goEnum.name} ${goEnum.comment}\n`
    : `// ${goEnum.name} represents an enumeration\n`;

  const typeDefinition = `type ${goEnum.name} ${goEnum.baseType}`;

  // Generate constants
  const constants = goEnum.values.map(value => {
    const valueComment = value.comment ? ` // ${value.comment}` : '';
    let constValue: string;
    
    if (typeof value.value === 'string') {
      constValue = `"${value.value}"`;
    } else {
      constValue = String(value.value);
    }
    
    return `\t${value.name} ${goEnum.name} = ${constValue}${valueComment}`;
  }).join('\n');

  const constBlock = goEnum.values.length > 0 
    ? `\nconst (\n${constants}\n)`
    : '';

  return `${comment}${typeDefinition}${constBlock}`;
}

/**
 * Template for generating Go interface
 */
export function generateInterfaceTemplate(name: string, methods: Array<{name: string; signature: string}>, comment?: string): string {
  const commentLine = comment 
    ? `// ${name} ${comment}\n`
    : `// ${name} represents an interface\n`;

  const methodDefs = methods.map(method => `\t${method.signature}`).join('\n');

  return `${commentLine}type ${name} interface {
${methodDefs}
}`;
}

/**
 * Template for generating type alias
 */
export function generateTypeAliasTemplate(name: string, targetType: string, comment?: string): string {
  const commentLine = comment 
    ? `// ${name} ${comment}\n`
    : `// ${name} is an alias for ${targetType}\n`;

  return `${commentLine}type ${name} = ${targetType}`;
}

/**
 * Template for generating constructor function
 */
export function generateConstructorTemplate(structName: string, fields: GoField[]): string {
  const requiredFields = fields.filter(field => field.required);
  const params = requiredFields.map(field => 
    `${field.name} ${field.goType}`
  ).join(', ');

  const assignments = requiredFields.map(field => 
    `\t\t${field.goName}: ${field.name},`
  ).join('\n');

  const funcName = `New${structName}`;
  
  return `// ${funcName} creates a new ${structName} instance
func ${funcName}(${params}) *${structName} {
\treturn &${structName}{
${assignments}
\t}
}`;
}

/**
 * Template for generating validation method
 */
export function generateValidationTemplate(structName: string, fields: GoField[]): string {
  const validationsNeeded = fields.some(field => 
    field.tags.includes('validate:')
  );

  if (!validationsNeeded) {
    return '';
  }

  return `// Validate validates the ${structName} struct
func (v *${structName}) Validate() error {
\t// Add validation logic here
\treturn nil
}`;
}

/**
 * Template for generating String method
 */
export function generateStringMethodTemplate(structName: string): string {
  return `// String returns a string representation of ${structName}
func (v ${structName}) String() string {
\tdata, _ := json.Marshal(v)
\treturn string(data)
}`;
}

/**
 * Template for generating main export file
 */
export function generateMainExportTemplate(packageName: string, exportedTypes: string[]): string {
  const header = `package ${packageName}

// This file exports all generated types for easy importing
`;

  if (exportedTypes.length === 0) {
    return header + '// No types to export';
  }

  const exports = exportedTypes.map(typeName => {
    return `// ${typeName} is exported from this package`;
  }).join('\n');

  return header + exports;
}

/**
 * Template for generating go.mod file
 */
export function generateGoModTemplate(
  moduleName: string,
  goVersion = '1.21',
  includeValidator = false
): string {
  const validatorDep = includeValidator
    ? '\tgithub.com/go-playground/validator/v10 v10.16.0'
    : '\t// Add your dependencies here';

  return `module ${moduleName}

go ${goVersion}

require (
${validatorDep}
)
`;
}

/**
 * Template for generating file header comment
 */
export function generateFileHeaderTemplate(description?: string): string {
  const timestamp = new Date().toISOString();
  const defaultDesc = 'Generated Go types from OpenAPI specification';
  
  return `// Code generated by go-type-generator. DO NOT EDIT.
// ${description || defaultDesc}
// Generated on: ${timestamp}

`;
}

/**
 * Utility function to format Go code with proper indentation
 */
export function formatGoCode(code: string): string {
  return code
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n\n\n+/g, '\n\n') // Remove excessive newlines
    .trim();
}

/**
 * Generate complete Go file content
 */
export function generateGoFile(
  packageName: string,
  imports: string[],
  types: Array<{
    type: 'struct' | 'enum' | 'interface' | 'alias' | 'union';
    content: string;
  }>,
  description?: string
): string {
  const header = generateFileHeaderTemplate(description);
  const packageHeader = generatePackageTemplate(packageName, imports);
  const typeDefinitions = types.map(t => t.content).join('\n\n');

  return formatGoCode([
    header,
    packageHeader,
    typeDefinitions
  ].filter(Boolean).join('\n\n'));
}

/**
 * Template for generating a Go sum type from OpenAPI oneOf/anyOf.
 *
 * Emits:
 *   - Marker interface `type <Union> interface { is<Union>() }`
 *   - One struct per variant implementing the marker method
 *   - If `discriminatorProperty` is set, a `<Union>Wrapper` with
 *     `UnmarshalJSON` that switches on the discriminator field.
 */
export function generateUnionTemplate(u: GoUnion): string {
  const commentLine = u.comment
    ? `// ${u.name} ${u.comment}`
    : `// ${u.name} is a sum type (${u.kind}) with ${u.variants.length} variant(s)`;

  const markerMethod = `is${u.name}`;

  const iface = `${commentLine}
type ${u.name} interface {
\t${markerMethod}()
}`;

  const variantBlocks = u.variants.map((v) => {
    const variantComment = v.comment
      ? `// ${v.name} ${v.comment}`
      : `// ${v.name} is a variant of ${u.name}`;

    let typeDef: string;
    if (v.aliasType) {
      typeDef = `type ${v.name} ${v.aliasType}`;
    } else {
      const embeds = (v.embeddedTypes || []).map((t) => `\t${t}`).join('\n');
      const fields = v.fields.map((f) => `\t${f.goName} ${f.goType} ${f.tags}${f.comment ? ` // ${f.comment}` : ''}`).join('\n');
      const body = [embeds, fields].filter(Boolean).join('\n');
      typeDef = `type ${v.name} struct {
${body}
}`;
    }

    const markerImpl = `func (${v.name}) ${markerMethod}() {}`;
    return `${variantComment}\n${typeDef}\n\n${markerImpl}`;
  }).join('\n\n');

  if (!u.discriminatorProperty) {
    return `${iface}\n\n${variantBlocks}`;
  }

  // Emit discriminator wrapper + UnmarshalJSON
  const wrapperName = `${u.name}Wrapper`;
  const cases = u.variants.map((v) => {
    const disc = v.discriminatorValue ?? v.name;
    return `\tcase "${disc}":
\t\tvar out ${v.name}
\t\tif err := json.Unmarshal(data, &out); err != nil {
\t\t\treturn err
\t\t}
\t\tw.Value = out
\t\treturn nil`;
  }).join('\n');

  const wrapper = `// ${wrapperName} decodes ${u.name} based on the "${u.discriminatorProperty}" discriminator field.
type ${wrapperName} struct {
\tValue ${u.name}
}

func (w *${wrapperName}) UnmarshalJSON(data []byte) error {
\tvar probe struct {
\t\tKind string \`json:"${u.discriminatorProperty}"\`
\t}
\tif err := json.Unmarshal(data, &probe); err != nil {
\t\treturn err
\t}
\tswitch probe.Kind {
${cases}
\tdefault:
\t\treturn fmt.Errorf("${u.name}: unknown ${u.discriminatorProperty} %q", probe.Kind)
\t}
}`;

  return `${iface}\n\n${variantBlocks}\n\n${wrapper}`;
}

/**
 * Template for generating decoder function
 */
export function generateDecoderTemplate(
  functionName: string,
  typeName: string,
  body: string
): string {
  return `// ${functionName} validates and constructs ${typeName} from raw input
func ${functionName}(raw interface{}) (*${typeName}, error) {
${body}
}`;
}

/**
 * Template for generating helper functions for a file
 */
export function generateDecoderHelpersTemplate(useValidation: boolean): string {
  const validatorInit = useValidation
    ? 'var validate = validator.New()\n\n'
    : '';

  return `${validatorInit}// Helper function to check if raw input is an object
func isObject(raw interface{}) bool {
\t_, ok := raw.(map[string]interface{})
\treturn ok
}`;
}
