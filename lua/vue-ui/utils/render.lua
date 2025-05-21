-- render.lua
-- Shared rendering functions for Vue UI components

local M = {}

-- Color styles for components
local styles = {
  default = {
    fg = "Normal",
    bg = "Normal"
  },
  primary = {
    fg = "Function",
    bg = "Normal"
  },
  success = {
    fg = "String",
    bg = "Normal"
  },
  warning = {
    fg = "WarningMsg",
    bg = "Normal"
  },
  danger = {
    fg = "ErrorMsg",
    bg = "Normal"
  },
  focused = {
    fg = "Search",
    bg = "Normal"
  },
  disabled = {
    fg = "Comment",
    bg = "Normal"
  }
}

-- Create a floating buffer
function M.create_float(opts)
  opts = opts or {}
  
  -- Default options
  local default_opts = {
    relative = "editor",
    width = 40,
    height = 10,
    row = 5,
    col = 10,
    style = "minimal",
    border = "rounded",
    title = "Vue UI",
    title_pos = "center"
  }
  
  -- Merge options
  for k, v in pairs(opts) do
    default_opts[k] = v
  end
  
  -- Create buffer
  local buf = vim.api.nvim_create_buf(false, true)
  
  -- Configure buffer
  vim.api.nvim_buf_set_option(buf, 'bufhidden', 'wipe')
  
  -- Create floating window
  local win = vim.api.nvim_open_win(buf, true, default_opts)
  
  -- Configure window
  vim.api.nvim_win_set_option(win, 'winblend', 0)
  vim.api.nvim_win_set_option(win, 'cursorline', true)
  
  return {
    buf = buf,
    win = win
  }
end

-- Create a floating buffer with content
function M.create_floating_buffer(lines, opts)
  opts = opts or {}
  
  -- Calculate centered position if requested
  if opts.centered then
    local uis = vim.api.nvim_list_uis()
    if #uis > 0 then
      local ui = uis[1]
      opts.row = math.floor((ui.height - opts.height) / 2)
      opts.col = math.floor((ui.width - opts.width) / 2)
    else
      -- Default values for headless tests
      opts.row = 5
      opts.col = 10
    end
  end
  
  -- Create floating buffer
  local float = M.create_float({
    relative = "editor",
    width = opts.width,
    height = opts.height,
    row = opts.row or 5,
    col = opts.col or 10,
    style = "minimal",
    border = opts.border and "rounded" or "none",
    title = opts.title,
    title_pos = "center"
  })
  
  -- Fill buffer with lines
  vim.api.nvim_buf_set_lines(float.buf, 0, -1, false, lines)
  
  return float.buf, float.win
end

-- Apply style to a line of text
function M.apply_style(text, style_name)
  local style = styles[style_name] or styles.default
  return {
    {text, style.fg}
  }
end

-- Apply style to text (for buttons, titles, etc.)
function M.style_text(text, style_name)
  local style = styles[style_name] or styles.default
  
  -- Add special attributes based on style
  if style_name == 'primary' or style_name == 'primary_focused' then
    return text
  elseif style_name == 'secondary' or style_name == 'secondary_focused' then
    return text
  elseif style_name:find('_focused') then
    -- Add indicator for focused elements
    return '> ' .. text .. ' <'
  else
    return text
  end
end

-- Draw a border around text
function M.draw_border(text, width, style_name)
  local style = styles[style_name] or styles.default
  local top = "┌" .. string.rep("─", width - 2) .. "┐"
  local bottom = "└" .. string.rep("─", width - 2) .. "┘"
  local middle = "│" .. text .. string.rep(" ", width - #text - 2) .. "│"
  
  return {
    {top, style.fg},
    {middle, style.fg},
    {bottom, style.fg}
  }
end

-- Center text in a given width
function M.center_text(text, width)
  local padding = math.floor((width - vim.fn.strdisplaywidth(text)) / 2)
  return string.rep(" ", padding) .. text .. string.rep(" ", width - padding - vim.fn.strdisplaywidth(text))
end

-- Create a border line (top, middle, or bottom)
function M.create_border_line(width, position, style_name)
  local style = styles[style_name] or styles.default
  local line = ""
  
  if position == "top" then
    line = "┌" .. string.rep("─", width - 2) .. "┐"
  elseif position == "middle" then
    line = "├" .. string.rep("─", width - 2) .. "┤"
  elseif position == "bottom" then
    line = "└" .. string.rep("─", width - 2) .. "┘"
  else
    line = "│" .. string.rep(" ", width - 2) .. "│"
  end
  
  return line
end

-- Create a title line
function M.create_title_line(width, title, style_name)
  local style = styles[style_name] or styles.default
  local centered_title = M.center_text(title, width - 4)
  return "│ " .. centered_title .. " │"
end

-- Create a content line
function M.create_content_line(width, content, style_name)
  local style = styles[style_name] or styles.default
  local padded_content = content .. string.rep(" ", width - vim.fn.strdisplaywidth(content) - 4)
  return "│ " .. padded_content .. " │"
end

-- Create an input line
function M.create_input_line(width, content, style_name)
  local style = styles[style_name] or styles.default
  local padded_content = content .. string.rep(" ", width - vim.fn.strdisplaywidth(content) - 4)
  return "│ " .. padded_content .. " │"
end

-- Create a buttons line
function M.create_buttons_line(width, buttons, style_name)
  local style = styles[style_name] or styles.default
  local buttons_text = table.concat(buttons, "  ")
  local padding = math.floor((width - vim.fn.strdisplaywidth(buttons_text) - 4) / 2)
  local padded_buttons = string.rep(" ", padding) .. buttons_text .. string.rep(" ", width - vim.fn.strdisplaywidth(buttons_text) - padding - 4)
  return "│ " .. padded_buttons .. " │"
end

-- Left align text in a given width
function M.left_align(text, width)
  return text .. string.rep(" ", width - vim.fn.strdisplaywidth(text))
end

-- Right align text in a given width
function M.right_align(text, width)
  return string.rep(" ", width - vim.fn.strdisplaywidth(text)) .. text
end

-- Truncate text if it exceeds a given width
function M.truncate(text, width)
  if vim.fn.strdisplaywidth(text) <= width then
    return text
  end
  
  return string.sub(text, 1, width - 3) .. "..."
end

-- Draw a component in a buffer
function M.draw_component(buf, component, start_line)
  start_line = start_line or 0
  
  -- Check that the component has a render method
  if not component.render then
    vim.api.nvim_echo({{"[VueUI] Component does not have a render method", "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Get component rendering
  local rendered = component:render()
  
  -- Check that the rendering is valid
  if not rendered or not rendered.lines then
    vim.api.nvim_echo({{"[VueUI] Invalid component rendering", "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Draw lines in the buffer
  vim.api.nvim_buf_set_option(buf, 'modifiable', true)
  
  -- Clear existing lines if necessary
  if start_line == 0 then
    vim.api.nvim_buf_set_lines(buf, 0, -1, false, {})
  end
  
  -- Add new lines
  vim.api.nvim_buf_set_lines(buf, start_line, start_line + #rendered.lines, false, rendered.lines)
  
  -- Apply styles if present
  if rendered.highlights then
    for _, hl in ipairs(rendered.highlights) do
      vim.api.nvim_buf_add_highlight(buf, -1, hl.group, hl.line, hl.col_start, hl.col_end)
    end
  end
  
  vim.api.nvim_buf_set_option(buf, 'modifiable', false)
  
  return true
end

-- Register custom styles
function M.register_style(name, fg, bg)
  styles[name] = {
    fg = fg,
    bg = bg
  }
end

-- Get a style by its name
function M.get_style(name)
  return styles[name] or styles.default
end

return M
