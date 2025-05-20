--- Core Render Module for Vue UI Components
-- @module core_render
-- @author Cheik Kone
-- @license MIT
-- @copyright Cheik Kone 2025
--
-- This module provides rendering utilities for UI components,
-- handling text formatting, styling, and layout.

local render_utils = require('vue-ui.utils.render')

local M = {}

--- Renders a closed select component
-- @param component table Select component instance
-- @return table Render result (lines, width, height)
function M.render_closed_select(component)
  local lines = {}
  local width = component.width
  
  -- Title line
  table.insert(lines, component.title)
  
  -- Select line
  local display_text = ""
  
  if component.multi and #component.selected_options > 0 then
    -- Display the number of selected options in multi mode
    display_text = string.format("%d option(s) selected", #component.selected_options)
  else
    -- Display the text of the selected option or the placeholder
    display_text = component.selected_text or component.placeholder
  end
  
  local style = component.disabled and 'disabled' or component.style
  
  -- Apply style to the text
  local styled_text = render_utils.style_text(display_text, style)
  
  -- Create the select line with arrow
  local select_line = render_utils.create_select_line(width, styled_text, style)
  table.insert(lines, select_line)
  
  -- Return the lines and dimensions
  return {
    lines = lines,
    width = width,
    height = #lines
  }
end

--- Renders an open select component
-- @param component table Select component instance
-- @return table Render result (lines, width, height)
function M.render_open_select(component)
  local lines = {}
  local width = component.width
  
  -- Title line
  table.insert(lines, component.title)
  
  -- Select line
  local display_text = ""
  
  if component.multi and #component.selected_options > 0 then
    -- Display the number of selected options in multi mode
    display_text = string.format("%d option(s) selected", #component.selected_options)
  else
    -- Display the text of the selected option or the placeholder
    display_text = component.selected_text or component.placeholder
  end
  
  local style = component.disabled and 'disabled' or component.style
  
  -- Apply style to the text
  local styled_text = render_utils.style_text(display_text, style)
  
  -- Create the select line with arrow (open)
  local select_line = render_utils.create_select_line(width, styled_text, style, true)
  table.insert(lines, select_line)
  
  -- Top line separation
  table.insert(lines, render_utils.create_border_line(width, 'middle', style))
  
  -- Options
  local visible_options = math.min(#component.options, component.max_visible_options)
  
  for i = 1, visible_options do
    local option = component.options[i]
    if not option then break end
    
    local option_style = style
    local option_prefix = "  "
    
    -- Apply focus style if necessary
    if i - 1 == component.focused_option_index then
      option_style = style .. '_focused'
      option_prefix = "> "
    end
    
    -- Apply selection style if necessary
    if component.multi then
      -- Multi-select mode
      if component:is_option_selected(i - 1) then
        option_style = option_style .. '_selected'
        option_prefix = "[x] "
      else
        option_prefix = "[ ] "
      end
    else
      -- Single-select mode
      if i - 1 == component.selected_option_index then
        option_style = option_style .. '_selected'
        option_prefix = "* "
      end
    end
    
    -- Apply style to the text of the option
    local styled_option = render_utils.style_text(option_prefix .. option.text, option_style)
    
    -- Create option line
    local option_line = render_utils.create_option_line(width, styled_option, option_style)
    table.insert(lines, option_line)
  end
  
  -- Bottom line
  table.insert(lines, render_utils.create_border_line(width, 'bottom', style))
  
  -- Return the lines and dimensions
  return {
    lines = lines,
    width = width,
    height = #lines
  }
end

--- Renders a select component based on its state
-- @param component table Select component instance
-- @return table Render result (lines, width, height)
function M.render_select(component)
  if component._is_open then
    return M.render_open_select(component)
  else
    return M.render_closed_select(component)
  end
end

--- Creates a styled option line
-- @param width number Width of the line
-- @param text string Text to display
-- @param style string Style to apply
-- @return string Formatted option line
function M.create_option_line(width, text, style)
  return render_utils.create_option_line(width, text, style)
end

--- Creates a styled select line
-- @param width number Width of the line
-- @param text string Text to display
-- @param style string Style to apply
-- @param is_open boolean Whether the select is open
-- @return string Formatted select line
function M.create_select_line(width, text, style, is_open)
  return render_utils.create_select_line(width, text, style, is_open)
end

--- Creates a styled border line
-- @param width number Width of the line
-- @param position string Position of the border (top, middle, bottom)
-- @param style string Style to apply
-- @return string Formatted border line
function M.create_border_line(width, position, style)
  return render_utils.create_border_line(width, position, style)
end

--- Applies style to text
-- @param text string Text to style
-- @param style string Style to apply
-- @return string Styled text
function M.style_text(text, style)
  return render_utils.style_text(text, style)
end

--- Centers text within a given width
-- @param text string Text to center
-- @param width number Width to center within
-- @return string Centered text
function M.center_text(text, width)
  return render_utils.center_text(text, width)
end

--- Left-aligns text within a given width
-- @param text string Text to align
-- @param width number Width to align within
-- @return string Left-aligned text
function M.left_align(text, width)
  return render_utils.left_align(text, width)
end

--- Right-aligns text within a given width
-- @param text string Text to align
-- @param width number Width to align within
-- @return string Right-aligned text
function M.right_align(text, width)
  return render_utils.right_align(text, width)
end

return M
