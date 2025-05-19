-- render.lua
-- Fonctions de rendu partagées pour les composants UI Vue

local M = {}

-- Styles de couleurs pour les composants
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

-- Crée un buffer flottant
function M.create_float(opts)
  opts = opts or {}
  
  -- Options par défaut
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
  
  -- Fusionner les options
  for k, v in pairs(opts) do
    default_opts[k] = v
  end
  
  -- Créer le buffer
  local buf = vim.api.nvim_create_buf(false, true)
  
  -- Configurer le buffer
  vim.api.nvim_buf_set_option(buf, 'bufhidden', 'wipe')
  
  -- Créer la fenêtre flottante
  local win = vim.api.nvim_open_win(buf, true, default_opts)
  
  -- Configurer la fenêtre
  vim.api.nvim_win_set_option(win, 'winblend', 0)
  vim.api.nvim_win_set_option(win, 'cursorline', true)
  
  return {
    buf = buf,
    win = win
  }
end

-- Crée un buffer flottant avec contenu
function M.create_floating_buffer(lines, opts)
  opts = opts or {}
  
  -- Calculer la position centrée si demandé
  if opts.centered then
    local uis = vim.api.nvim_list_uis()
    if #uis > 0 then
      local ui = uis[1]
      opts.row = math.floor((ui.height - opts.height) / 2)
      opts.col = math.floor((ui.width - opts.width) / 2)
    else
      -- Valeurs par défaut pour les tests headless
      opts.row = 5
      opts.col = 10
    end
  end
  
  -- Créer le buffer flottant
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
  
  -- Remplir le buffer avec les lignes
  vim.api.nvim_buf_set_lines(float.buf, 0, -1, false, lines)
  
  return float.buf, float.win
end

-- Applique un style à une ligne de texte
function M.apply_style(text, style_name)
  local style = styles[style_name] or styles.default
  return {
    {text, style.fg}
  }
end

-- Applique un style à un texte (pour les boutons, titres, etc.)
function M.style_text(text, style_name)
  local style = styles[style_name] or styles.default
  
  -- Ajouter des attributs spéciaux selon le style
  if style_name == 'primary' or style_name == 'primary_focused' then
    return text
  elseif style_name == 'secondary' or style_name == 'secondary_focused' then
    return text
  elseif style_name:find('_focused') then
    -- Ajouter un indicateur pour les éléments focusés
    return '> ' .. text .. ' <'
  else
    return text
  end
end

-- Dessine un cadre autour d'un texte
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

-- Centre un texte dans une largeur donnée
function M.center_text(text, width)
  local padding = math.floor((width - vim.fn.strdisplaywidth(text)) / 2)
  return string.rep(" ", padding) .. text .. string.rep(" ", width - padding - vim.fn.strdisplaywidth(text))
end

-- Crée une ligne de bordure (haut, milieu ou bas)
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

-- Crée une ligne de titre
function M.create_title_line(width, title, style_name)
  local style = styles[style_name] or styles.default
  local centered_title = M.center_text(title, width - 4)
  return "│ " .. centered_title .. " │"
end

-- Crée une ligne de contenu
function M.create_content_line(width, content, style_name)
  local style = styles[style_name] or styles.default
  local padded_content = content .. string.rep(" ", width - vim.fn.strdisplaywidth(content) - 4)
  return "│ " .. padded_content .. " │"
end

-- Crée une ligne de saisie (input)
function M.create_input_line(width, content, style_name)
  local style = styles[style_name] or styles.default
  local padded_content = content .. string.rep(" ", width - vim.fn.strdisplaywidth(content) - 4)
  return "│ " .. padded_content .. " │"
end

-- Crée une ligne de boutons
function M.create_buttons_line(width, buttons, style_name)
  local style = styles[style_name] or styles.default
  local buttons_text = table.concat(buttons, "  ")
  local padding = math.floor((width - vim.fn.strdisplaywidth(buttons_text) - 4) / 2)
  local padded_buttons = string.rep(" ", padding) .. buttons_text .. string.rep(" ", width - vim.fn.strdisplaywidth(buttons_text) - padding - 4)
  return "│ " .. padded_buttons .. " │"
end

-- Aligne un texte à gauche dans une largeur donnée
function M.left_align(text, width)
  return text .. string.rep(" ", width - vim.fn.strdisplaywidth(text))
end

-- Aligne un texte à droite dans une largeur donnée
function M.right_align(text, width)
  return string.rep(" ", width - vim.fn.strdisplaywidth(text)) .. text
end

-- Tronque un texte s'il dépasse une largeur donnée
function M.truncate(text, width)
  if vim.fn.strdisplaywidth(text) <= width then
    return text
  end
  
  return string.sub(text, 1, width - 3) .. "..."
end

-- Dessine un composant dans un buffer
function M.draw_component(buf, component, start_line)
  start_line = start_line or 0
  
  -- Vérifier que le composant a une méthode de rendu
  if not component.render then
    vim.api.nvim_echo({{"[VueUI] Le composant n'a pas de méthode de rendu", "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Obtenir le rendu du composant
  local rendered = component:render()
  
  -- Vérifier que le rendu est valide
  if not rendered or not rendered.lines then
    vim.api.nvim_echo({{"[VueUI] Rendu du composant invalide", "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Dessiner les lignes dans le buffer
  vim.api.nvim_buf_set_option(buf, 'modifiable', true)
  
  -- Effacer les lignes existantes si nécessaire
  if start_line == 0 then
    vim.api.nvim_buf_set_lines(buf, 0, -1, false, {})
  end
  
  -- Ajouter les nouvelles lignes
  vim.api.nvim_buf_set_lines(buf, start_line, start_line + #rendered.lines, false, rendered.lines)
  
  -- Appliquer les styles si présents
  if rendered.highlights then
    for _, hl in ipairs(rendered.highlights) do
      vim.api.nvim_buf_add_highlight(buf, -1, hl.group, hl.line, hl.col_start, hl.col_end)
    end
  end
  
  vim.api.nvim_buf_set_option(buf, 'modifiable', false)
  
  return true
end

-- Enregistre les styles personnalisés
function M.register_style(name, fg, bg)
  styles[name] = {
    fg = fg,
    bg = bg
  }
end

-- Récupère un style par son nom
function M.get_style(name)
  return styles[name] or styles.default
end

return M
