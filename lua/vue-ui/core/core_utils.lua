--- Core Utils Module for Vue UI Components
-- @module core_utils
-- @author Cheik Kone
-- @license MIT
-- @copyright Cheik Kone 2025
--
-- This module provides general utility functions for UI components,
-- handling common operations and helper functions.

local test_helpers = require('vue-ui.utils.test_helpers')

local M = {}

--- Merges two tables
-- @param t1 table First table
-- @param t2 table Second table
-- @return table Merged table
function M.merge_tables(t1, t2)
  local result = {}
  
  -- Copy t1
  for k, v in pairs(t1) do
    result[k] = v
  end
  
  -- Copy t2, overwriting t1 values
  for k, v in pairs(t2) do
    result[k] = v
  end
  
  return result
end

--- Applies default values to a table
-- @param t table Table to apply defaults to
-- @param defaults table Default values
-- @return table Table with defaults applied
function M.apply_defaults(t, defaults)
  local result = {}
  
  -- Copy defaults
  for k, v in pairs(defaults) do
    result[k] = v
  end
  
  -- Copy t, overwriting defaults
  for k, v in pairs(t) do
    result[k] = v
  end
  
  return result
end

--- Checks if the current environment is a test environment
-- @return boolean True if in test environment
function M.is_test_env()
  return test_helpers.is_test_env()
end

--- Generates a unique ID
-- @param prefix string Prefix for the ID
-- @return string Unique ID
function M.generate_id(prefix)
  prefix = prefix or "component"
  return prefix .. "_" .. os.time() .. "_" .. math.random(1000, 9999)
end

--- Truncates a string to a maximum length
-- @param str string String to truncate
-- @param max_length number Maximum length
-- @param suffix string Suffix to add if truncated
-- @return string Truncated string
function M.truncate_string(str, max_length, suffix)
  suffix = suffix or "..."
  
  if #str <= max_length then
    return str
  end
  
  return string.sub(str, 1, max_length - #suffix) .. suffix
end

--- Pads a string to a fixed length
-- @param str string String to pad
-- @param length number Target length
-- @param char string Character to pad with
-- @param align string Alignment (left, right, center)
-- @return string Padded string
function M.pad_string(str, length, char, align)
  char = char or " "
  align = align or "left"
  
  if #str >= length then
    return str
  end
  
  local pad_length = length - #str
  
  if align == "left" then
    return str .. string.rep(char, pad_length)
  elseif align == "right" then
    return string.rep(char, pad_length) .. str
  elseif align == "center" then
    local left_pad = math.floor(pad_length / 2)
    local right_pad = pad_length - left_pad
    return string.rep(char, left_pad) .. str .. string.rep(char, right_pad)
  end
  
  return str
end

--- Splits a string by a delimiter
-- @param str string String to split
-- @param delimiter string Delimiter
-- @return table Array of substrings
function M.split_string(str, delimiter)
  delimiter = delimiter or "%s"
  local result = {}
  
  for match in (str .. delimiter):gmatch("(.-)" .. delimiter) do
    table.insert(result, match)
  end
  
  return result
end

--- Joins an array of strings with a delimiter
-- @param arr table Array of strings
-- @param delimiter string Delimiter
-- @return string Joined string
function M.join_strings(arr, delimiter)
  delimiter = delimiter or " "
  return table.concat(arr, delimiter)
end

--- Escapes special characters in a string for pattern matching
-- @param str string String to escape
-- @return string Escaped string
function M.escape_pattern(str)
  local escaped = str:gsub("([%(%)%.%%%+%-%*%?%[%]%^%$])", "%%%1")
  return escaped
end

--- Checks if a string starts with a prefix
-- @param str string String to check
-- @param prefix string Prefix to check for
-- @return boolean True if string starts with prefix
function M.starts_with(str, prefix)
  return string.sub(str, 1, #prefix) == prefix
end

--- Checks if a string ends with a suffix
-- @param str string String to check
-- @param suffix string Suffix to check for
-- @return boolean True if string ends with suffix
function M.ends_with(str, suffix)
  return suffix == "" or string.sub(str, -#suffix) == suffix
end

--- Checks if a string contains a substring
-- @param str string String to check
-- @param substring string Substring to check for
-- @return boolean True if string contains substring
function M.contains(str, substring)
  return string.find(str, substring, 1, true) ~= nil
end

--- Converts a string to lowercase
-- @param str string String to convert
-- @return string Lowercase string
function M.to_lower(str)
  return string.lower(str)
end

--- Converts a string to uppercase
-- @param str string String to convert
-- @return string Uppercase string
function M.to_upper(str)
  return string.upper(str)
end

--- Trims whitespace from the beginning and end of a string
-- @param str string String to trim
-- @return string Trimmed string
function M.trim(str)
  return str:match("^%s*(.-)%s*$")
end

--- Checks if a table contains a value
-- @param t table Table to check
-- @param value any Value to check for
-- @return boolean True if table contains value
function M.table_contains(t, value)
  for _, v in pairs(t) do
    if v == value then
      return true
    end
  end
  
  return false
end

--- Gets the length of a table
-- @param t table Table to get length of
-- @return number Length of table
function M.table_length(t)
  local count = 0
  
  for _ in pairs(t) do
    count = count + 1
  end
  
  return count
end

--- Creates a shallow copy of a table
-- @param t table Table to copy
-- @return table Copy of table
function M.table_copy(t)
  local copy = {}
  
  for k, v in pairs(t) do
    copy[k] = v
  end
  
  return copy
end

--- Creates a deep copy of a table
-- @param t table Table to copy
-- @return table Deep copy of table
function M.table_deep_copy(t)
  if type(t) ~= "table" then
    return t
  end
  
  local copy = {}
  
  for k, v in pairs(t) do
    if type(v) == "table" then
      copy[k] = M.table_deep_copy(v)
    else
      copy[k] = v
    end
  end
  
  return copy
end

--- Filters a table using a predicate function
-- @param t table Table to filter
-- @param predicate function Function that takes a value and key and returns true to include it
-- @return table Filtered table
function M.table_filter(t, predicate)
  local result = {}
  
  for k, v in pairs(t) do
    if predicate(v, k) then
      result[k] = v
    end
  end
  
  return result
end

--- Maps a table using a mapping function
-- @param t table Table to map
-- @param mapper function Function that takes a value and key and returns a new value
-- @return table Mapped table
function M.table_map(t, mapper)
  local result = {}
  
  for k, v in pairs(t) do
    result[k] = mapper(v, k)
  end
  
  return result
end

--- Reduces a table using a reducer function
-- @param t table Table to reduce
-- @param reducer function Function that takes an accumulator, value, and key and returns a new accumulator
-- @param initial any Initial value for the accumulator
-- @return any Reduced value
function M.table_reduce(t, reducer, initial)
  local result = initial
  
  for k, v in pairs(t) do
    result = reducer(result, v, k)
  end
  
  return result
end

return M
