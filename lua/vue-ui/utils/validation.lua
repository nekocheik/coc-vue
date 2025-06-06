-- validation.lua
-- Validation functions for Vue UI components

local M = {}

-- Check if a value is nil or empty
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

-- Validate that a value is not empty, throw an error if it is
function M.validate_not_empty(value, error_message)
  if M.is_empty(value) then
    error(error_message or "Value cannot be empty", 2)
  end
  return value
end

-- Validate that a value is a table, throw an error if it's not
function M.validate_table(value, error_message)
  if type(value) ~= "table" then
    error(error_message or "Value must be a table", 2)
  end
  return value
end

-- Validate that a value is a table or nil, throw an error if it's not
function M.validate_table_optional(value, error_message)
  if value ~= nil and type(value) ~= "table" then
    error(error_message or "Value must be a table or nil", 2)
  end
  return value
end

-- Check if a value is of the specified type
function M.is_type(value, expected_type)
  if expected_type == "array" then
    return type(value) == "table" and #value > 0
  end
  
  if expected_type == "object" then
    return type(value) == "table" and next(value) ~= nil and not M.is_array(value)
  end
  
  return type(value) == expected_type
end

-- Check if a table is an array
function M.is_array(t)
  if type(t) ~= "table" then
    return false
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

-- Check if a value is included in a set of values
function M.is_one_of(value, values)
  for _, v in ipairs(values) do
    if value == v then
      return true
    end
  end
  
  return false
end

-- Check if a value is a valid number
function M.is_number(value)
  return type(value) == "number"
end

-- Check if a value is an integer
function M.is_integer(value)
  return type(value) == "number" and math.floor(value) == value
end

-- Check if a value is a positive number
function M.is_positive(value)
  return type(value) == "number" and value > 0
end

-- Check if a value is a negative number
function M.is_negative(value)
  return type(value) == "number" and value < 0
end

-- Check if a value is a number between min and max
function M.is_between(value, min, max)
  return type(value) == "number" and value >= min and value <= max
end

-- Check if a string matches a pattern
function M.matches_pattern(value, pattern)
  if type(value) ~= "string" then
    return false
  end
  
  return string.match(value, pattern) ~= nil
end

-- Check if a value is a valid identifier
function M.is_valid_id(value)
  if type(value) ~= "string" then
    return false
  end
  
  return string.match(value, "^[a-zA-Z0-9_%-]+$") ~= nil
end

-- Validate an object against a schema
function M.validate(obj, schema)
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
    
    -- Check possible values
    if not M.is_empty(obj[field]) and rules.values and not M.is_one_of(obj[field], rules.values) then
      table.insert(errors, field .. " must be one of the following values: " .. table.concat(rules.values, ", "))
    end
    
    -- Check pattern
    if not M.is_empty(obj[field]) and rules.pattern and not M.matches_pattern(obj[field], rules.pattern) then
      table.insert(errors, field .. " does not match the required pattern")
    end
    
    -- Check limits for numbers
    if not M.is_empty(obj[field]) and rules.min and obj[field] < rules.min then
      table.insert(errors, field .. " must be greater than or equal to " .. rules.min)
    end
    
    if not M.is_empty(obj[field]) and rules.max and obj[field] > rules.max then
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
    if not M.is_empty(obj[field]) and M.is_array(obj[field]) and rules.minItems and #obj[field] < rules.minItems then
      table.insert(errors, field .. " must contain at least " .. rules.minItems .. " elements")
    end
    
    if not M.is_empty(obj[field]) and M.is_array(obj[field]) and rules.maxItems and #obj[field] > rules.maxItems then
      table.insert(errors, field .. " must contain at most " .. rules.maxItems .. " elements")
    end
  end
  
  if #errors > 0 then
    return false, table.concat(errors, ", ")
  end
  
  return true, nil
end

return M
