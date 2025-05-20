-- schema.lua
-- Global event schema for Vue UI components

local M = {}

-- Event type definitions
M.EVENT_TYPES = {
  -- General events
  COMPONENT_CREATED = "component:created",
  COMPONENT_UPDATED = "component:updated",
  COMPONENT_DESTROYED = "component:destroyed",
  COMPONENT_FOCUSED = "component:focused",
  COMPONENT_BLURRED = "component:blurred",
  
  -- Button-specific events
  BUTTON_CLICKED = "button:clicked",
  BUTTON_HOVERED = "button:hovered",
  
  -- Input field-specific events
  INPUT_CHANGED = "input:changed",
  INPUT_SUBMITTED = "input:submitted",
  INPUT_CANCELLED = "input:cancelled",
  
  -- List-specific events
  LIST_ITEM_SELECTED = "list:item:selected",
  LIST_ITEM_TOGGLED = "list:item:toggled",
  LIST_PAGE_CHANGED = "list:page:changed",
  
  -- Select-specific events
  -- @event select:opened Emitted when a select is opened
  SELECT_OPENED = "select:opened",
  -- @event select:closed Emitted when a select is closed without selection
  SELECT_CLOSED = "select:closed",
  -- @event select:changed Emitted when the selection or focus changes in a select
  SELECT_CHANGED = "select:changed",
  -- @event select:confirmed Emitted when a selection is confirmed (for example, by pressing Enter)
  SELECT_CONFIRMED = "select:confirmed",
  -- @event select:cancelled Emitted when a selection is cancelled (for example, by pressing Escape)
  SELECT_CANCELLED = "select:cancelled",
  -- @event select:option:selected Emitted when an option is selected in a select
  SELECT_OPTION_SELECTED = "select:option:selected",
  
  -- Modal-specific events
  MODAL_OPENED = "modal:opened",
  MODAL_CLOSED = "modal:closed",
  MODAL_CONFIRMED = "modal:confirmed",
  MODAL_CANCELLED = "modal:cancelled",
  
  -- Notification-specific events
  NOTIFICATION_SHOWN = "notification:shown",
  NOTIFICATION_HIDDEN = "notification:hidden",
  NOTIFICATION_CLICKED = "notification:clicked",
  NOTIFICATION_ACTION_CLICKED = "notification:action:clicked"
}

-- Validation schema for events
M.EVENT_SCHEMAS = {
  -- Schema for general events
  [M.EVENT_TYPES.COMPONENT_CREATED] = {
    id = { type = "string", required = true },
    component_type = { type = "string", required = true },
    config = { type = "table" }
  },
  
  [M.EVENT_TYPES.COMPONENT_UPDATED] = {
    id = { type = "string", required = true },
    changes = { type = "table", required = true }
  },
  
  [M.EVENT_TYPES.COMPONENT_DESTROYED] = {
    id = { type = "string", required = true }
  },
  
  [M.EVENT_TYPES.COMPONENT_FOCUSED] = {
    id = { type = "string", required = true }
  },
  
  [M.EVENT_TYPES.COMPONENT_BLURRED] = {
    id = { type = "string", required = true }
  },
  
  -- Schema for button events
  [M.EVENT_TYPES.BUTTON_CLICKED] = {
    id = { type = "string", required = true },
    text = { type = "string" }
  },
  
  [M.EVENT_TYPES.BUTTON_HOVERED] = {
    id = { type = "string", required = true },
    hovered = { type = "boolean", required = true }
  },
  
  -- Schema for input field events
  [M.EVENT_TYPES.INPUT_CHANGED] = {
    id = { type = "string", required = true },
    value = { type = "string", required = true },
    previous_value = { type = "string" },
    is_valid = { type = "boolean" }
  },
  
  [M.EVENT_TYPES.INPUT_SUBMITTED] = {
    id = { type = "string", required = true },
    value = { type = "string", required = true }
  },
  
  [M.EVENT_TYPES.INPUT_CANCELLED] = {
    id = { type = "string", required = true }
  },
  
  -- Schema for modal events
  [M.EVENT_TYPES.MODAL_OPENED] = {
    id = { type = "string", required = true },
    title = { type = "string" },
    width = { type = "number" },
    height = { type = "number" }
  },
  
  [M.EVENT_TYPES.MODAL_CLOSED] = {
    id = { type = "string", required = true }
  },
  
  [M.EVENT_TYPES.MODAL_CONFIRMED] = {
    id = { type = "string", required = true },
    button_id = { type = "string" },
    input_value = { type = "string" },
    data = { type = "table" }
  },
  
  [M.EVENT_TYPES.MODAL_CANCELLED] = {
    id = { type = "string", required = true },
    reason = { type = "string" }
  },
  
  -- Schema for list events
  [M.EVENT_TYPES.LIST_ITEM_SELECTED] = {
    id = { type = "string", required = true },
    item_id = { type = "string", required = true },
    item_index = { type = "number", required = true },
    item_data = { type = "table" }
  },
  
  [M.EVENT_TYPES.LIST_ITEM_TOGGLED] = {
    id = { type = "string", required = true },
    item_id = { type = "string", required = true },
    item_index = { type = "number", required = true },
    selected = { type = "boolean", required = true }
  },
  
  [M.EVENT_TYPES.LIST_PAGE_CHANGED] = {
    id = { type = "string", required = true },
    page = { type = "number", required = true },
    total_pages = { type = "number", required = true }
  },
  
  -- Schema for select events
  -- Schema for select:opened event
  -- @field id ID of the Select component
  -- @field config Configuration of the Select component
  [M.EVENT_TYPES.SELECT_OPENED] = {
    id = { type = "string", required = true },
    config = { type = "table" }
  },
  
  -- Schema for select:closed event
  -- @field id ID of the Select component
  [M.EVENT_TYPES.SELECT_CLOSED] = {
    id = { type = "string", required = true }
  },
  
  -- Schema for select:changed event
  -- @field id ID of the Select component
  -- @field value Selected or focused value
  -- @field previous_value Previously selected value
  -- @field option Selected or focused option (complete table)
  -- @field option_id ID of the selected or focused option
  -- @field option_index Index of the selected or focused option
  -- @field is_multi Indicates if the Select is in multi-selection mode
  -- @field selected_options List of selected options (for multi-selection)
  [M.EVENT_TYPES.SELECT_CHANGED] = {
    id = { type = "string", required = true },
    value = { type = "string", required = true },
    previous_value = { type = "string" },
    option = { type = "table" },
    option_id = { type = "string" },
    option_index = { type = "number" },
    is_multi = { type = "boolean" },
    selected_options = { type = "table" }
  },
  
  -- Schema for select:confirmed event
  -- @field id ID of the Select component
  -- @field value Confirmed value (for single-select) or concatenation of values (for multi-select)
  -- @field is_multi Indicates if the Select is in multi-select mode
  -- @field selected_options List of selected options (for multi-select)
  [M.EVENT_TYPES.SELECT_CONFIRMED] = {
    id = { type = "string", required = true },
    value = { type = "string", required = true },
    is_multi = { type = "boolean" },
    selected_options = { type = "table" }
  },
  
  -- Schema for select:cancelled event
  -- @field id ID of the Select component
  -- @field reason Reason for cancellation (e.g.: "key_escape", "click_outside", etc.)
  [M.EVENT_TYPES.SELECT_CANCELLED] = {
    id = { type = "string", required = true },
    reason = { type = "string" }
  },
  
  -- Schema for modal events
  [M.EVENT_TYPES.MODAL_OPENED] = {
    id = { type = "string", required = true },
    title = { type = "string" }
  },
  
  [M.EVENT_TYPES.MODAL_CLOSED] = {
    id = { type = "string", required = true }
  },
  
  [M.EVENT_TYPES.MODAL_CONFIRMED] = {
    id = { type = "string", required = true },
    data = { type = "table" }
  },
  
  [M.EVENT_TYPES.MODAL_CANCELLED] = {
    id = { type = "string", required = true }
  },
  
  -- Schema for notification events
  [M.EVENT_TYPES.NOTIFICATION_SHOWN] = {
    id = { type = "string", required = true },
    type = { type = "string", required = true },
    message = { type = "string", required = true },
    timeout = { type = "number" }
  },
  
  [M.EVENT_TYPES.NOTIFICATION_HIDDEN] = {
    id = { type = "string", required = true }
  },
  
  [M.EVENT_TYPES.NOTIFICATION_CLICKED] = {
    id = { type = "string", required = true }
  },
  
  [M.EVENT_TYPES.NOTIFICATION_ACTION_CLICKED] = {
    id = { type = "string", required = true },
    action_id = { type = "string", required = true }
  }
}

-- Validates an event according to its schema
function M.validate_event(event_type, data)
  local schema = M.EVENT_SCHEMAS[event_type]
  if not schema then
    return false, "Schema not defined for event: " .. event_type
  end
  
  local validation = require('vue-ui.utils.validation')
  return validation.validate(data, schema)
end

return M
