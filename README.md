# Go Type Generator

A powerful npm package that generates Go types from OpenAPI 3.0/3.1 specifications.

## Features

✅ **OpenAPI 3.0 & 3.1 Support** - Full compatibility with both versions
✅ **Standard Compliance** - Follows OpenAPI specification strictly
✅ **Go Best Practices** - Generates idiomatic Go code with proper naming conventions
✅ **Reference Resolution** - Handles `$ref` references across multiple files
✅ **Multiple Output Formats** - Single file or categorized file organization
✅ **Type Safety** - Converts OpenAPI types to appropriate Go types
✅ **Runtime Decoders** - Type-safe parsing functions for unmarshaled data
✅ **Validation Support** - OpenAPI constraint validation with go-playground/validator
✅ **Validation Tags** - Generates struct tags for validation libraries
✅ **CLI Tool** - Easy command-line interface
✅ **Programmatic API** - Use as a library in your Node.js applications  

## Installation

### Production Use

```bash
# Install globally
npm install -g go-type-generator

# Or install locally
npm install go-type-generator
```

### Local Development

For local development and testing:

```bash
# Clone the repository
git clone <repository-url>
cd go-type-generator

# Install dependencies
pnpm install

# Build the project
npm run build

# Link globally for local testing
npm link

# Now you can use the CLI anywhere
go-type-gen --help

# To unlink when done
npm unlink -g go-type-generator
```

## Quick Start

### CLI Usage

```bash
# Basic usage
go-type-gen openapi.yaml ./output

# With options
go-type-gen openapi.yaml ./output \
  --package-name myapi \
  --grouping category \
  --verbose
```

### Programmatic Usage

```javascript
import { OpenAPIParser, GoGenerator } from 'go-type-generator';

async function generateTypes() {
  const parser = new OpenAPIParser({ verbose: true });
  const document = await parser.parse('./openapi.yaml');
  
  const generator = new GoGenerator({
    packageName: 'myapi',
    grouping: 'category',
    verbose: true
  });
  
  const result = await generator.generate(document, './output');
  console.log(`Generated ${result.typesGenerated} types in ${result.filesGenerated} files`);
}
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `<input>` | OpenAPI specification file path (YAML or JSON) | Required |
| `<output>` | Output directory for generated Go files | Required |
| `-p, --package-name` | Go package name | Derived from output directory |
| `-g, --grouping` | File organization strategy (`category`, `single`, `custom`) | `category` |
| `-v, --verbose` | Enable verbose logging | `false` |
| `-f, --format` | Input format (`yaml`, `json`, `auto`) | `auto` |
| `--version` | OpenAPI version (`3.0`, `3.1`, `auto`) | `auto` |
| `--generate-decoders` | Generate runtime decoder functions | `true` |
| `--no-generate-decoders` | Disable decoder generation | - |
| `--generate-validation` | Enable go-playground/validator validation | `false` |

## File Organization

### Category Grouping (Default)

Types are organized by their purpose:

```
output/
├── models.go      # Data models (User, Product, etc.)
├── enums.go       # Enumeration types (Status, Category, etc.)
├── requests.go    # Request objects (*Request types)
├── responses.go   # Response objects (*Response types)
├── go.mod         # Go module file
└── main.go        # Exports all types
```

### Single File

All types in one file:

```
output/
├── types.go       # All generated types
├── go.mod         # Go module file
└── main.go        # Exports all types
```

## Type Mapping

| OpenAPI Type | Go Type | Notes |
|--------------|---------|-------|
| `string` | `string` | |
| `string` (date) | `time.Time` | Imports time package |
| `string` (date-time) | `time.Time` | Imports time package |
| `string` (enum) | Custom type | Generated with constants |
| `integer` | `int`, `int32`, `int64` | Based on format and constraints |
| `integer` (int32) | `int32` | |
| `integer` (int64) | `int64` | |
| `number` | `float64`, `float32` | Based on format |
| `boolean` | `bool` | |
| `array` | `[]Type` | |
| `object` | `struct{}` | Generated as named struct |
| `object` (additionalProperties) | `map[string]interface{}` | Or typed map |
| `allOf` | Embedded structs | Fields merged |
| `oneOf`/`anyOf` | `interface{}` | Future: Union types |

## Generated Features

### Struct Tags

```go
type User struct {
    ID    int64  `json:"id"`
    Name  string `json:"name" validate:"min=1,max=100"`
    Email string `json:"email,omitempty"`
}
```

### Enums with Constants

```go
type Status string

const (
    StatusActive   Status = "active"
    StatusInactive Status = "inactive"
)
```

### Validation Tags

Generates validation tags for popular Go validation libraries:

- `validate:"min=X"` for minimum values
- `validate:"max=X"` for maximum values  
- `validate:"regexp=pattern"` for pattern validation

### Comments

Preserves OpenAPI descriptions as Go comments:

```go
// User represents a user in the system
type User struct {
    // ID is the unique identifier for the user
    ID int64 `json:"id"`
}
```

## Decoder Functions

The generator creates runtime decoder functions that provide type-safe parsing of unmarshaled JSON data. This is particularly useful when working with `interface{}` values from `json.Unmarshal`.

### Why Decoders?

When unmarshaling JSON in Go, you typically get `interface{}` values which require manual type assertions:

```go
// Without decoders - error-prone manual type assertions
var raw interface{}
json.Unmarshal(data, &raw)

userMap := raw.(map[string]interface{})  // Panic if wrong type!
name := userMap["name"].(string)         // Panic if wrong type!
age := int(userMap["age"].(float64))     // JSON numbers are float64
```

Decoders solve this by providing **type-safe parsing** with proper error handling:

```go
// With decoders - type-safe with error handling
var raw interface{}
json.Unmarshal(data, &raw)

user, err := parseUser(raw)
if err != nil {
    // Handle validation errors gracefully
    log.Printf("Invalid user data: %v", err)
    return
}
// user is guaranteed to be valid *User
```

### Generated Decoder Functions

For each type, the generator creates a `parse<TypeName>` function:

#### Enum Decoders

```go
// Generated for enum types
func parseCategory(raw interface{}) (*Category, error) {
    str, ok := raw.(string)
    if !ok {
        return nil, fmt.Errorf("parseCategory: expected string, got %T", raw)
    }

    switch str {
    case "electronics":
        value := Category(str)
        return &value, nil
    case "clothing":
        value := Category(str)
        return &value, nil
    // ... other cases
    default:
        return nil, fmt.Errorf("parseCategory: invalid value %v", str)
    }
}
```

#### Struct Decoders

```go
// Generated for struct types
func parseUser(raw interface{}) (*User, error) {
    data, ok := raw.(map[string]interface{})
    if !ok {
        return nil, fmt.Errorf("parseUser: expected object, got %T", raw)
    }

    // Decode required field 'name'
    nameRaw, exists := data["name"]
    if !exists {
        return nil, fmt.Errorf("parseUser: missing required field 'name'")
    }
    name, ok := nameRaw.(string)
    if !ok {
        return nil, fmt.Errorf("field 'name': expected string, got %T", nameRaw)
    }

    // Decode optional field 'age'
    age := 0
    if ageRaw, exists := data["age"]; exists && ageRaw != nil {
        numVal, ok := ageRaw.(float64)  // JSON numbers are float64
        if !ok {
            return nil, fmt.Errorf("field 'age': expected number, got %T", ageRaw)
        }
        age = uint8(numVal)
    }

    result := &User{
        Name: name,
        Age:  age,
    }

    // Optional: validate with go-playground/validator
    if err := validate.Struct(result); err != nil {
        return nil, fmt.Errorf("parseUser: validation failed: %w", err)
    }

    return result, nil
}
```

### Usage Examples

#### Basic Usage with JSON

```go
import (
    "encoding/json"
    "log"
)

func handleRequest(jsonData []byte) {
    // Unmarshal to interface{}
    var raw interface{}
    if err := json.Unmarshal(jsonData, &raw); err != nil {
        log.Fatal(err)
    }

    // Parse with type safety
    user, err := parseUser(raw)
    if err != nil {
        log.Printf("Invalid user data: %v", err)
        return
    }

    // user is guaranteed to be valid *User
    fmt.Printf("User: %s, Age: %d\n", user.Name, user.Age)
}
```

#### With Validation

When using `--generate-validation`, decoders automatically validate OpenAPI constraints:

```bash
go-type-gen openapi.yaml ./output --generate-validation
```

```go
// In your OpenAPI spec
CreateUserRequest:
  properties:
    name:
      type: string
      minLength: 1
      maxLength: 100
    age:
      type: integer
      minimum: 0
      maximum: 150

// Generated decoder validates constraints
user, err := parseCreateUserRequest(raw)
if err != nil {
    // err will contain validation errors if:
    // - name is empty or > 100 chars
    // - age is < 0 or > 150
    log.Printf("Validation failed: %v", err)
}
```

### Decoder Options

```bash
# Enable decoders (default)
go-type-gen openapi.yaml ./output --generate-decoders

# Disable decoders
go-type-gen openapi.yaml ./output --no-generate-decoders

# Enable validation in decoders
go-type-gen openapi.yaml ./output --generate-validation
```

### Error Handling

Decoders provide detailed error messages:

```go
user, err := parseUser(raw)
// Possible errors:
// - "parseUser: expected object, got []interface{}"
// - "parseUser: missing required field 'name'"
// - "field 'age': expected number, got string"
// - "parseUser: validation failed: Name failed on 'max' tag"
```

## Examples

### Basic OpenAPI Schema

```yaml
openapi: 3.0.3
info:
  title: My API
  version: 1.0.0

components:
  schemas:
    User:
      type: object
      required: [id, name]
      properties:
        id:
          type: integer
          format: int64
        name:
          type: string
          minLength: 1
          maxLength: 100
        email:
          type: string
          format: email
```

### Generated Go Code

```go
// Code generated by go-type-generator. DO NOT EDIT.

package myapi

// User represents a user
type User struct {
    ID    int64  `json:"id"`
    Name  string `json:"name" validate:"min=1,max=100"`
    Email string `json:"email,omitempty"`
}
```

## API Reference

### OpenAPIParser

```javascript
const parser = new OpenAPIParser({
  verbose: false,      // Enable verbose logging
  format: 'auto',      // Input format: 'yaml', 'json', 'auto'
  version: 'auto'      // OpenAPI version: '3.0', '3.1', 'auto'
});

const document = await parser.parse('/path/to/openapi.yaml');
```

### GoGenerator

```javascript
const generator = new GoGenerator({
  packageName: 'myapi',           // Go package name
  grouping: 'category',           // File organization
  verbose: false,                 // Verbose logging
  generateDecoders: true,         // Generate runtime decoder functions
  generateValidation: false,      // Enable validation in decoders
  generateConstructors: false,    // Generate New* functions (future)
  generateStringMethods: false    // Generate String methods (future)
});

const result = await generator.generate(document, '/output/path');
```

## Advanced Usage

### Custom Type Mapping

The generator intelligently maps OpenAPI constraints to appropriate Go types:

```yaml
# OpenAPI
age:
  type: integer
  minimum: 0
  maximum: 150

# Generated Go
Age uint8 `json:"age,omitempty" validate:"min=0,max=150"`
```

### Reference Resolution

Automatically resolves `$ref` references:

```yaml
# main.yaml
User:
  $ref: './user.yaml#/User'

# user.yaml  
User:
  type: object
  properties:
    name:
      type: string
```

### AllOf Composition

Handles `allOf` by merging properties:

```yaml
UserResponse:
  allOf:
    - $ref: '#/components/schemas/User'
    - type: object
      properties:
        profileUrl:
          type: string
```

## Contributing

Contributions are welcome! Please see our [Contributing Guidelines](./docs/CONTRIBUTING.md) for details on:

- Code of conduct
- How to report bugs
- How to suggest features
- Pull request process
- Development setup (see [Development Guide](./docs/DEVELOPMENT.md))

For technical details about the project architecture, see:
- [Architecture Documentation](./docs/ARCHITECTURE.md)
- [Decoder Design](./docs/DECODER_DESIGN.md)
- [API Reference](./docs/API.md)

## License

ISC License

## Support

- [GitHub Issues](https://github.com/your-username/go-type-generator/issues)
- [Documentation](https://github.com/your-username/go-type-generator/wiki)
