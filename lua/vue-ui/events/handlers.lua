-- handlers.lua
-- Gestionnaires d'événements pour les composants UI Vue

local M = {}
local event_bridge = require('vue-ui.utils.event_bridge')
local schema = require('vue-ui.events.schema')

-- Gestionnaire pour les événements de création de composant
M[schema.EVENT_TYPES.COMPONENT_CREATED] = function(data)
  -- Récupérer le type de composant
  local component_type = data.component_type
  
  -- Charger le module du composant
  local ok, component_module = pcall(require, 'vue-ui.components.' .. component_type)
  if not ok then
    vim.api.nvim_echo({{"[VueUI] Module de composant non trouvé: " .. component_type, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Vérifier si le composant existe déjà
  local existing = event_bridge.get_component(data.id)
  if existing then
    vim.api.nvim_echo({{"[VueUI] Un composant avec cet ID existe déjà: " .. data.id, "WarningMsg"}}, false, {})
    return false
  end
  
  -- Créer le composant
  if component_module.create_from_data then
    local component = component_module.create_from_data(data)
    if component then
      return true
    end
  end
  
  return false
end

-- Gestionnaire pour les événements de mise à jour de composant
M[schema.EVENT_TYPES.COMPONENT_UPDATED] = function(data)
  -- Récupérer le composant
  local component = event_bridge.get_component(data.id)
  if not component then
    vim.api.nvim_echo({{"[VueUI] Composant non trouvé: " .. data.id, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Mettre à jour le composant
  if component.update then
    return component:update(data.changes)
  end
  
  return false
end

-- Gestionnaire pour les événements de destruction de composant
M[schema.EVENT_TYPES.COMPONENT_DESTROYED] = function(data)
  -- Récupérer le composant
  local component = event_bridge.get_component(data.id)
  if not component then
    vim.api.nvim_echo({{"[VueUI] Composant non trouvé: " .. data.id, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Détruire le composant
  if component.destroy then
    local success = component:destroy()
    if success then
      event_bridge.unregister_component(data.id)
      return true
    end
  else
    -- Si pas de méthode destroy, simplement supprimer du registre
    event_bridge.unregister_component(data.id)
    return true
  end
  
  return false
end

-- Gestionnaire pour les événements de focus de composant
M[schema.EVENT_TYPES.COMPONENT_FOCUSED] = function(data)
  -- Récupérer le composant
  local component = event_bridge.get_component(data.id)
  if not component then
    vim.api.nvim_echo({{"[VueUI] Composant non trouvé: " .. data.id, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Donner le focus au composant
  if component.focus then
    return component:focus()
  end
  
  return false
end

-- Gestionnaire pour les événements de perte de focus de composant
M[schema.EVENT_TYPES.COMPONENT_BLURRED] = function(data)
  -- Récupérer le composant
  local component = event_bridge.get_component(data.id)
  if not component then
    vim.api.nvim_echo({{"[VueUI] Composant non trouvé: " .. data.id, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Retirer le focus du composant
  if component.blur then
    return component:blur()
  end
  
  return false
end

-- Gestionnaire pour les événements de clic sur un bouton
M[schema.EVENT_TYPES.BUTTON_CLICKED] = function(data)
  -- Récupérer le composant
  local component = event_bridge.get_component(data.id)
  if not component then
    vim.api.nvim_echo({{"[VueUI] Bouton non trouvé: " .. data.id, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Cliquer sur le bouton
  if component.click then
    return component:click()
  end
  
  return false
end

-- Gestionnaire pour les événements de changement de valeur d'un champ de saisie
M[schema.EVENT_TYPES.INPUT_CHANGED] = function(data)
  -- Récupérer le composant
  local component = event_bridge.get_component(data.id)
  if not component then
    vim.api.nvim_echo({{"[VueUI] Champ de saisie non trouvé: " .. data.id, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Mettre à jour la valeur
  if component.set_value then
    return component:set_value(data.value)
  end
  
  return false
end

-- Gestionnaire pour les événements de soumission d'un champ de saisie
M[schema.EVENT_TYPES.INPUT_SUBMITTED] = function(data)
  -- Récupérer le composant
  local component = event_bridge.get_component(data.id)
  if not component then
    vim.api.nvim_echo({{"[VueUI] Champ de saisie non trouvé: " .. data.id, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Soumettre la valeur
  if component.submit then
    return component:submit()
  end
  
  return false
end

-- Gestionnaire pour les événements d'annulation d'un champ de saisie
M[schema.EVENT_TYPES.INPUT_CANCELLED] = function(data)
  -- Récupérer le composant
  local component = event_bridge.get_component(data.id)
  if not component then
    vim.api.nvim_echo({{"[VueUI] Champ de saisie non trouvé: " .. data.id, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Annuler la saisie
  if component.cancel then
    return component:cancel()
  end
  
  return false
end

-- Gestionnaire pour les événements de sélection d'un élément de liste
M[schema.EVENT_TYPES.LIST_ITEM_SELECTED] = function(data)
  -- Récupérer le composant
  local component = event_bridge.get_component(data.id)
  if not component then
    vim.api.nvim_echo({{"[VueUI] Liste non trouvée: " .. data.id, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Sélectionner l'élément
  if component.select_item then
    return component:select_item(data.item_index)
  end
  
  return false
end

-- Gestionnaire pour les événements d'ouverture d'une modale
M[schema.EVENT_TYPES.MODAL_OPENED] = function(data)
  -- Récupérer le composant
  local component = event_bridge.get_component(data.id)
  if not component then
    -- Si la modale n'existe pas encore, la créer
    local ok, modal_module = pcall(require, 'vue-ui.components.modal')
    if not ok then
      vim.api.nvim_echo({{"[VueUI] Module de modale non trouvé", "ErrorMsg"}}, false, {})
      return false
    end
    
    -- Créer la modale
    local modal = modal_module.create(data.id, data.title or "Modal", data.content, data.options)
    if modal then
      -- Ouvrir la modale
      if modal.open then
        return modal:open()
      end
    end
    
    return false
  end
  
  -- Ouvrir la modale existante
  if component.open then
    return component:open()
  end
  
  return false
end

-- Gestionnaire pour les événements de fermeture d'une modale
M[schema.EVENT_TYPES.MODAL_CLOSED] = function(data)
  -- Récupérer le composant
  local component = event_bridge.get_component(data.id)
  if not component then
    vim.api.nvim_echo({{"[VueUI] Modale non trouvée: " .. data.id, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Fermer la modale
  if component.close then
    return component:close()
  end
  
  return false
end

-- Gestionnaire pour les événements d'affichage d'une notification
M[schema.EVENT_TYPES.NOTIFICATION_SHOWN] = function(data)
  -- Charger le module de notification
  local ok, notification_module = pcall(require, 'vue-ui.components.notification')
  if not ok then
    vim.api.nvim_echo({{"[VueUI] Module de notification non trouvé", "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Afficher la notification
  return notification_module.show(data.id, data.type, data.message, data.timeout, data.actions)
end

-- Gestionnaire par défaut pour les événements non gérés
M.default = function(event_type, data)
  vim.api.nvim_echo({{"[VueUI] Événement non géré: " .. event_type, "WarningMsg"}}, false, {})
  return false
end

-- Fonction pour dispatcher un événement
function M.dispatch(event_type, data)
  -- Valider l'événement
  local valid, error_message = schema.validate_event(event_type, data)
  if not valid then
    vim.api.nvim_echo({{"[VueUI] Événement invalide: " .. error_message, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Dispatcher l'événement au gestionnaire approprié
  local handler = M[event_type] or M.default
  return handler(data)
end

return M
