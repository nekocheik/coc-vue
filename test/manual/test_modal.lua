-- Manual test script for Modal component

-- Load dependencies
local vue_ui = require('vue-ui')
local event_bridge = require('vue-ui.utils.event_bridge')
local schema = require('vue-ui.events.schema')
local test_helpers = require('vue-ui.utils.test_helpers')
local Modal = require('vue-ui.components.modal')

-- Test environment configuration
vue_ui.setup({debug = true, log_events = true, log_path = vim.fn.stdpath('data') .. '/vue-ui-events_modal.json'})
vue_ui.clear_event_log()

-- Function to display test results
local function test_result(test_name, success, error_message)
  if success then
    print(string.format("[✓] %s: Success", test_name))
    return true
  else
    print(string.format("[✗] %s: Failed - %s", test_name, error_message))
    return false
  end
end

-- Function to check if an event was emitted
local function check_event_emitted(event_type, component_id)
  local events = test_helpers.get_test_events()
  for _, event in ipairs(events) do
    if event.event == event_type and event.data.component_id == component_id then
      return true
    end
  end
  return false
end

-- Test 1: Modal Creation
local function test_modal_creation()
  local modal_id = 'test_modal_' .. os.time()
  local modal = vue_ui.modal.create(modal_id, 'Test Modal', {
    width = 60,
    height = 10,
    content = 'This is a test content for the modal.',
    buttons = {
      { id = 'confirm', text = 'Confirm', style = 'primary' },
      { id = 'cancel', text = 'Cancel', style = 'secondary' }
    }
  })
  
  -- Vérifier que la modal a été créée
  if not test_result("Modal creation", modal ~= nil, "Modal was not created") then
    return nil
  end
  
  -- Vérifier que la modal est enregistrée
  if not test_result("Modal registration", event_bridge.get_component(modal_id) ~= nil, "Modal was not registered") then
    return nil
  end
  
  -- Vérifier que l'événement de création a été émis
  if not test_result("Creation event", check_event_emitted(schema.EVENT_TYPES.COMPONENT_CREATED, modal_id), "Creation event was not emitted") then
    return nil
  end
  
  return modal
end

-- Test 2: Modal Rendering
local function test_modal_render(modal)
  if not modal then return false end
  
  -- Rendre la modal
  local render_result = modal:render()
  
  -- Vérifier que le rendu a réussi
  if not test_result("Modal rendering", render_result ~= nil, "Rendering failed") then
    return false
  end
  
  -- Vérifier que le rendu contient des lignes
  if not test_result("Rendering lines", #render_result.lines > 0, "Rendering contains no lines") then
    return false
  end
  
  -- Vérifier que le rendu contient le titre
  local title_found = false
  for _, line in ipairs(render_result.lines) do
    if line:find('Test Modal') then
      title_found = true
      break
    end
  end
  if not test_result("Title in rendering", title_found, "Title is not present in rendering") then
    return false
  end
  
  -- Vérifier que le rendu contient le contenu
  local content_found = false
  for _, line in ipairs(render_result.lines) do
    if line:find('This is a test content for the modal') then
      content_found = true
      break
    end
  end
  if not test_result("Content in rendering", content_found, "Content is not present in rendering") then
    return false
  end
  
  return true
end

-- Test 3: Modal Opening
local function test_modal_open(modal)
  if not modal then return false end
  
  -- Ouvrir la modal
  local open_result = modal:open()
  
  -- Vérifier que l'ouverture a réussi
  if not test_result("Modal opening", open_result == true, "Opening failed") then
    return false
  end
  
  -- Vérifier que la modal est ouverte
  if not test_result("Open state", modal.is_open == true, "Modal is not in open state") then
    return false
  end
  
  -- Vérifier que l'événement d'ouverture a été émis
  if not test_result("Open event", check_event_emitted(schema.EVENT_TYPES.MODAL_OPENED, modal.id), "Open event was not emitted") then
    return false
  end
  
  return true
end

-- Test 4: Button Navigation
local function test_modal_navigation(modal)
  if not modal then return false end
  
  -- Naviguer vers le bouton suivant
  local next_result = modal:focus_next_button()
  
  -- Vérifier que la navigation a réussi
  if not test_result("Next button navigation", next_result == true, "Navigation failed") then
    return false
  end
  
  -- Vérifier que le focus est sur le premier bouton
  if not test_result("Focus on first button", modal.focused_button_index == 0, "Focus is not on first button") then
    return false
  end
  
  -- Naviguer vers le bouton suivant encore
  local next_result2 = modal:focus_next_button()
  
  -- Vérifier que la navigation a réussi
  if not test_result("Second button navigation", next_result2 == true, "Navigation failed") then
    return false
  end
  
  -- Vérifier que le focus est sur le deuxième bouton
  if not test_result("Focus on second button", modal.focused_button_index == 1, "Focus is not on second button") then
    return false
  end
  
  -- Naviguer vers le bouton précédent
  local prev_result = modal:focus_prev_button()
  
  -- Vérifier que la navigation a réussi
  if not test_result("Previous button navigation", prev_result == true, "Navigation failed") then
    return false
  end
  
  -- Vérifier que le focus est revenu sur le premier bouton
  if not test_result("Focus back on first button", modal.focused_button_index == 0, "Focus is not back on first button") then
    return false
  end
  
  return true
end

-- Test 5: Modal Confirmation
local function test_modal_confirm(modal)
  if not modal then return false end
  
  -- Confirmer la modal
  local confirm_result = modal:confirm()
  
  -- Vérifier que la confirmation a réussi
  if not test_result("Modal confirmation", confirm_result == true, "Confirmation failed") then
    return false
  end
  
  -- Vérifier que la modal est fermée
  if not test_result("Modal closed after confirmation", modal.is_open == false, "Modal is still open after confirmation") then
    return false
  end
  
  -- Vérifier que l'événement de confirmation a été émis
  if not test_result("Confirmation event", check_event_emitted(schema.EVENT_TYPES.MODAL_CONFIRMED, modal.id), "Confirmation event was not emitted") then
    return false
  end
  
  return true
end

-- Test 6: Reopening and Cancellation
local function test_modal_reopen_cancel(modal)
  if not modal then return false end
  
  -- Rouvrir la modal
  local open_result = modal:open()
  
  -- Vérifier que la réouverture a réussi
  if not test_result("Modal reopening", open_result == true, "Reopening failed") then
    return false
  end
  
  -- Vérifier que la modal est ouverte
  if not test_result("Modal reopened", modal.is_open == true, "Modal is not in open state after reopening") then
    return false
  end
  
  -- Annuler la modal
  local cancel_result = modal:cancel()
  
  -- Vérifier que l'annulation a réussi
  if not test_result("Modal cancellation", cancel_result == true, "Cancellation failed") then
    return false
  end
  
  -- Vérifier que la modal est fermée
  if not test_result("Modal closed after cancellation", modal.is_open == false, "Modal is still open after cancellation") then
    return false
  end
  
  -- Vérifier que l'événement d'annulation a été émis
  if not test_result("Cancellation event", check_event_emitted(schema.EVENT_TYPES.MODAL_CANCELLED, modal.id), "Cancellation event was not emitted") then
    return false
  end
  
  return true
end

-- Test 7: Modal with Input Field
local function test_modal_with_input()
  local modal_id = 'test_modal_input_' .. os.time()
  local modal = vue_ui.modal.create(modal_id, 'Modal with Input', {
    width = 60,
    height = 15,
    content = 'Please enter a value:',
    input = {
      id = 'test_input',
      label = 'Value:',
      value = '',
      placeholder = 'Enter a value...'
    },
    buttons = {
      { id = 'submit', text = 'Submit', style = 'primary' },
      { id = 'cancel', text = 'Cancel', style = 'secondary' }
    }
  })
  
  -- Vérifier que la modal a été créée
  if not test_result("Modal with input creation", modal ~= nil, "Modal with input was not created") then
    return nil
  end
  
  -- Ouvrir la modal
  local open_result = modal:open()
  if not test_result("Opening of the modal with input", open_result == true, "Opening of the modal with input failed") then
    return nil
  end
  
  -- Activer le champ de saisie
  local focus_input_result = modal:focus_input()
  if not test_result("Field focus state", modal.input_focused == true, "Input field is not focused") then
    return nil
  end
  
  -- Simuler une saisie
  local set_input_result = modal:set_input_value("Test value")
  if not test_result("Value update", set_input_result == true, "Input field value update failed") then
    return nil
  end
  
  -- Vérifier que la valeur a été mise à jour
  if not test_result("Value update", modal.input_value == "Test value", "Input field value was not updated") then
    return nil
  end
  
  -- Vérifier que l'événement de changement d'input a été émis
  if not test_result("Input change event", check_event_emitted(schema.EVENT_TYPES.INPUT_CHANGED, modal_id), "Input change event was not emitted") then
    return nil
  end
  
  -- Confirmer la modal avec input
  local confirm_result = modal:confirm()
  if not test_result("Modal confirmation", confirm_result == true, "Confirmation of the modal with input failed") then
    return nil
  end
  
  -- Vérifier que l'événement de confirmation avec input a été émis
  local events = event_bridge._get_events_for_test()
  local found = false
  for _, event in ipairs(events or {}) do
    if event.event == schema.EVENT_TYPES.MODAL_CONFIRMED and 
       event.data.id == modal_id and 
       event.data.input_value == "Test value" then
      found = true
      break
    end
  end
  if not test_result("Confirmation event with input", found, "Confirmation event with input was not emitted correctly") then
    return nil
  end
  
  return modal
end

-- Test 8: Modal Destruction
local function test_modal_destruction(modal1, modal2)
  if not modal1 or not modal2 then return false end
  
  -- Détruire la première modal
  local destroy_result1 = modal1:destroy()
  if not test_result("Destruction of the first modal", destroy_result1 == true, "Destruction of the first modal failed") then
    return false
  end
  
  -- Vérifier que la première modal a été supprimée du registre
  if not test_result("Registry removal (modal 1)", event_bridge.get_component(modal1.id) == nil, "First modal was not removed from registry") then
    return false
  end
  
  -- Détruire la deuxième modal
  local destroy_result2 = modal2:destroy()
  if not test_result("Destruction of the second modal", destroy_result2 == true, "Destruction of the second modal failed") then
    return false
  end
  
  -- Vérifier que la deuxième modal a été supprimée du registre
  if not test_result("Registry removal (modal 2)", event_bridge.get_component(modal2.id) == nil, "Second modal was not removed from registry") then
    return false
  end
  
  -- Vérifier que les événements de destruction ont été émis
  local events = event_bridge._get_events_for_test()
  local found1, found2 = false, false
  for _, event in ipairs(events or {}) do
    if event.event == schema.EVENT_TYPES.COMPONENT_DESTROYED then
      if event.data.id == modal1.id then found1 = true end
      if event.data.id == modal2.id then found2 = true end
    end
  end
  
  if not test_result("Destruction event (modal 1)", found1, "First modal destruction event was not emitted") then
    return false
  end
  
  if not test_result("Destruction event (modal 2)", found2, "Second modal destruction event was not emitted") then
    return false
  end
  
  return true
end

print("\n=== Modal Component Tests ===\n")

-- Test 1: Modal Creation
local modal = test_modal_creation()
if not modal then
  print("\n❌ Test failure: modal creation failed")
  return
end

-- Test 2: Modal Rendering
if not test_modal_render(modal) then
  print("\n❌ Test failure: modal rendering failed")
  return
end

-- Test 3: Modal Opening
if not test_modal_open(modal) then
  print("\n❌ Test failure: modal opening failed")
  return
end

-- Test 4: Button Navigation
if not test_modal_navigation(modal) then
  print("\n❌ Test failure: button navigation failed")
  return
end

-- Test 5: Modal Confirmation
if not test_modal_confirm(modal) then
  print("\n❌ Test failure: modal confirmation failed")
  return
end

-- Test 6: Reopening and Cancellation
if not test_modal_reopen_cancel(modal) then
  print("\n❌ Test failure: modal reopening and cancellation failed")
  return
end

-- Test 7: Modal with Input Field
local modal_input = test_modal_with_input()
if not modal_input then
  print("\n❌ Test failure: modal with input field failed")
  return
end

-- Test 8: Modal Destruction
if not test_modal_destruction(modal, modal_input) then
  print("\n❌ Test failure: modal destruction failed")
  return
end

-- Save event log
vue_ui.save_event_log('modal')
print("\n✅ All tests passed!")
