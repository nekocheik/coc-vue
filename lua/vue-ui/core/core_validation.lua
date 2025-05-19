--- Core Validation Module for Vue UI Components
-- @module core_validation
-- @author Cheik Kone
-- @license MIT
-- @copyright Cheik Kone 2025
--
-- This module provides validation utilities for component configuration,
-- data validation, and error handling. It includes functions for type checking,
-- value validation, schema validation, and assertion helpers.
--
-- Usage:
--   local validation = require('vue-ui.core.core_validation')
--   validation.validate_not_empty(value, "Value cannot be empty")
--   validation.validate_table(config, "Config must be a table")
--   local is_valid, errors = validation.validate_schema(data, schema)

local M = {}

--- Checks if a value is nil or empty
-- @param value any The value to check
-- @return boolean True if the value is nil or empty, false otherwise
function M.is_empty(value)
  if value == nil then
    return true
  end
  
  if type(value) == "string" then
    return value == ""
  end
  
  if type(value) == "table" then
    return next(value) == nil
  end
  
  return false
end

--- Validates that a value is not empty, throws an error if it is
-- @param value any The value to validate
-- @param error_message string The error message to throw if validation fails
-- @return any The validated value
-- @throws Error if the value is empty
function M.validate_not_empty(value, error_message)
  if M.is_empty(value) then
    error(error_message or "Value cannot be empty", 2)
  end
  return value
end

--- Validates that a value is a table, throws an error if it is not
-- @param value any The value to validate
-- @param error_message string The error message to throw if validation fails
-- @return table The validated table
-- @throws Error if the value is not a table
function M.validate_table(value, error_message)
  if type(value) ~= "table" then
    error(error_message or "Value must be a table", 2)
  end
  return value
end

--- Validates that a value is a table or nil, throws an error if it is not
-- @param value any The value to validate
-- @param error_message string The error message to throw if validation fails
-- @return table|nil The validated table or nil
-- @throws Error if the value is not a table or nil
function M.validate_table_optional(value, error_message)
  if value ~= nil and type(value) ~= "table" then
    error(error_message or "Value must be a table or nil", 2)
  end
  return value
end

--- Checks if a value is of the specified type
-- @param value any The value to check
-- @param expected_type string The expected type ("string", "number", "boolean", "table", "function", "array", "object")
-- @return boolean True if the value is of the expected type, false otherwise
function M.is_type(value, expected_type)
  if expected_type == "array" then
    return type(value) == "table" and M.is_array(value)
  end
  
  if expected_type == "object" then
    return type(value) == "table" and not M.is_array(value) and next(value) ~= nil
  end
  
  return type(value) == expected_type
end

--- Checks if a table is an array (sequential numeric keys)
-- @param t any The value to check
-- @return boolean True if the value is an array, false otherwise
function M.is_array(t)
  if type(t) ~= "table" then
    return false
  end
  
  -- Empty tables are considered arrays
  if next(t) == nil then
    return true
  end
  
  local count = 0
  for _ in pairs(t) do
    count = count + 1
    if t[count] == nil then
      return false
    end
  end
  
  return count > 0
end

--- Checks if a value is one of the specified values
-- @param value any The value to check
-- @param values table Array of allowed values
-- @return boolean True if the value is in the allowed values, false otherwise
function M.is_one_of(value, values)
  for _, v in ipairs(values) do
    if value == v then
      return true
    end
  end
  
  return false
end

--- Validates that a value is one of the specified values, throws an error if it is not
-- @param value any The value to validate
-- @param values table Array of allowed values
-- @param error_message string The error message to throw if validation fails
-- @return any The validated value
-- @throws Error if the value is not one of the specified values
function M.validate_one_of(value, values, error_message)
  if not M.is_one_of(value, values) then
    error(error_message or "Value must be one of: " .. table.concat(values, ", "), 2)
  end
  return value
end

--- Checks if a value is a number
-- @param value any The value to check
-- @return boolean True if the value is a number, false otherwise
function M.is_number(value)
  return type(value) == "number"
end

--- Validates that a value is a number, throws an error if it is not
-- @param value any The value to validate
-- @param error_message string The error message to throw if validation fails
-- @return number The validated number
-- @throws Error if the value is not a number
function M.validate_number(value, error_message)
  if not M.is_number(value) then
    error(error_message or "Value must be a number", 2)
  end
  return value
end

--- Checks if a value is an integer
-- @param value any The value to check
-- @return boolean True if the value is an integer, false otherwise
function M.is_integer(value)
  return type(value) == "number" and math.floor(value) == value
end

--- Validates that a value is an integer, throws an error if it is not
-- @param value any The value to validate
-- @param error_message string The error message to throw if validation fails
-- @return number The validated integer
-- @throws Error if the value is not an integer
function M.validate_integer(value, error_message)
  if not M.is_integer(value) then
    error(error_message or "Value must be an integer", 2)
  end
  return value
end

--- Checks if a value is a positive number
-- @param value any The value to check
-- @return boolean True if the value is a positive number, false otherwise
function M.is_positive(value)
  return type(value) == "number" and value > 0
end

--- Validates that a value is a positive number, throws an error if it is not
-- @param value any The value to validate
-- @param error_message string The error message to throw if validation fails
-- @return number The validated positive number
-- @throws Error if the value is not a positive number
function M.validate_positive(value, error_message)
  if not M.is_positive(value) then
    error(error_message or "Value must be a positive number", 2)
  end
  return value
end

--- Checks if a value is a negative number
-- @param value any The value to check
-- @return boolean True if the value is a negative number, false otherwise
function M.is_negative(value)
  return type(value) == "number" and value < 0
end

--- Checks if a value is between min and max (inclusive)
-- @param value any The value to check
-- @param min number The minimum allowed value
-- @param max number The maximum allowed value
-- @return boolean True if the value is between min and max, false otherwise
function M.is_between(value, min, max)
  return type(value) == "number" and value >= min and value <= max
end

--- Validates that a value is between min and max (inclusive), throws an error if it is not
-- @param value any The value to validate
-- @param min number The minimum allowed value
-- @param max number The maximum allowed value
-- @param error_message string The error message to throw if validation fails
-- @return number The validated number
-- @throws Error if the value is not between min and max
function M.validate_between(value, min, max, error_message)
  if not M.is_between(value, min, max) then
    error(error_message or "Value must be between " .. min .. " and " .. max, 2)
  end
  return value
end

--- Checks if a string matches a pattern
-- @param value any The value to check
-- @param pattern string The Lua pattern to match against
-- @return boolean True if the string matches the pattern, false otherwise
function M.matches_pattern(value, pattern)
  if type(value) ~= "string" then
    return false
  end
  
  return string.match(value, pattern) ~= nil
end

--- Validates that a string matches a pattern, throws an error if it does not
-- @param value any The value to validate
-- @param pattern string The Lua pattern to match against
-- @param error_message string The error message to throw if validation fails
-- @return string The validated string
-- @throws Error if the string does not match the pattern
function M.validate_pattern(value, pattern, error_message)
  if not M.matches_pattern(value, pattern) then
    error(error_message or "Value does not match required pattern", 2)
  end
  return value
end

--- Checks if a value is a valid ID (alphanumeric, underscore, hyphen)
-- @param value any The value to check
-- @return boolean True if the value is a valid ID, false otherwise
function M.is_valid_id(value)
  if type(value) ~= "string" then
    return false
  end
  
  return string.match(value, "^[a-zA-Z0-9_%-]+$") ~= nil
end

--- Validates that a value is a valid ID, throws an error if it is not
-- @param value any The value to validate
-- @param error_message string The error message to throw if validation fails
-- @return string The validated ID
-- @throws Error if the value is not a valid ID
function M.validate_id(value, error_message)
  if not M.is_valid_id(value) then
    error(error_message or "ID must contain only alphanumeric characters, underscores, and hyphens", 2)
  end
  return value
end

--- Validates an object against a schema
-- @param obj table The object to validate
-- @param schema table The schema to validate against
-- @return boolean, string|nil True and nil if valid, false and error message if invalid
function M.validate_schema(obj, schema)
  if not obj or not schema then
    return false, "Object or schema missing"
  end
  
  local errors = {}
  
  for field, rules in pairs(schema) do
    -- Check if the field is required
    if rules.required and M.is_empty(obj[field]) then
      table.insert(errors, field .. " is required")
    end
    
    -- If the field is present, check its type
    if not M.is_empty(obj[field]) and rules.type and not M.is_type(obj[field], rules.type) then
      table.insert(errors, field .. " must be of type " .. rules.type)
    end
    
    -- Check allowed values
    if not M.is_empty(obj[field]) and rules.values and not M.is_one_of(obj[field], rules.values) then
      table.insert(errors, field .. " must be one of the following values: " .. table.concat(rules.values, ", "))
    end
    
    -- Check pattern
    if not M.is_empty(obj[field]) and rules.pattern and not M.matches_pattern(obj[field], rules.pattern) then
      table.insert(errors, field .. " does not match the required pattern")
    end
    
    -- Check limits for numbers
    if not M.is_empty(obj[field]) and rules.min and type(obj[field]) == "number" and obj[field] < rules.min then
      table.insert(errors, field .. " must be greater than or equal to " .. rules.min)
    end
    
    if not M.is_empty(obj[field]) and rules.max and type(obj[field]) == "number" and obj[field] > rules.max then
      table.insert(errors, field .. " must be less than or equal to " .. rules.max)
    end
    
    -- Check limits for strings
    if not M.is_empty(obj[field]) and type(obj[field]) == "string" and rules.minLength and #obj[field] < rules.minLength then
      table.insert(errors, field .. " must contain at least " .. rules.minLength .. " characters")
    end
    
    if not M.is_empty(obj[field]) and type(obj[field]) == "string" and rules.maxLength and #obj[field] > rules.maxLength then
      table.insert(errors, field .. " must contain at most " .. rules.maxLength .. " characters")
    end
    
    -- Check limits for arrays
    if not M.is_empty(obj[field]) and type(obj[field]) == "table" and rules.minItems then
      local count = 0
      for _ in pairs(obj[field]) do count = count + 1 end
      if count < rules.minItems then
        table.insert(errors, field .. " must contain at least " .. rules.minItems .. " items")
      end
    end
    
    if not M.is_empty(obj[field]) and type(obj[field]) == "table" and rules.maxItems then
      local count = 0
      for _ in pairs(obj[field]) do count = count + 1 end
      if count > rules.maxItems then
        table.insert(errors, field .. " must contain at most " .. rules.maxItems .. " items")
      end
    end
  end
  
  if #errors > 0 then
    return false, table.concat(errors, ", ")
  end
  
  return true, nil
end

--- Validates an object against a schema, throws an error if invalid
-- @param obj table The object to validate
-- @param schema table The schema to validate against
-- @param error_prefix string Optional prefix for error messages
-- @return table The validated object
-- @throws Error if the object does not match the schema
function M.validate_schema_strict(obj, schema, error_prefix)
  local is_valid, error_message = M.validate_schema(obj, schema)
  if not is_valid then
    error((error_prefix or "Validation failed") .. ": " .. error_message, 2)
  end
  return obj
end

--- Validates component configuration
-- @param config table The component configuration to validate
-- @param required_fields table Array of required field names
-- @param component_name string The name of the component for error messages
-- @return table The validated configuration
-- @throws Error if the configuration is invalid
function M.validate_component_config(config, required_fields, component_name)
  M.validate_table(config, (component_name or "Component") .. " configuration must be a table")
  
  for _, field in ipairs(required_fields or {}) do
    M.validate_not_empty(config[field], (component_name or "Component") .. " " .. field .. " cannot be empty")
  end
  
  return config
end

--- Validates component options
-- @param options any The options to validate
-- @return table The validated and normalized options
function M.validate_options(options)
  if type(options) ~= 'table' then
    return {}
  end
  
  local validated_options = {}
  
  for i, option in ipairs(options) do
    if type(option) ~= 'table' then
      validated_options[i] = { id = tostring(i), text = tostring(option), value = tostring(option) }
    else
      validated_options[i] = option
      
      if not option.id then
        validated_options[i].id = tostring(i)
      end
      
      if not option.text then
        validated_options[i].text = validated_options[i].id
      end
      
      if not option.value then
        validated_options[i].value = validated_options[i].id
      end
    end
  end
  
  return validated_options
end

--- Asserts a condition, throws an error if the condition is false
-- @param condition boolean The condition to assert
-- @param error_message string The error message to throw if the assertion fails
-- @throws Error if the condition is false
function M.assert(condition, error_message)
  if not condition then
    error(error_message or "Assertion failed", 2)
  end
end

return M
