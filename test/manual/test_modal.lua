-- test_modal.lua
-- Script de test manuel pour le composant Modal

-- Charger les dépendances
local vue_ui = require('vue-ui')
local event_bridge = require('vue-ui.utils.event_bridge')
local schema = require('vue-ui.events.schema')

-- Configuration de l'environnement de test
vue_ui.setup({debug = true, log_events = true, log_path = vim.fn.stdpath('data') .. '/vue-ui-events_modal.json'})
vue_ui.clear_event_log()

-- Fonction pour afficher les résultats de test
local function test_result(name, result, message)
  if result then
    print(string.format("✅ Test réussi: %s", name))
  else
    print(string.format("❌ Test échoué: %s - %s", name, message or ""))
  end
  return result
end

-- Fonction pour vérifier si un événement a été émis
local function check_event_emitted(event_type, id)
  local events = event_bridge._get_events_for_test()
  for _, event in ipairs(events or {}) do
    if event.event == event_type and event.data.id == id then
      return true
    end
  end
  return false
end

-- Test 1: Création de la modal
local function test_modal_creation()
  local modal_id = 'test_modal_' .. os.time()
  local modal = vue_ui.modal.create(modal_id, 'Test Modal', {
    width = 60,
    height = 10,
    content = 'Ceci est un contenu de test pour la modal.',
    buttons = {
      { id = 'confirm', text = 'Confirmer', style = 'primary' },
      { id = 'cancel', text = 'Annuler', style = 'secondary' }
    }
  })
  
  -- Vérifier que la modal a été créée
  if not test_result("Création de la modal", modal ~= nil, "La modal n'a pas été créée") then
    return nil
  end
  
  -- Vérifier que la modal est enregistrée
  if not test_result("Enregistrement de la modal", event_bridge.get_component(modal_id) ~= nil, "La modal n'a pas été enregistrée") then
    return nil
  end
  
  -- Vérifier que l'événement de création a été émis
  if not test_result("Événement de création", check_event_emitted(schema.EVENT_TYPES.COMPONENT_CREATED, modal_id), "L'événement de création n'a pas été émis") then
    return nil
  end
  
  return modal
end

-- Test 2: Rendu de la modal
local function test_modal_render(modal)
  if not modal then return false end
  
  -- Rendre la modal
  local render_result = modal:render()
  
  -- Vérifier que le rendu a réussi
  if not test_result("Rendu de la modal", render_result ~= nil, "Le rendu a échoué") then
    return false
  end
  
  -- Vérifier que le rendu contient des lignes
  if not test_result("Lignes de rendu", #render_result.lines > 0, "Le rendu ne contient pas de lignes") then
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
  if not test_result("Titre dans le rendu", title_found, "Le titre n'est pas présent dans le rendu") then
    return false
  end
  
  -- Vérifier que le rendu contient le contenu
  local content_found = false
  for _, line in ipairs(render_result.lines) do
    if line:find('Ceci est un contenu de test pour la modal') then
      content_found = true
      break
    end
  end
  if not test_result("Contenu dans le rendu", content_found, "Le contenu n'est pas présent dans le rendu") then
    return false
  end
  
  return true
end

-- Test 3: Ouverture de la modal
local function test_modal_open(modal)
  if not modal then return false end
  
  -- Ouvrir la modal
  local open_result = modal:open()
  
  -- Vérifier que l'ouverture a réussi
  if not test_result("Ouverture de la modal", open_result == true, "L'ouverture a échoué") then
    return false
  end
  
  -- Vérifier que la modal est ouverte
  if not test_result("État ouvert", modal.is_open == true, "La modal n'est pas en état ouvert") then
    return false
  end
  
  -- Vérifier que l'événement d'ouverture a été émis
  if not test_result("Événement d'ouverture", check_event_emitted(schema.EVENT_TYPES.MODAL_OPENED, modal.id), "L'événement d'ouverture n'a pas été émis") then
    return false
  end
  
  return true
end

-- Test 4: Navigation entre les boutons
local function test_modal_navigation(modal)
  if not modal then return false end
  
  -- Naviguer vers le bouton suivant
  local next_result = modal:focus_next_button()
  
  -- Vérifier que la navigation a réussi
  if not test_result("Navigation vers le bouton suivant", next_result == true, "La navigation a échoué") then
    return false
  end
  
  -- Vérifier que le focus est sur le premier bouton
  if not test_result("Focus sur le premier bouton", modal.focused_button_index == 0, "Le focus n'est pas sur le premier bouton") then
    return false
  end
  
  -- Naviguer vers le bouton suivant encore
  local next_result2 = modal:focus_next_button()
  
  -- Vérifier que la navigation a réussi
  if not test_result("Navigation vers le deuxième bouton", next_result2 == true, "La navigation a échoué") then
    return false
  end
  
  -- Vérifier que le focus est sur le deuxième bouton
  if not test_result("Focus sur le deuxième bouton", modal.focused_button_index == 1, "Le focus n'est pas sur le deuxième bouton") then
    return false
  end
  
  -- Naviguer vers le bouton précédent
  local prev_result = modal:focus_prev_button()
  
  -- Vérifier que la navigation a réussi
  if not test_result("Navigation vers le bouton précédent", prev_result == true, "La navigation a échoué") then
    return false
  end
  
  -- Vérifier que le focus est revenu sur le premier bouton
  if not test_result("Focus revenu sur le premier bouton", modal.focused_button_index == 0, "Le focus n'est pas revenu sur le premier bouton") then
    return false
  end
  
  return true
end

-- Test 5: Confirmation de la modal
local function test_modal_confirm(modal)
  if not modal then return false end
  
  -- Confirmer la modal
  local confirm_result = modal:confirm()
  
  -- Vérifier que la confirmation a réussi
  if not test_result("Confirmation de la modal", confirm_result == true, "La confirmation a échoué") then
    return false
  end
  
  -- Vérifier que la modal est fermée
  if not test_result("Modal fermée après confirmation", modal.is_open == false, "La modal est toujours ouverte après confirmation") then
    return false
  end
  
  -- Vérifier que l'événement de confirmation a été émis
  if not test_result("Événement de confirmation", check_event_emitted(schema.EVENT_TYPES.MODAL_CONFIRMED, modal.id), "L'événement de confirmation n'a pas été émis") then
    return false
  end
  
  return true
end

-- Test 6: Réouverture et annulation
local function test_modal_reopen_cancel(modal)
  if not modal then return false end
  
  -- Rouvrir la modal
  local open_result = modal:open()
  
  -- Vérifier que la réouverture a réussi
  if not test_result("Réouverture de la modal", open_result == true, "La réouverture a échoué") then
    return false
  end
  
  -- Vérifier que la modal est ouverte
  if not test_result("Modal réouverte", modal.is_open == true, "La modal n'est pas en état ouvert après réouverture") then
    return false
  end
  
  -- Annuler la modal
  local cancel_result = modal:cancel()
  
  -- Vérifier que l'annulation a réussi
  if not test_result("Annulation de la modal", cancel_result == true, "L'annulation a échoué") then
    return false
  end
  
  -- Vérifier que la modal est fermée
  if not test_result("Modal fermée après annulation", modal.is_open == false, "La modal est toujours ouverte après annulation") then
    return false
  end
  
  -- Vérifier que l'événement d'annulation a été émis
  if not test_result("Événement d'annulation", check_event_emitted(schema.EVENT_TYPES.MODAL_CANCELLED, modal.id), "L'événement d'annulation n'a pas été émis") then
    return false
  end
  
  return true
end

-- Test 7: Modal avec champ de saisie
local function test_modal_with_input()
  local modal_id = 'test_modal_input_' .. os.time()
  local modal = vue_ui.modal.create(modal_id, 'Modal avec Input', {
    width = 60,
    height = 15,
    content = 'Veuillez saisir une valeur:',
    input = {
      id = 'test_input',
      label = 'Valeur:',
      value = '',
      placeholder = 'Entrez une valeur...'
    },
    buttons = {
      { id = 'submit', text = 'Soumettre', style = 'primary' },
      { id = 'cancel', text = 'Annuler', style = 'secondary' }
    }
  })
  
  -- Vérifier que la modal a été créée
  if not test_result("Création de la modal avec input", modal ~= nil, "La modal avec input n'a pas été créée") then
    return nil
  end
  
  -- Ouvrir la modal
  local open_result = modal:open()
  if not test_result("Ouverture de la modal avec input", open_result == true, "L'ouverture de la modal avec input a échoué") then
    return nil
  end
  
  -- Activer le champ de saisie
  local focus_input_result = modal:focus_input()
  if not test_result("Focus sur le champ de saisie", focus_input_result == true, "La mise au focus du champ de saisie a échoué") then
    return nil
  end
  
  -- Vérifier que le champ est en focus
  if not test_result("État de focus du champ", modal.input_focused == true, "Le champ de saisie n'est pas en focus") then
    return nil
  end
  
  -- Simuler une saisie
  local set_input_result = modal:set_input_value("Valeur de test")
  if not test_result("Saisie de valeur", set_input_result == true, "La mise à jour de la valeur du champ de saisie a échoué") then
    return nil
  end
  
  -- Vérifier que la valeur a été mise à jour
  if not test_result("Mise à jour de la valeur", modal.input_value == "Valeur de test", "La valeur du champ de saisie n'a pas été mise à jour") then
    return nil
  end
  
  -- Vérifier que l'événement de changement d'input a été émis
  if not test_result("Événement de changement d'input", check_event_emitted(schema.EVENT_TYPES.INPUT_CHANGED, modal_id), "L'événement de changement d'input n'a pas été émis") then
    return nil
  end
  
  -- Confirmer la modal avec input
  local confirm_result = modal:confirm()
  if not test_result("Confirmation de la modal avec input", confirm_result == true, "La confirmation de la modal avec input a échoué") then
    return nil
  end
  
  -- Vérifier que l'événement de confirmation avec input a été émis
  local events = event_bridge._get_events_for_test()
  local found = false
  for _, event in ipairs(events or {}) do
    if event.event == schema.EVENT_TYPES.MODAL_CONFIRMED and 
       event.data.id == modal_id and 
       event.data.input_value == "Valeur de test" then
      found = true
      break
    end
  end
  if not test_result("Événement de confirmation avec input", found, "L'événement de confirmation avec input n'a pas été émis correctement") then
    return nil
  end
  
  return modal
end

-- Test 8: Destruction des modals
local function test_modal_destruction(modal1, modal2)
  if not modal1 or not modal2 then return false end
  
  -- Détruire la première modal
  local destroy_result1 = modal1:destroy()
  if not test_result("Destruction de la première modal", destroy_result1 == true, "La destruction de la première modal a échoué") then
    return false
  end
  
  -- Vérifier que la première modal a été supprimée du registre
  if not test_result("Suppression du registre (modal 1)", event_bridge.get_component(modal1.id) == nil, "La première modal n'a pas été supprimée du registre") then
    return false
  end
  
  -- Détruire la deuxième modal
  local destroy_result2 = modal2:destroy()
  if not test_result("Destruction de la deuxième modal", destroy_result2 == true, "La destruction de la deuxième modal a échoué") then
    return false
  end
  
  -- Vérifier que la deuxième modal a été supprimée du registre
  if not test_result("Suppression du registre (modal 2)", event_bridge.get_component(modal2.id) == nil, "La deuxième modal n'a pas été supprimée du registre") then
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
  
  if not test_result("Événement de destruction (modal 1)", found1, "L'événement de destruction de la première modal n'a pas été émis") then
    return false
  end
  
  if not test_result("Événement de destruction (modal 2)", found2, "L'événement de destruction de la deuxième modal n'a pas été émis") then
    return false
  end
  
  return true
end

-- Exécuter tous les tests
print("\n=== Tests du composant Modal ===\n")

-- Test 1: Création de la modal
local modal = test_modal_creation()
if not modal then
  print("\n❌ Échec des tests: la création de la modal a échoué")
  return
end

-- Test 2: Rendu de la modal
if not test_modal_render(modal) then
  print("\n❌ Échec des tests: le rendu de la modal a échoué")
  return
end

-- Test 3: Ouverture de la modal
if not test_modal_open(modal) then
  print("\n❌ Échec des tests: l'ouverture de la modal a échoué")
  return
end

-- Test 4: Navigation entre les boutons
if not test_modal_navigation(modal) then
  print("\n❌ Échec des tests: la navigation entre les boutons a échoué")
  return
end

-- Test 5: Confirmation de la modal
if not test_modal_confirm(modal) then
  print("\n❌ Échec des tests: la confirmation de la modal a échoué")
  return
end

-- Test 6: Réouverture et annulation
if not test_modal_reopen_cancel(modal) then
  print("\n❌ Échec des tests: la réouverture et l'annulation de la modal ont échoué")
  return
end

-- Test 7: Modal avec champ de saisie
local modal_input = test_modal_with_input()
if not modal_input then
  print("\n❌ Échec des tests: la modal avec champ de saisie a échoué")
  return
end

-- Test 8: Destruction des modals
if not test_modal_destruction(modal, modal_input) then
  print("\n❌ Échec des tests: la destruction des modals a échoué")
  return
end

-- Sauvegarder le journal des événements
vue_ui.save_event_log('modal')
print("\nJournal des événements sauvegardé dans " .. vim.fn.stdpath('data') .. '/vue-ui-events_modal.json')

print("\n✅ Tous les tests ont réussi!")
