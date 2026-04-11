# Decoder Design Documentation

This document provides comprehensive details about the design, implementation, and rationale behind the runtime decoder generation feature.

## Table of Contents

1. [Motivation](#motivation)
2. [Design Decisions](#design-decisions)
3. [Implementation Details](#implementation-details)
4. [Validation Integration](#validation-integration)
5. [Generated Code Patterns](#generated-code-patterns)
6. [Limitations and Future Work](#limitations-and-future-work)

## Motivation

### The Problem: Type-Unsafe JSON Unmarshaling

When working with JSON in Go, the standard approach using `json.Unmarshal` with `interface{}` is error-prone:

```go
// Common pattern - unsafe and verbose
var raw interface{}
json.Unmarshal(data, &raw)

// Manual type assertions - can panic!
userMap := raw.(map[string]interface{})
name := userMap["name"].(string)
age := int(userMap["age"].(float64))  // JSON numbers are always float64
```

**Problems with this approach:**

1. **Runtime panics**: Type assertions can panic if the data doesn't match expectations
2. **Repetitive code**: Same type assertion logic repeated everywhere
3. **No validation**: Missing required fields or invalid values are silently ignored
4. **Error-prone**: Easy to forget that JSON numbers are `float64`, not `int`
5. **Maintenance burden**: Changes to the schema require updating all parsing code

### The Solution: Generated Decoders

Decoders provide **type-safe parsing** with **comprehensive error handling**:

```go
// Generated decoder - safe and clean
var raw interface{}
json.Unmarshal(data, &raw)

user, err := parseUser(raw)
if err != nil {
    // Descriptive error with context
    log.Printf("Invalid user data: %v", err)
    return
}
// user is guaranteed to be a valid *User
```

**Benefits:**

1. **Type safety**: No panics - all errors are returned
2. **Validation**: Required fields, type checking, constraint validation
3. **Consistency**: Same parsing logic everywhere
4. **Maintainability**: Schema changes regenerate correct parsing code
5. **Error context**: Detailed error messages for debugging

## Design Decisions

### 1. Why `interface{}` Input?

**Decision**: Decoders accept `interface{}`, not `[]byte`

**Rationale**:

The `interface{}` input allows decoders to work with **already-unmarshaled** JSON data:

```go
// Use case: Generic JSON handling
var raw interface{}
json.Unmarshal(jsonBytes, &raw)

// Now parse specific types
user, err := parseUser(raw)
product, err := parseProduct(raw)
```

**Alternative considered**: Accepting `[]byte` and calling `json.Unmarshal` internally

**Why rejected**:
- Redundant unmarshaling if data is already parsed
- Doesn't work with non-JSON sources (e.g., database JSONB columns)
- Less flexible for middleware that pre-processes JSON

**Trade-off**: Users must call `json.Unmarshal` first, but this provides more flexibility.

### 2. Why `(*Type, error)` Return Signature?

**Decision**: Return pointer to type and error

**Rationale**:

```go
func parseUser(raw interface{}) (*User, error)
```

**Benefits:**
- **Idiomatic Go**: Follows Go's error handling patterns
- **Nil safety**: Can return `nil` on error
- **Pointer consistency**: Matches how Go typically handles structs
- **Memory efficiency**: Avoids copying large structs

**Alternative considered**: Return `(Type, error)` with value

**Why rejected**:
- Would require zero-value returns on error
- Less clear when error occurs (is the zero value valid?)
- Inconsistent with Go standard library patterns

### 3. Naming Convention: `parse<TypeName>`

**Decision**: Decoder functions named `parse<TypeName>`

**Rationale**:

```go
func parseUser(raw interface{}) (*User, error)
func parseCategory(raw interface{}) (*Category, error)
```

**Benefits:**
- **Clear intent**: "parse" indicates conversion from raw data
- **Avoids conflicts**: Doesn't collide with constructor names (`NewUser`)
- **Consistent**: Same pattern across all types
- **Lowercase**: Unexported by default (users can export if needed)

**Alternative considered**: `Decode<TypeName>`, `Unmarshal<TypeName>`

**Why rejected**:
- "Decode" suggests base64/binary decoding
- "Unmarshal" suggests JSON-specific (but input is `interface{}`)

## Implementation Details

### Enum Decoder Generation

Enums use a **switch-case** pattern for validation:

#### Input Schema

```yaml
Category:
  type: string
  enum:
    - electronics
    - clothing
    - books
```

#### Generated Code

```go
type Category string

const (
    CategoryElectronics Category = "electronics"
    CategoryClothing    Category = "clothing"
    CategoryBooks       Category = "books"
)

func parseCategory(raw interface{}) (*Category, error) {
    // Step 1: Type assertion to string
    str, ok := raw.(string)
    if !ok {
        return nil, fmt.Errorf("parseCategory: expected string, got %T", raw)
    }

    // Step 2: Validate against enum values
    switch str {
    case "electronics":
        value := Category(str)
        return &value, nil
    case "clothing":
        value := Category(str)
        return &value, nil
    case "books":
        value := Category(str)
        return &value, nil
    default:
        return nil, fmt.Errorf(
            "parseCategory: invalid value %v, must be one of: electronics, clothing, books",
            str,
        )
    }
}
```

**Key Points:**

1. **Type assertion first**: Ensures input is a string
2. **Exhaustive validation**: Only valid enum values accepted
3. **Descriptive errors**: Lists all valid options
4. **Variable shadowing avoidance**: Creates `value` variable in each case

### Struct Decoder Generation

Structs use **field-by-field parsing** with type checking:

#### Input Schema

```yaml
CreateUserRequest:
  type: object
  required:
    - name
    - email
  properties:
    name:
      type: string
      minLength: 1
      maxLength: 100
    email:
      type: string
      format: email
    age:
      type: integer
      minimum: 0
      maximum: 150
```

#### Generated Code

```go
type CreateUserRequest struct {
    Name  string `json:"name" validate:"min=1,max=100"`
    Email string `json:"email"`
    Age   uint8  `json:"age,omitempty" validate:"min=0,max=150"`
}

func parseCreateUserRequest(raw interface{}) (*CreateUserRequest, error) {
    // Step 1: Type assertion to object
    data, ok := raw.(map[string]interface{})
    if !ok {
        return nil, fmt.Errorf("parseCreateUserRequest: expected object, got %T", raw)
    }

    // Step 2: Decode required field 'name'
    nameRaw, exists := data["name"]
    if !exists {
        return nil, fmt.Errorf("parseCreateUserRequest: missing required field 'name'")
    }
    name, ok := nameRaw.(string)
    if !ok {
        return nil, fmt.Errorf("field 'name': expected string, got %T", nameRaw)
    }

    // Step 3: Decode required field 'email'
    emailRaw, exists := data["email"]
    if !exists {
        return nil, fmt.Errorf("parseCreateUserRequest: missing required field 'email'")
    }
    email, ok := emailRaw.(string)
    if !ok {
        return nil, fmt.Errorf("field 'email': expected string, got %T", emailRaw)
    }

    // Step 4: Decode optional field 'age'
    age := uint8(0)  // Default zero value
    if ageRaw, exists := data["age"]; exists && ageRaw != nil {
        // JSON numbers are float64
        numVal, ok := ageRaw.(float64)
        if !ok {
            return nil, fmt.Errorf("field 'age': expected number, got %T", ageRaw)
        }
        age = uint8(numVal)
    }

    // Step 5: Construct result
    result := &CreateUserRequest{
        Name:  name,
        Email: email,
        Age:   age,
    }

    // Step 6: Validate (if enabled)
    if err := validate.Struct(result); err != nil {
        return nil, fmt.Errorf("parseCreateUserRequest: validation failed: %w", err)
    }

    return result, nil
}
```

**Key Points:**

1. **Object type assertion**: Ensures input is a map
2. **Required field checking**: Explicitly checks `exists` before type assertion
3. **Optional field handling**: Uses zero values as defaults
4. **JSON number handling**: Always asserts to `float64` first, then converts
5. **Variable naming**: Avoids shadowing with unique variable names

### Type Assertion Handling for JSON Numbers

JSON numbers are **always** unmarshaled as `float64` in Go:

```go
// WRONG - will fail
age := data["age"].(int)  // panic: interface conversion

// CORRECT - assert to float64 first
ageFloat := data["age"].(float64)
age := int(ageFloat)
```

**Generated code always:**
1. Asserts to `float64` for any numeric field
2. Converts to target type (`int`, `uint8`, `int64`, etc.)
3. Provides clear error if assertion fails

### Variable Shadowing Avoidance

Go doesn't allow redeclaring variables in the same scope:

```go
// BAD - won't compile
str, ok := data["name"].(string)
str, ok := data["email"].(string)  // ERROR: no new variables on left side

// GOOD - unique names
nameStr, ok := data["name"].(string)
emailStr, ok := data["email"].(string)
```

**Generated code:**
- Uses `<fieldName>Raw` for raw value from map
- Uses `<fieldName>` for typed value after assertion
- Never reuses variable names

### Optional vs Required Fields

#### Required Fields

```go
// Must exist
nameRaw, exists := data["name"]
if !exists {
    return nil, fmt.Errorf("missing required field 'name'")
}
name, ok := nameRaw.(string)
if !ok {
    return nil, fmt.Errorf("field 'name': expected string, got %T", nameRaw)
}
```

#### Optional Fields

```go
// Use zero value if missing
age := uint8(0)
if ageRaw, exists := data["age"]; exists && ageRaw != nil {
    numVal, ok := ageRaw.(float64)
    if !ok {
        return nil, fmt.Errorf("field 'age': expected number, got %T", ageRaw)
    }
    age = uint8(numVal)
}
```

**Key difference**: Optional fields check `exists && != nil` before attempting conversion.

## Validation Integration

### go-playground/validator

When `--generate-validation` is enabled, decoders integrate with go-playground/validator:

#### Generated Dependencies

```go
import (
    "fmt"
    "github.com/go-playground/validator/v10"
)

var validate = validator.New()
```

#### Validation Execution

```go
result := &User{
    Name:  name,
    Email: email,
    Age:   age,
}

// Validate struct based on tags
if err := validate.Struct(result); err != nil {
    return nil, fmt.Errorf("parseUser: validation failed: %w", err)
}

return result, nil
```

#### Validation Tags

Tags are generated from OpenAPI constraints:

| OpenAPI Constraint | Validation Tag |
|-------------------|----------------|
| `minLength: 5` | `validate:"min=5"` |
| `maxLength: 100` | `validate:"max=100"` |
| `minimum: 0` | `validate:"min=0"` |
| `maximum: 150` | `validate:"max=150"` |
| `pattern: "^[a-z]+$"` | `validate:"regexp=^[a-z]+$"` |
| `format: email` | `validate:"email"` |

### go.mod Dependency Injection

When validation is enabled, a `require` directive is added to `go.mod`:

```go
module generatedtypes

go 1.20

require github.com/go-playground/validator/v10 v10.16.0
```

## Generated Code Patterns

### File Organization

Decoders are generated in the same file as their types:

```
output/
├── enums.go
│   ├── type Category string
│   ├── const (...)
│   └── func parseCategory(...)
├── models.go
│   ├── type User struct
│   └── func parseUser(...)
└── requests.go
    ├── type CreateUserRequest struct
    └── func parseCreateUserRequest(...)
```

### Error Message Format

All errors follow consistent patterns:

```go
// Top-level type mismatch
"parseUser: expected object, got []interface{}"

// Missing required field
"parseUser: missing required field 'name'"

// Field type mismatch
"field 'age': expected number, got string"

// Validation failure
"parseUser: validation failed: Name failed on 'max' tag"

// Enum validation
"parseCategory: invalid value 'invalid', must be one of: electronics, clothing, books"
```

### Code Comments

Generated decoders include documentation:

```go
// parseUser validates and constructs User from raw input
func parseUser(raw interface{}) (*User, error) {
    // Implementation
}
```

## Limitations and Future Work

### Current Limitations

1. **Array Element Parsing**

   **Current**: Arrays are type-asserted but elements aren't individually parsed
   ```go
   tags := data["tags"].([]interface{})  // Elements not validated
   ```

   **Future**: Recursive parsing for array elements
   ```go
   tags := make([]string, len(tagsRaw))
   for i, elem := range tagsRaw {
       tag, err := parseElement(elem)  // Validate each element
       if err != nil {
           return nil, fmt.Errorf("tags[%d]: %w", i, err)
       }
       tags[i] = tag
   }
   ```

2. **Complex Nested Types**

   **Current**: Nested objects are parsed but not recursively validated

   **Future**: Generate parsers for nested inline objects

3. **Polymorphism**

   **Current**: `oneOf`/`anyOf` generate `interface{}`

   **Future**: Discriminated union parsing with type detection

4. **Custom Formats**

   **Current**: Only standard formats (email, date-time) validated

   **Future**: Support custom format validators

5. **Cyclical References**

   **Current**: May generate infinite recursion for cyclical schemas

   **Future**: Detect and handle cycles with lazy parsing

### Planned Improvements

1. **Array Element Decoders**
   ```go
   func parseUserArray(raw interface{}) ([]User, error) {
       arr, ok := raw.([]interface{})
       if !ok {
           return nil, fmt.Errorf("expected array, got %T", raw)
       }

       result := make([]User, len(arr))
       for i, elem := range arr {
           user, err := parseUser(elem)
           if err != nil {
               return nil, fmt.Errorf("element %d: %w", i, err)
           }
           result[i] = *user
       }
       return result, nil
   }
   ```

2. **Map Value Decoders**
   ```go
   func parseUserMap(raw interface{}) (map[string]User, error) {
       // Similar to array parsing
   }
   ```

3. **Nested Object Parsers**
   ```go
   // For nested inline objects
   func parseUserAddress(raw interface{}) (*Address, error) {
       // Generated for inline address object in User
   }
   ```

4. **Discriminated Union Support**
   ```yaml
   Pet:
     oneOf:
       - $ref: '#/components/schemas/Cat'
       - $ref: '#/components/schemas/Dog'
     discriminator:
       propertyName: petType
   ```

   ```go
   func parsePet(raw interface{}) (Pet, error) {
       data, ok := raw.(map[string]interface{})
       if !ok {
           return nil, fmt.Errorf("expected object, got %T", raw)
       }

       petType, ok := data["petType"].(string)
       if !ok {
           return nil, fmt.Errorf("missing discriminator 'petType'")
       }

       switch petType {
       case "cat":
           return parseCat(raw)
       case "dog":
           return parseDog(raw)
       default:
           return nil, fmt.Errorf("unknown petType: %v", petType)
       }
   }
   ```

## Best Practices

### Using Decoders

1. **Always check errors**
   ```go
   user, err := parseUser(raw)
   if err != nil {
       log.Printf("Failed to parse user: %v", err)
       return nil, err
   }
   ```

2. **Validate early**
   ```go
   // Parse and validate at API boundary
   func handleRequest(w http.ResponseWriter, r *http.Request) {
       var raw interface{}
       json.NewDecoder(r.Body).Decode(&raw)

       user, err := parseUser(raw)
       if err != nil {
           http.Error(w, err.Error(), http.StatusBadRequest)
           return
       }

       // Now user is guaranteed valid
       processUser(user)
   }
   ```

3. **Leverage type safety**
   ```go
   // Don't mix manual assertions with decoders
   // BAD
   user, _ := parseUser(raw)
   age := user.Age.(int)  // NO! Age is already typed

   // GOOD
   user, err := parseUser(raw)
   if err != nil {
       return err
   }
   age := user.Age  // Already the correct type
   ```

## Related Documentation

- [README.md](../README.md) - User guide with decoder examples
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall system architecture
- [API.md](./API.md) - Programmatic API reference
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup and contributing
