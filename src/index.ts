export { OpenAPIParser, OpenAPIDocument, ParseOptions } from './parser/openapi-parser';
export { GoGenerator, GeneratorOptions, GenerationResult } from './generator/go-generator';
export { ReferenceResolver, ResolverOptions } from './resolver/reference-resolver';
export {
  SchemaObject,
  GeneratedType,
  GoStruct,
  GoEnum,
  GoField,
  GoInterface,
  GoType,
  GoDecoder,
  toGoTypeName,
  toGoFieldName,
  toParserFunctionName,
  mapOpenAPITypeToGo,
  generateJSONTags,
  generateComment
} from './utils/go-types';
export {
  generateGoFile,
  generateStructTemplate,
  generateEnumTemplate,
  generateGoModTemplate,
  generateMainExportTemplate,
  generateDecoderTemplate,
  generateDecoderHelpersTemplate,
  formatGoCode
} from './templates/go-templates';

export {
  CircularReferenceError,
  MaxDepthExceededError,
  UnresolvedReferenceError,
  ParseError
} from './errors';

// Re-export CLI for programmatic usage
export { program } from './cli';
