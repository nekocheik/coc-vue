-- BufferRouter.lua
-- A module to manage buffer routing in coc-vue

local api = vim.api

---@class BufferRouter
local BufferRouter = {}

-- Private members
_G.buffers = {}
local current_buffer_id = nil

-- Utility to parse JSON query string
local function parse_query_json(query_json_string)
  if not query_json_string or query_json_string == "" or query_json_string == "{}" then
    return {}
  end
  -- Added type check to prevent error if a table is accidentally passed
  if type(query_json_string) ~= "string" then
    vim.notify("[BufferRouter.lua] parse_query_json was called with a non-string argument: " .. type(query_json_string), vim.log.levels.WARN)
    return {} 
  end
  
  local success, decoded_query = pcall(vim.fn.json_decode, query_json_string)
  if not success then
    vim.notify("[BufferRouter.lua] Failed to decode query JSON: " .. query_json_string, vim.log.levels.ERROR)
    return {}
  end
  return decoded_query
end

-- Utility to parse query string (legacy, might be removed or adapted if still needed elsewhere)
local function parse_query(query_string)
  if not query_string or query_string == "" then
    return {}
  end
  
  local query = {}
  for pair in query_string:gmatch("([^&]+)") do
    local key, value = pair:match("([^=]+)=(.*)")
    if key and value then
      query[key] = value
    end
  end
  
  return query
end

-- Create a new buffer with a path and query
---@param path string The path for the buffer
---@param query_params table|string|nil The query parameters. Expected as a Lua table from TypeScript.
--                                   Can be a URL-like query string from legacy Lua callers (like tests).
---@return string buffer_id The ID of the created buffer
function BufferRouter:create_buffer(path, query_params)
  assert(path, "Path is required to create a buffer")
  
  local id = tostring(math.random(100000, 999999))
  while _G.buffers[id] do
    id = tostring(math.random(100000, 999999))
  end
  
  local final_query_table = {}
  local raw_legacy_query_string = nil -- To store original string if input was string

  if type(query_params) == "table" then
    final_query_table = query_params
  elseif type(query_params) == "string" then
    -- This branch handles legacy callers like test_create_buffer
    final_query_table = parse_query(query_params) -- Use the legacy URL-like string parser
    raw_legacy_query_string = query_params 
  elseif query_params == nil then
    final_query_table = {} -- Default to empty table if nil
  else
    vim.notify("[BufferRouter.lua] create_buffer: query_params is of unhandled type: " .. type(query_params), vim.log.levels.WARN)
    final_query_table = {}
  end
  
  local buf = api.nvim_create_buf(false, true)
  
  _G.buffers[id] = {
    id = id,
    path = path,
    query = final_query_table, -- Consistently a Lua table
    raw_query_string_legacy = raw_legacy_query_string, -- For test assertion or legacy needs
    buf_handle = buf,
    created_at = os.time()
  }
  
  local buffer_name = path
  if final_query_table and next(final_query_table) ~= nil then
    buffer_name = buffer_name .. " [q]" 
  end
  api.nvim_buf_set_name(buf, buffer_name)
  
  -- Return a table with both id and nvimBufferId for better TS integration
  return { id = id, nvimBufferId = buf }
end

-- Get buffer information by ID
---@param id string The ID of the buffer to get information for
---@return table|nil buffer_info Information about the buffer, or nil if not found
function BufferRouter:get_buffer_info(id)
  if not id then
    return nil
  end
  
  local buffer = _G.buffers[id]
  if not buffer then
    return nil
  end
  
  return {
    id = buffer.id,
    path = buffer.path,
    query = buffer.query,
    nvimBufferId = buffer.buf_handle,
    createdAt = buffer.created_at
  }
end

-- Delete a buffer by ID
---@param id string The ID of the buffer to delete
---@return boolean success Whether the deletion was successful
function BufferRouter:delete_buffer(id)
  if not id or not _G.buffers[id] then
    return false
  end
  
  local buffer_info = _G.buffers[id]
  
  -- Delete the buffer from Neovim
  pcall(api.nvim_buf_delete, buffer_info.buf_handle, { force = true })
  
  -- Remove from our tracking
  _G.buffers[id] = nil
  
  -- Reset current buffer if we deleted the current one
  if current_buffer_id == id then
    current_buffer_id = nil
  end
  
  return true
end

-- Switch to a buffer by ID or path
---@param identifier string Either a buffer ID or a path
---@return boolean success Whether the switch was successful
function BufferRouter:switch_buffer(identifier)
  if not identifier then
    return false
  end
  
  local buffer_info = nil
  
  -- Try to find by ID first
  if _G.buffers[identifier] then
    buffer_info = _G.buffers[identifier]
  else
    -- Try to find by path
    for _, buf in pairs(_G.buffers) do
      -- Check if path matches exactly, or if path+query matches
      local full_path = buf.path
      if buf.query_string and buf.query_string ~= "" then
        full_path = full_path .. "?" .. buf.query_string
      end
      
      -- Matching by full_path might be complex if query_json_string is used for naming
      -- For now, primarily match by buf.path or expect ID for switching with complex queries.
      if buf.path == identifier then 
        buffer_info = buf
        break
      end
    end
  end
  
  -- If we didn't find the buffer, return false
  if not buffer_info then
    return false
  end
  
  -- Switch to this buffer
  pcall(api.nvim_set_current_buf, buffer_info.buf_handle)
  current_buffer_id = buffer_info.id
  
  return true
end

-- Get the current buffer information
---@return table|nil buffer_info Information about the current buffer or nil
function BufferRouter:get_current_buffer()
  if not current_buffer_id or not _G.buffers[current_buffer_id] then
    return nil
  end
  
  -- Return a copy of the buffer info (without the handle)
  local buffer_info = _G.buffers[current_buffer_id]
  return {
    id = buffer_info.id,
    path = buffer_info.path,
    query = buffer_info.query,
    query_string = buffer_info.query_string,
    created_at = buffer_info.created_at
  }
end

-- List all managed buffers
---@return table[] buffers Array of buffer information
function BufferRouter:list_buffers()
  local result = {}
  for id, buffer in pairs(_G.buffers) do
    table.insert(result, {
      id = buffer.id,
      path = buffer.path,
      query_string = buffer.query_string,
      created_at = buffer.created_at
    })
  end
  
  return result
end

-- TEST FUNCTIONS
-- These functions are for testing purposes and would typically be in a separate file

-- Test create_buffer
function BufferRouter:test_create_buffer()
  local path = "/test/path"
  local query = "foo=bar&baz=qux"
  
  local id = self:create_buffer(path, query)
  
  assert(id, "Buffer ID should be returned")
  assert(_G.buffers[id], "Buffer should be stored")
  assert(_G.buffers[id].path == path, "Path should match")
  assert(_G.buffers[id].raw_query_string_legacy == query, "Raw legacy query string should match")
  assert(_G.buffers[id].query.foo == "bar", "Query parameter 'foo' should be parsed")
  assert(_G.buffers[id].query.baz == "qux", "Query parameter 'baz' should be parsed")
  
  -- Test with nil query
  local id2 = self:create_buffer("/test/path2", nil)
  assert(id2, "Buffer ID should be returned with nil query")
  assert(_G.buffers[id2], "Buffer should be stored with nil query")
  assert(_G.buffers[id2].path == "/test/path2", "Path should match with nil query")
  assert(_G.buffers[id2].query == {}, "Query should be empty table with nil query")
  
  -- Clean up
  self:delete_buffer(id)
  self:delete_buffer(id2)
  
  print("✓ test_create_buffer passed")
  return true
end

-- Test delete_buffer
function BufferRouter:test_delete_buffer()
  local id = self:create_buffer("/test/path")
  
  assert(_G.buffers[id], "Buffer should exist before deletion")
  
  local success = self:delete_buffer(id)
  
  assert(success, "Deletion should be successful")
  assert(not _G.buffers[id], "Buffer should not exist after deletion")
  
  print("✓ test_delete_buffer passed")
  return true
end

-- Test switch_buffer
function BufferRouter:test_switch_buffer()
  local id1 = self:create_buffer("/test/path1")
  local id2 = self:create_buffer("/test/path2", "param=value")
  
  -- Test switching by ID
  local success1 = self:switch_buffer(id1)
  assert(success1, "Switch by ID should succeed")
  assert(current_buffer_id == id1, "Current buffer should be updated")
  
  -- Test switching by path
  local success2 = self:switch_buffer("/test/path2")
  assert(success2, "Switch by path should succeed")
  assert(current_buffer_id == id2, "Current buffer should be updated")
  
  -- Test switching by path+query
  local success3 = self:switch_buffer("/test/path2?param=value")
  assert(success3, "Switch by path+query should succeed")
  assert(current_buffer_id == id2, "Current buffer should be updated")
  
  -- Clean up
  self:delete_buffer(id1)
  self:delete_buffer(id2)
  
  print("✓ test_switch_buffer passed")
  return true
end

-- Test get_current_buffer
function BufferRouter:test_get_current_buffer()
  local id = self:create_buffer("/test/path", "foo=bar")
  
  -- Switch to the buffer
  self:switch_buffer(id)
  
  local current = self:get_current_buffer()
  
  assert(current, "Current buffer info should be returned")
  assert(current.id == id, "Current buffer ID should match")
  assert(current.path == "/test/path", "Current buffer path should match")
  assert(current.query_string == "foo=bar", "Current buffer query string should match")
  assert(current.query.foo == "bar", "Current buffer query parameter should match")
  
  -- Clean up
  self:delete_buffer(id)
  
  print("✓ test_get_current_buffer passed")
  return true
end

-- Test list_buffers
function BufferRouter:test_list_buffers()
  -- Clear existing buffers
  for id, _ in pairs(_G.buffers) do
    self:delete_buffer(id)
  end
  
  -- Create test buffers
  local id1 = self:create_buffer("/test/list/path1")
  local id2 = self:create_buffer("/test/list/path2", "param=value")
  
  -- Get buffer list
  local buffers = self:list_buffers()
  
  assert(#buffers == 2, "Should list 2 buffers")
  
  -- Verify first buffer
  local found_id1 = false
  local found_id2 = false
  
  for _, buf in ipairs(buffers) do
    if buf.id == id1 then
      found_id1 = true
      assert(buf.path == "/test/list/path1", "Buffer 1 path should match")
    elseif buf.id == id2 then
      found_id2 = true
      assert(buf.path == "/test/list/path2", "Buffer 2 path should match")
      assert(buf.query_string == "param=value", "Buffer 2 query string should match")
    end
  end
  
  assert(found_id1, "Buffer 1 should be in the list")
  assert(found_id2, "Buffer 2 should be in the list")
  
  -- Clean up
  self:delete_buffer(id1)
  self:delete_buffer(id2)
  
  print("✓ test_list_buffers passed")
  return true
end

-- Run all tests
function BufferRouter:run_tests()
  print("Running BufferRouter tests...")
  self:test_create_buffer()
  self:test_delete_buffer()
  self:test_switch_buffer()
  self:test_get_current_buffer()
  self:test_list_buffers()
  print("All BufferRouter tests passed!")
end

return BufferRouter
