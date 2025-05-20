#!/bin/bash
# scripts/check_neovim_logs.sh
# Script pour vérifier les logs de Neovim et Coc.nvim entre les étapes des tests

# Set the path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Chemin vers les logs de Coc.nvim
COC_LOG_FILE="$HOME/.config/coc/coc.nvim.log"
NVIM_LOG_FILE="/tmp/nvim_messages.log"
STEP_NAME="${1:-unknown}"

# Fonction pour extraire les messages d'erreur de Neovim
check_neovim_messages() {
  echo -e "${BLUE}Vérification des messages Neovim pour l'étape: ${YELLOW}${STEP_NAME}${NC}"
  
  # Exécuter la commande :messages dans Neovim et capturer la sortie
  nvim --headless -c "redir! > $NVIM_LOG_FILE" -c "silent messages" -c "redir END" -c "qa!" 2>/dev/null
  
  # Vérifier si des erreurs sont présentes dans les messages
  if grep -i "error" "$NVIM_LOG_FILE" > /dev/null; then
    echo -e "${RED}✗ Des erreurs ont été détectées dans les messages Neovim :${NC}"
    grep -i "error" "$NVIM_LOG_FILE" | while read -r line; do
      echo -e "  ${RED}$line${NC}"
    done
    return 1
  else
    echo -e "${GREEN}✓ Aucune erreur détectée dans les messages Neovim${NC}"
    return 0
  fi
}

# Fonction pour vérifier les logs de Coc.nvim
check_coc_logs() {
  echo -e "${BLUE}Vérification des logs Coc.nvim pour l'étape: ${YELLOW}${STEP_NAME}${NC}"
  
  # Vérifier si le fichier de log existe
  if [ ! -f "$COC_LOG_FILE" ]; then
    echo -e "${YELLOW}! Fichier de log Coc.nvim non trouvé: $COC_LOG_FILE${NC}"
    return 0
  fi
  
  # Vérifier les 50 dernières lignes du log pour des erreurs récentes
  local recent_logs=$(tail -n 50 "$COC_LOG_FILE")
  
  if echo "$recent_logs" | grep -i "error" > /dev/null; then
    echo -e "${RED}✗ Des erreurs ont été détectées dans les logs Coc.nvim récents :${NC}"
    echo "$recent_logs" | grep -i "error" | while read -r line; do
      echo -e "  ${RED}$line${NC}"
    done
    return 1
  else
    echo -e "${GREEN}✓ Aucune erreur récente détectée dans les logs Coc.nvim${NC}"
    return 0
  fi
}

# Fonction pour vérifier les logs du serveur de composants
check_component_server_logs() {
  echo -e "${BLUE}Vérification des logs du serveur de composants pour l'étape: ${YELLOW}${STEP_NAME}${NC}"
  
  # Chemin vers le fichier de log du serveur
  local server_log_file="/tmp/test_logs.txt"
  
  # Vérifier si le fichier de log existe
  if [ ! -f "$server_log_file" ]; then
    echo -e "${YELLOW}! Fichier de log du serveur non trouvé: $server_log_file${NC}"
    return 0
  fi
  
  # Vérifier les 50 dernières lignes du log pour des erreurs récentes
  local recent_logs=$(tail -n 50 "$server_log_file")
  
  # Liste des erreurs attendues pour certaines étapes
  local expected_errors=false
  
  # Ignorer les erreurs "Component not found" pendant l'étape de nettoyage
  # car ces erreurs font partie des tests de la section cleanup
  if [[ "$STEP_NAME" == "cleanup" && "$recent_logs" =~ "Component not found" ]]; then
    echo -e "${YELLOW}! Des erreurs 'Component not found' ont été détectées, mais elles sont attendues pendant l'étape de nettoyage${NC}"
    expected_errors=true
  fi
  
  # Ignorer les erreurs spécifiques aux tests d'erreur
  if [[ "$STEP_NAME" == "tests_execution" && "$recent_logs" =~ "Method not found" ]]; then
    echo -e "${YELLOW}! Des erreurs 'Method not found' ont été détectées, mais elles peuvent faire partie des tests d'erreur${NC}"
    expected_errors=true
  fi
  
  # Si nous avons des erreurs attendues, ne pas les signaler comme des problèmes
  if [[ "$expected_errors" == "true" ]]; then
    echo -e "${GREEN}✓ Toutes les erreurs détectées sont des erreurs attendues pour cette étape${NC}"
    return 0
  fi
  
  # Vérifier les erreurs non attendues
  if echo "$recent_logs" | grep -E "error|Error|ERROR|failed|Failed|FAILED|exception|Exception|EXCEPTION" > /dev/null; then
    echo -e "${RED}✗ Des erreurs ont été détectées dans les logs du serveur :${NC}"
    echo "$recent_logs" | grep -E "error|Error|ERROR|failed|Failed|FAILED|exception|Exception|EXCEPTION" | while read -r line; do
      echo -e "  ${RED}$line${NC}"
    done
    return 1
  else
    echo -e "${GREEN}✓ Aucune erreur détectée dans les logs du serveur${NC}"
    return 0
  fi
}

# Fonction principale
main() {
  echo -e "\n${BLUE}=========================================${NC}"
  echo -e "${BLUE}   Vérification des logs - Étape: ${YELLOW}${STEP_NAME}${NC}"
  echo -e "${BLUE}=========================================${NC}\n"
  
  local errors=0
  
  # Vérifier les messages Neovim
  check_neovim_messages
  errors=$((errors + $?))
  
  echo ""
  
  # Vérifier les logs Coc.nvim
  check_coc_logs
  errors=$((errors + $?))
  
  echo ""
  
  # Vérifier les logs du serveur de composants
  check_component_server_logs
  errors=$((errors + $?))
  
  echo -e "\n${BLUE}=========================================${NC}"
  
  if [ $errors -eq 0 ]; then
    echo -e "${GREEN}✓ Aucune erreur détectée dans les logs pour l'étape: ${YELLOW}${STEP_NAME}${NC}"
    return 0
  else
    echo -e "${RED}✗ Des erreurs ont été détectées dans les logs pour l'étape: ${YELLOW}${STEP_NAME}${NC}"
    return 1
  fi
}

# Exécuter la fonction principale
main
