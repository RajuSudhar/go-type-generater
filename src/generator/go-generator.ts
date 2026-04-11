import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { OpenAPIDocument } from '../parser/openapi-parser';
import {
  SchemaObject,
  GeneratedType,
  GoStruct,
  GoEnum,
  GoField,
  GoDecoder,
  toGoTypeName,
  toGoFieldName,
  toParserFunctionName,
  mapOpenAPITypeToGo,
  generateJSONTags,
  generateComment
} from '../utils/go-types';
import {
  generateGoFile,
  generateStructTemplate,
  generateEnumTemplate,
  generateGoModTemplate,
  generateMainExportTemplate,
  generateDecoderTemplate,
  generateDecoderHelpersTemplate
} from '../templates/go-templates';

export interface GeneratorOptions {
  packageName: string;
  grouping: 'category' | 'single' | 'custom';
  verbose?: boolean;
  generateConstructors?: boolean;
  generateValidation?: boolean;
  generateStringMethods?: boolean;
  generateDecoders?: boolean;          // Default: true - Generate decoder/parser functions
}

export interface GenerationResult {
  filesGenerated: number;
  typesGenerated: number;
  files: string[];
}

interface GeneratedFile {
  filename: string;
  content: string;
  types: string[];
}

export class GoGenerator {
  private options: Required<GeneratorOptions>;

  constructor(options: GeneratorOptions) {
    this.options = {
      packageName: options.packageName,
      grouping: options.grouping,
      verbose: options.verbose || false,
      generateConstructors: options.generateConstructors || false,
      generateValidation: options.generateValidation || false,
      generateStringMethods: options.generateStringMethods || false,
      generateDecoders: options.generateDecoders !== undefined ? options.generateDecoders : true
    };
  }

  async generate(document: OpenAPIDocument, outputPath: string): Promise<GenerationResult> {
    // Extract schemas from the OpenAPI document
    const schemas = this.extractSchemas(document);
    
    if (this.options.verbose) {
      console.log(`Found ${Object.keys(schemas).length} schemas to process`);
    }

    // Convert schemas to Go types
    const generatedTypes = this.convertSchemasToGoTypes(schemas);
    
    if (this.options.verbose) {
      console.log(`Generated ${generatedTypes.length} Go types`);
    }

    // Organize types into files
    const files = this.organizeTypesIntoFiles(generatedTypes);
    
    // Ensure output directory exists
    this.ensureDirectoryExists(outputPath);
    
    // Write files
    const writtenFiles = await this.writeFiles(files, outputPath);
    
    // Generate go.mod file
    await this.generateGoMod(outputPath);
    
    // Generate main export file
    await this.generateMainFile(generatedTypes, outputPath);

    return {
      filesGenerated: writtenFiles.length + 2, // +2 for go.mod and main file
      typesGenerated: generatedTypes.length,
      files: writtenFiles.concat(['go.mod', 'main.go'])
    };
  }

  private extractSchemas(document: OpenAPIDocument): Record<string, SchemaObject> {
    const schemas: Record<string, SchemaObject> = {};
    
    // Extract from components/schemas
    if ('components' in document && document.components?.schemas) {
      Object.assign(schemas, document.components.schemas as Record<string, SchemaObject>);
    }
    
    // TODO: Extract from paths (request/response bodies) if needed
    // This would be an enhancement for future versions
    
    return schemas;
  }

  private convertSchemasToGoTypes(schemas: Record<string, SchemaObject>): GeneratedType[] {
    const types: GeneratedType[] = [];
    const processed = new Set<string>();

    for (const [schemaName, schema] of Object.entries(schemas)) {
      if (processed.has(schemaName)) {
        continue;
      }

      try {
        const generatedType = this.convertSchemaToGoType(schemaName, schema, schemas);
        if (generatedType) {
          types.push(generatedType);
          processed.add(schemaName);
        }
      } catch (error) {
        if (this.options.verbose) {
          console.warn(`Failed to convert schema ${schemaName}:`, error);
        }
      }
    }

    return types;
  }

  private convertSchemaToGoType(
    name: string, 
    schema: SchemaObject, 
    allSchemas: Record<string, SchemaObject>
  ): GeneratedType | null {
    const goTypeName = toGoTypeName(name);
    const dependencies: string[] = [];

    // Handle enums
    if (schema.enum) {
      return this.createGoEnum(goTypeName, schema);
    }

    // Handle objects (structs)
    if (schema.type === 'object' || schema.properties) {
      return this.createGoStruct(goTypeName, schema, allSchemas, dependencies);
    }

    // Handle allOf (embedded structs)
    if ('allOf' in schema && schema.allOf) {
      return this.createGoStructFromAllOf(goTypeName, schema as SchemaObject & { allOf: any[] }, allSchemas, dependencies);
    }

    // Handle oneOf/anyOf (interfaces)
    if (('oneOf' in schema && schema.oneOf) || ('anyOf' in schema && schema.anyOf)) {
      return this.createGoInterface(goTypeName, schema);
    }

    // Handle simple type aliases
    const typeMapping = mapOpenAPITypeToGo(schema);
    if (typeMapping.goType !== 'interface{}') {
      return {
        type: 'alias',
        definition: {
          name: goTypeName,
          goType: typeMapping.goType,
          comment: generateComment(schema, goTypeName)
        },
        dependencies,
        category: this.categorizeType(name, schema)
      };
    }

    return null;
  }

  private createGoEnum(name: string, schema: SchemaObject): GeneratedType {
    const typeMapping = mapOpenAPITypeToGo(schema);

    const values = (schema.enum || []).map((value, index) => ({
      name: `${name}${this.formatEnumValue(value)}`,
      value,
      comment: undefined
    }));

    const goEnum: GoEnum = {
      name,
      baseType: typeMapping.goType,
      values,
      comment: generateComment(schema, name)
    };

    const generatedType: GeneratedType = {
      type: 'enum',
      definition: goEnum,
      dependencies: [],
      category: 'enum'
    };

    // Generate decoder if option is enabled
    if (this.options.generateDecoders) {
      generatedType.decoder = this.generateEnumDecoder(name, goEnum);
    }

    return generatedType;
  }

  private createGoStruct(
    name: string, 
    schema: SchemaObject, 
    allSchemas: Record<string, SchemaObject>,
    dependencies: string[]
  ): GeneratedType {
    const fields: GoField[] = [];
    const imports = new Set<string>();
    const required = (schema.required as string[]) || [];

    if (schema.properties) {
      for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
        const field = this.createGoField(
          fieldName, 
          fieldSchema as SchemaObject, 
          required.includes(fieldName),
          allSchemas,
          dependencies
        );
        fields.push(field);
        
        if (field.imports) {
          field.imports.forEach(imp => imports.add(imp));
        }
      }
    }

    const goStruct: GoStruct = {
      name,
      fields,
      comment: generateComment(schema, name),
      imports
    };

    const generatedType: GeneratedType = {
      type: 'struct',
      definition: goStruct,
      dependencies,
      category: this.categorizeType(name, schema)
    };

    // Generate decoder if option is enabled
    if (this.options.generateDecoders) {
      generatedType.decoder = this.generateStructDecoder(name, goStruct, schema, required);
    }

    return generatedType;
  }

  private createGoStructFromAllOf(
    name: string,
    schema: SchemaObject & { allOf: any[] },
    allSchemas: Record<string, SchemaObject>,
    dependencies: string[]
  ): GeneratedType {
    const fields: GoField[] = [];
    const embeddedTypes: string[] = [];
    const imports = new Set<string>();
    const allRequired: string[] = [];

    for (const subSchema of schema.allOf) {
      if ('$ref' in subSchema) {
        // This should be resolved by now, but handle gracefully
        const refName = subSchema.$ref.split('/').pop();
        if (refName) {
          embeddedTypes.push(toGoTypeName(refName));
          dependencies.push(refName);
        }
      } else if (subSchema.properties) {
        const required = (subSchema.required as string[]) || [];
        allRequired.push(...required);

        for (const [fieldName, fieldSchema] of Object.entries(subSchema.properties)) {
          const field = this.createGoField(
            fieldName,
            fieldSchema as SchemaObject,
            required.includes(fieldName),
            allSchemas,
            dependencies
          );
          fields.push(field);

          if (field.imports) {
            field.imports.forEach(imp => imports.add(imp));
          }
        }
      }
    }

    const goStruct: GoStruct = {
      name,
      fields,
      comment: generateComment(schema, name),
      embeddedTypes,
      imports
    };

    const generatedType: GeneratedType = {
      type: 'struct',
      definition: goStruct,
      dependencies,
      category: this.categorizeType(name, schema)
    };

    // Generate decoder if option is enabled
    if (this.options.generateDecoders) {
      generatedType.decoder = this.generateStructDecoder(name, goStruct, schema, allRequired);
    }

    return generatedType;
  }

  private createGoInterface(name: string, schema: SchemaObject): GeneratedType {
    // For now, create a simple interface{}
    // In future versions, this could be more sophisticated
    return {
      type: 'interface',
      definition: {
        name,
        methods: [],
        comment: generateComment(schema, name)
      },
      dependencies: [],
      category: 'common'
    };
  }

  private createGoField(
    name: string, 
    schema: SchemaObject, 
    required: boolean,
    allSchemas: Record<string, SchemaObject>,
    dependencies: string[]
  ): GoField {
    const goFieldName = toGoFieldName(name);
    const typeMapping = mapOpenAPITypeToGo(schema);
    
    // Check if this refers to another schema
    if (schema.type === 'object' && !schema.properties) {
      // This might be a reference to another type
      const potentialTypeName = toGoTypeName(name);
      if (allSchemas[name]) {
        dependencies.push(name);
        typeMapping.goType = potentialTypeName;
      }
    }

    const tags = generateJSONTags(name, schema, required);
    const comment = generateComment(schema);

    return {
      name,
      goName: goFieldName,
      goType: typeMapping.goType,
      comment,
      tags,
      required,
      imports: typeMapping.imports
    };
  }

  private categorizeType(name: string, schema: SchemaObject): GeneratedType['category'] {
    // Simple categorization logic - can be enhanced
    const lowerName = name.toLowerCase();
    
    if (schema.enum) {
      return 'enum';
    }
    
    if (lowerName.includes('request')) {
      return 'request';
    }
    
    if (lowerName.includes('response')) {
      return 'response';
    }
    
    return 'model';
  }

  private organizeTypesIntoFiles(types: GeneratedType[]): GeneratedFile[] {
    switch (this.options.grouping) {
      case 'single':
        return this.organizeSingleFile(types);
      case 'category':
        return this.organizeByCategory(types);
      case 'custom':
        // For now, same as category - can be enhanced
        return this.organizeByCategory(types);
      default:
        return this.organizeByCategory(types);
    }
  }

  private organizeSingleFile(types: GeneratedType[]): GeneratedFile[] {
    const imports = new Set<string>();
    const typeContents: Array<{type: 'struct' | 'enum' | 'interface' | 'alias'; content: string}> = [];

    // Add fmt import if decoders are enabled
    if (this.options.generateDecoders) {
      imports.add('fmt');
    }

    // Add validator import if validation is enabled
    if (this.options.generateValidation && this.options.generateDecoders) {
      imports.add('github.com/go-playground/validator/v10');
    }

    for (const type of types) {
      let content: string;

      switch (type.type) {
        case 'struct':
          const struct = type.definition as GoStruct;
          content = generateStructTemplate(struct);
          struct.imports?.forEach(imp => imports.add(imp));

          // Add decoder function immediately after type definition
          if (type.decoder) {
            content += '\n\n' + generateDecoderTemplate(
              type.decoder.name,
              type.decoder.typeName,
              type.decoder.body
            );
          }
          break;
        case 'enum':
          const enumDef = type.definition as GoEnum;
          content = generateEnumTemplate(enumDef);

          // Add decoder function immediately after enum definition
          if (type.decoder) {
            content += '\n\n' + generateDecoderTemplate(
              type.decoder.name,
              type.decoder.typeName,
              type.decoder.body
            );
          }
          break;
        default:
          continue;
      }

      typeContents.push({ type: type.type as 'struct' | 'enum' | 'interface' | 'alias', content });
    }

    const fileContent = generateGoFile(
      this.options.packageName,
      Array.from(imports),
      typeContents,
      'All generated types'
    );

    return [{
      filename: 'types.go',
      content: fileContent,
      types: types.map(t => t.definition.name)
    }];
  }

  private organizeByCategory(types: GeneratedType[]): GeneratedFile[] {
    const fileMap = new Map<string, {
      types: GeneratedType[],
      imports: Set<string>
    }>();

    // Group types by category
    for (const type of types) {
      const category = type.category;
      const filename = `${category}s.go`; // models.go, enums.go, etc.

      if (!fileMap.has(filename)) {
        fileMap.set(filename, {
          types: [],
          imports: new Set()
        });
      }

      const fileInfo = fileMap.get(filename)!;
      fileInfo.types.push(type);

      // Collect imports
      if ('imports' in type.definition && type.definition.imports) {
        type.definition.imports.forEach((imp: string) => fileInfo.imports.add(imp));
      }

      // Add decoder-related imports
      if (this.options.generateDecoders && type.decoder) {
        fileInfo.imports.add('fmt');
      }
    }

    // Generate files
    const files: GeneratedFile[] = [];

    for (const [filename, fileInfo] of fileMap) {
      const typeContents: Array<{type: 'struct' | 'enum' | 'interface' | 'alias'; content: string}> = [];

      // Add validator import if validation is enabled and file has decoders
      if (this.options.generateValidation && this.options.generateDecoders) {
        const hasDecoders = fileInfo.types.some(t => t.decoder);
        if (hasDecoders) {
          fileInfo.imports.add('github.com/go-playground/validator/v10');
        }
      }

      for (const type of fileInfo.types) {
        let content: string;

        switch (type.type) {
          case 'struct':
            content = generateStructTemplate(type.definition as GoStruct);

            // Add decoder function immediately after type definition
            if (type.decoder) {
              content += '\n\n' + generateDecoderTemplate(
                type.decoder.name,
                type.decoder.typeName,
                type.decoder.body
              );
            }
            break;
          case 'enum':
            content = generateEnumTemplate(type.definition as GoEnum);

            // Add decoder function immediately after enum definition
            if (type.decoder) {
              content += '\n\n' + generateDecoderTemplate(
                type.decoder.name,
                type.decoder.typeName,
                type.decoder.body
              );
            }
            break;
          default:
            continue;
        }

        typeContents.push({ type: type.type as 'struct' | 'enum' | 'interface' | 'alias', content });
      }

      if (typeContents.length > 0) {
        const fileContent = generateGoFile(
          this.options.packageName,
          Array.from(fileInfo.imports),
          typeContents,
          `Generated ${fileInfo.types[0]?.category} types`
        );

        files.push({
          filename,
          content: fileContent,
          types: fileInfo.types.map(t => t.definition.name)
        });
      }
    }

    return files;
  }

  private async writeFiles(files: GeneratedFile[], outputPath: string): Promise<string[]> {
    const writtenFiles: string[] = [];
    
    for (const file of files) {
      const filePath = join(outputPath, file.filename);
      
      try {
        writeFileSync(filePath, file.content, 'utf8');
        writtenFiles.push(file.filename);
        
        if (this.options.verbose) {
          console.log(`Generated ${file.filename} with ${file.types.length} types`);
        }
      } catch (error) {
        throw new Error(`Failed to write ${filePath}: ${error}`);
      }
    }
    
    return writtenFiles;
  }

  private async generateGoMod(outputPath: string): Promise<void> {
    const goModPath = join(outputPath, 'go.mod');

    if (!existsSync(goModPath)) {
      const content = generateGoModTemplate(
        this.options.packageName,
        '1.21',
        this.options.generateValidation && this.options.generateDecoders
      );
      writeFileSync(goModPath, content, 'utf8');

      if (this.options.verbose) {
        console.log('Generated go.mod file');
      }
    }
  }

  private async generateMainFile(types: GeneratedType[], outputPath: string): Promise<void> {
    const mainPath = join(outputPath, 'main.go');
    const exportedTypes = types.map(t => t.definition.name);
    
    const content = generateMainExportTemplate(this.options.packageName, exportedTypes);
    writeFileSync(mainPath, content, 'utf8');
    
    if (this.options.verbose) {
      console.log('Generated main.go export file');
    }
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  private formatEnumValue(value: any): string {
    if (typeof value === 'string') {
      return toGoTypeName(value);
    }
    return String(value).replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Generate decoder function for enum types
   */
  private generateEnumDecoder(name: string, goEnum: GoEnum): GoDecoder {
    const parserName = toParserFunctionName(name);
    const enumValues = goEnum.values.map(v => {
      if (typeof v.value === 'string') {
        return `"${v.value}"`;
      }
      return String(v.value);
    }).join(', ');

    const caseStatements = goEnum.values.map(v => {
      const caseValue = typeof v.value === 'string' ? `"${v.value}"` : String(v.value);
      return `\tcase ${caseValue}:
\t\tvalue := ${name}(str)
\t\treturn &value, nil`;
    }).join('\n');

    const body = `\tstr, ok := raw.(${goEnum.baseType})
\tif !ok {
\t\treturn nil, fmt.Errorf("${parserName}: expected ${goEnum.baseType}, got %T", raw)
\t}

\tswitch str {
${caseStatements}
\tdefault:
\t\treturn nil, fmt.Errorf("${parserName}: invalid value %v, must be one of: ${enumValues}", str)
\t}`;

    return {
      name: parserName,
      typeName: name,
      decoderType: 'enum',
      body,
      dependencies: []
    };
  }

  /**
   * Generate decoder function for struct types
   */
  private generateStructDecoder(
    name: string,
    goStruct: GoStruct,
    schema: SchemaObject,
    requiredFields: string[]
  ): GoDecoder {
    const parserName = toParserFunctionName(name);
    const fieldDecoders: string[] = [];
    const fieldAssignments: string[] = [];
    const dependencies: string[] = [];

    // Generate validation code for each field
    for (const field of goStruct.fields) {
      const isRequired = requiredFields.includes(field.name);
      const jsonKey = field.name;
      const varName = field.goName.charAt(0).toLowerCase() + field.goName.slice(1);

      fieldDecoders.push(this.generateFieldDecoder(field, jsonKey, varName, isRequired, parserName, dependencies));
      fieldAssignments.push(`\t\t${field.goName}: ${varName},`);
    }

    const validationCode = this.options.generateValidation
      ? `\n\tif err := validate.Struct(result); err != nil {
\t\treturn nil, fmt.Errorf("${parserName}: validation failed: %w", err)
\t}`
      : '';

    const body = `\tdata, ok := raw.(map[string]interface{})
\tif !ok {
\t\treturn nil, fmt.Errorf("${parserName}: expected object, got %T", raw)
\t}

${fieldDecoders.join('\n\n')}

\tresult := &${name}{
${fieldAssignments.join('\n')}
\t}${validationCode}

\treturn result, nil`;

    return {
      name: parserName,
      typeName: name,
      decoderType: 'struct',
      body,
      dependencies
    };
  }

  /**
   * Generate decoder code for a single field
   */
  private generateFieldDecoder(
    field: GoField,
    jsonKey: string,
    varName: string,
    isRequired: boolean,
    parserName: string,
    dependencies: string[]
  ): string {
    const fieldName = field.goName;

    if (isRequired) {
      return `\t// Decode required field '${jsonKey}'
\t${varName}Raw, exists := data["${jsonKey}"]
\tif !exists {
\t\treturn nil, fmt.Errorf("${parserName}: missing required field '${jsonKey}'")
\t}
\t${this.generateTypeAssertion(field, varName, `${varName}Raw`, dependencies)}`;
    } else {
      const zeroValue = this.getZeroValue(field.goType);
      return `\t// Decode optional field '${jsonKey}'
\t${varName} := ${zeroValue}
\tif ${varName}Raw, exists := data["${jsonKey}"]; exists && ${varName}Raw != nil {
\t\t${this.generateTypeAssertion(field, varName, `${varName}Raw`, dependencies, '\t')}
\t}`;
    }
  }

  /**
   * Generate type assertion code for a field
   */
  private generateTypeAssertion(
    field: GoField,
    varName: string,
    rawVarName: string,
    dependencies: string[],
    indent: string = ''
  ): string {
    const goType = field.goType;
    // Use = for optional fields (indent present), := for required fields (no indent)
    const assignOp = indent ? '=' : ':=';

    // Handle numbers (JSON unmarshals numbers as float64)
    if (goType === 'int' || goType === 'int32' || goType === 'int64' || goType === 'int8' || goType === 'int16') {
      return `${indent}numVal, ok := ${rawVarName}.(float64)
${indent}if !ok {
${indent}\treturn nil, fmt.Errorf("field '${field.name}': expected number, got %T", ${rawVarName})
${indent}}
${indent}${varName} ${assignOp} ${goType}(numVal)`;
    }

    if (goType === 'uint' || goType === 'uint32' || goType === 'uint64' || goType === 'uint8' || goType === 'uint16') {
      return `${indent}numVal, ok := ${rawVarName}.(float64)
${indent}if !ok {
${indent}\treturn nil, fmt.Errorf("field '${field.name}': expected number, got %T", ${rawVarName})
${indent}}
${indent}${varName} ${assignOp} ${goType}(numVal)`;
    }

    if (goType === 'float32' || goType === 'float64') {
      return `${indent}${varName} ${assignOp === ':=' ? ', ok :=' : '='} ${rawVarName}.(float64)
${indent}if ${assignOp === ':=' ? '!' : ''}ok {
${indent}\treturn nil, fmt.Errorf("field '${field.name}': expected number, got %T", ${rawVarName})
${indent}}`;
    }

    // Handle strings
    if (goType === 'string') {
      return `${indent}${varName} ${assignOp === ':=' ? ', ok :=' : '='} ${rawVarName}.(string)
${indent}if ${assignOp === ':=' ? '!' : ''}ok {
${indent}\treturn nil, fmt.Errorf("field '${field.name}': expected string, got %T", ${rawVarName})
${indent}}`;
    }

    // Handle booleans
    if (goType === 'bool') {
      return `${indent}${varName} ${assignOp === ':=' ? ', ok :=' : '='} ${rawVarName}.(bool)
${indent}if ${assignOp === ':=' ? '!' : ''}ok {
${indent}\treturn nil, fmt.Errorf("field '${field.name}': expected boolean, got %T", ${rawVarName})
${indent}}`;
    }

    // Handle arrays
    if (goType.startsWith('[]')) {
      const elemType = goType.substring(2);
      return `${indent}${varName}Arr, ok := ${rawVarName}.([]interface{})
${indent}if !ok {
${indent}\treturn nil, fmt.Errorf("field '${field.name}': expected array, got %T", ${rawVarName})
${indent}}
${indent}${varName} ${assignOp} make(${goType}, len(${varName}Arr))
${indent}// TODO: Parse array elements`;
    }

    // Default: interface{}
    return `${indent}${varName} ${assignOp} ${rawVarName}`;
  }

  /**
   * Get zero value for a Go type
   */
  private getZeroValue(goType: string): string {
    if (goType.includes('int') || goType.includes('float') || goType.includes('uint')) {
      return '0';
    }
    if (goType === 'string') {
      return '""';
    }
    if (goType === 'bool') {
      return 'false';
    }
    if (goType.startsWith('[]')) {
      return 'nil';
    }
    if (goType.startsWith('map[')) {
      return 'nil';
    }
    return 'nil';
  }
}
