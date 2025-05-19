-- validation.lua
-- Fonctions de validation des données pour les composants UI Vue

local M = {}

-- Vérifie si une valeur est nil ou vide
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

-- Valide qu'une valeur n'est pas vide, lance une erreur si c'est le cas
function M.validate_not_empty(value, error_message)
  if M.is_empty(value) then
    error(error_message or "La valeur ne peut pas être vide", 2)
  end
  return value
end

-- Valide qu'une valeur est une table, lance une erreur si ce n'est pas le cas
function M.validate_table(value, error_message)
  if type(value) ~= "table" then
    error(error_message or "La valeur doit être une table", 2)
  end
  return value
end

-- Valide qu'une valeur est une table ou nil, lance une erreur si ce n'est pas le cas
function M.validate_table_optional(value, error_message)
  if value ~= nil and type(value) ~= "table" then
    error(error_message or "La valeur doit être une table ou nil", 2)
  end
  return value
end

-- Vérifie si une valeur est du type spécifié
function M.is_type(value, expected_type)
  if expected_type == "array" then
    return type(value) == "table" and #value > 0
  end
  
  if expected_type == "object" then
    return type(value) == "table" and next(value) ~= nil and not M.is_array(value)
  end
  
  return type(value) == expected_type
end

-- Vérifie si une table est un tableau
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

-- Vérifie si une valeur est comprise dans un ensemble de valeurs
function M.is_one_of(value, values)
  for _, v in ipairs(values) do
    if value == v then
      return true
    end
  end
  
  return false
end

-- Vérifie si une valeur est un nombre valide
function M.is_number(value)
  return type(value) == "number"
end

-- Vérifie si une valeur est un nombre entier
function M.is_integer(value)
  return type(value) == "number" and math.floor(value) == value
end

-- Vérifie si une valeur est un nombre positif
function M.is_positive(value)
  return type(value) == "number" and value > 0
end

-- Vérifie si une valeur est un nombre négatif
function M.is_negative(value)
  return type(value) == "number" and value < 0
end

-- Vérifie si une valeur est un nombre entre min et max
function M.is_between(value, min, max)
  return type(value) == "number" and value >= min and value <= max
end

-- Vérifie si une chaîne correspond à un motif
function M.matches_pattern(value, pattern)
  if type(value) ~= "string" then
    return false
  end
  
  return string.match(value, pattern) ~= nil
end

-- Vérifie si une valeur est un identifiant valide
function M.is_valid_id(value)
  if type(value) ~= "string" then
    return false
  end
  
  return string.match(value, "^[a-zA-Z0-9_%-]+$") ~= nil
end

-- Valide un objet selon un schéma
function M.validate(obj, schema)
  if not obj or not schema then
    return false, "Objet ou schéma manquant"
  end
  
  local errors = {}
  
  for field, rules in pairs(schema) do
    -- Vérifier si le champ est requis
    if rules.required and M.is_empty(obj[field]) then
      table.insert(errors, field .. " est requis")
    end
    
    -- Si le champ est présent, vérifier son type
    if not M.is_empty(obj[field]) and rules.type and not M.is_type(obj[field], rules.type) then
      table.insert(errors, field .. " doit être de type " .. rules.type)
    end
    
    -- Vérifier les valeurs possibles
    if not M.is_empty(obj[field]) and rules.values and not M.is_one_of(obj[field], rules.values) then
      table.insert(errors, field .. " doit être l'une des valeurs suivantes: " .. table.concat(rules.values, ", "))
    end
    
    -- Vérifier le motif
    if not M.is_empty(obj[field]) and rules.pattern and not M.matches_pattern(obj[field], rules.pattern) then
      table.insert(errors, field .. " ne correspond pas au motif requis")
    end
    
    -- Vérifier les limites pour les nombres
    if not M.is_empty(obj[field]) and rules.min and obj[field] < rules.min then
      table.insert(errors, field .. " doit être supérieur ou égal à " .. rules.min)
    end
    
    if not M.is_empty(obj[field]) and rules.max and obj[field] > rules.max then
      table.insert(errors, field .. " doit être inférieur ou égal à " .. rules.max)
    end
    
    -- Vérifier les limites pour les chaînes
    if not M.is_empty(obj[field]) and type(obj[field]) == "string" and rules.minLength and #obj[field] < rules.minLength then
      table.insert(errors, field .. " doit contenir au moins " .. rules.minLength .. " caractères")
    end
    
    if not M.is_empty(obj[field]) and type(obj[field]) == "string" and rules.maxLength and #obj[field] > rules.maxLength then
      table.insert(errors, field .. " doit contenir au plus " .. rules.maxLength .. " caractères")
    end
    
    -- Vérifier les limites pour les tableaux
    if not M.is_empty(obj[field]) and M.is_array(obj[field]) and rules.minItems and #obj[field] < rules.minItems then
      table.insert(errors, field .. " doit contenir au moins " .. rules.minItems .. " éléments")
    end
    
    if not M.is_empty(obj[field]) and M.is_array(obj[field]) and rules.maxItems and #obj[field] > rules.maxItems then
      table.insert(errors, field .. " doit contenir au plus " .. rules.maxItems .. " éléments")
    end
  end
  
  if #errors > 0 then
    return false, table.concat(errors, ", ")
  end
  
  return true, nil
end

return M
