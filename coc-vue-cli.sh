#!/bin/bash
# coc-vue-cli.sh
# CLI pour l'extension coc-vue

# Set the path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Fonction pour afficher l'en-tête
print_header() {
  echo -e "\n${BLUE}=========================================${NC}"
  echo -e "${BLUE}   CoC Vue CLI - Outil de développement   ${NC}"
  echo -e "${BLUE}=========================================${NC}\n"
}

# Fonction pour afficher l'aide
show_help() {
  echo -e "${CYAN}Usage:${NC} ./coc-vue-cli.sh [commande] [options]"
  echo ""
  echo -e "${CYAN}Commandes disponibles:${NC}"
  echo -e "  ${GREEN}test${NC}                    Exécuter les tests d'intégration"
  echo -e "  ${GREEN}test:component${NC}          Exécuter les tests de composants"
  echo -e "  ${GREEN}test:component [section]${NC} Exécuter une section spécifique des tests de composants"
  echo -e "  ${GREEN}test:command${NC}            Exécuter les tests de commandes"
  echo -e "  ${GREEN}test:ping${NC}               Exécuter les tests de ping"
  echo -e "  ${GREEN}server:start${NC}            Démarrer le serveur de composants"
  echo -e "  ${GREEN}server:stop${NC}             Arrêter le serveur de composants"
  echo -e "  ${GREEN}logs:check [étape]${NC}      Vérifier les logs pour une étape spécifique"
  echo -e "  ${GREEN}logs:analyze${NC}            Analyser les résultats des tests"
  echo -e "  ${GREEN}help${NC}                    Afficher cette aide"
  echo ""
  echo -e "${CYAN}Exemples:${NC}"
  echo -e "  ./coc-vue-cli.sh test:component"
  echo -e "  ./coc-vue-cli.sh test:component component-loading"
  echo -e "  ./coc-vue-cli.sh server:start"
  echo -e "  ./coc-vue-cli.sh logs:check server_startup"
  echo ""
}

# Fonction pour exécuter les tests de composants
run_component_tests() {
  local section=$1
  echo -e "${YELLOW}Exécution des tests de composants...${NC}"
  
  if [ -n "$section" ]; then
    echo -e "${YELLOW}Section: ${section}${NC}"
    "$PROJECT_ROOT/scripts/test/run_component_tests.sh" "$section"
  else
    "$PROJECT_ROOT/scripts/test/run_component_tests.sh"
  fi
}

# Fonction pour exécuter les tests de commandes
run_command_tests() {
  echo -e "${YELLOW}Exécution des tests de commandes...${NC}"
  "$PROJECT_ROOT/scripts/test/run_node_command_tests.sh"
}

# Fonction pour exécuter les tests de ping
run_ping_tests() {
  echo -e "${YELLOW}Exécution des tests de ping...${NC}"
  "$PROJECT_ROOT/scripts/test/run_ping_test.sh"
}

# Fonction pour démarrer le serveur de composants
start_component_server() {
  echo -e "${YELLOW}Démarrage du serveur de composants...${NC}"
  "$PROJECT_ROOT/scripts/server/run_component_server.sh" &
  echo -e "${GREEN}Serveur démarré en arrière-plan. PID: $!${NC}"
  echo -e "${YELLOW}Utilisez 'server:stop' pour arrêter le serveur.${NC}"
}

# Fonction pour arrêter le serveur de composants
stop_component_server() {
  echo -e "${YELLOW}Arrêt du serveur de composants...${NC}"
  local server_pid=$(lsof -i :9999 -t)
  
  if [ -n "$server_pid" ]; then
    echo -e "${YELLOW}Arrêt du processus avec PID: ${server_pid}${NC}"
    kill -9 $server_pid
    echo -e "${GREEN}Serveur arrêté.${NC}"
  else
    echo -e "${RED}Aucun serveur en cours d'exécution sur le port 9999.${NC}"
  fi
}

# Fonction pour vérifier les logs
check_logs() {
  local step=$1
  
  if [ -z "$step" ]; then
    echo -e "${RED}Erreur: Vous devez spécifier une étape pour vérifier les logs.${NC}"
    echo -e "${YELLOW}Exemple: ./coc-vue-cli.sh logs:check server_startup${NC}"
    return 1
  fi
  
  echo -e "${YELLOW}Vérification des logs pour l'étape: ${step}${NC}"
  "$PROJECT_ROOT/scripts/utils/check_neovim_logs.sh" "$step"
}

# Fonction pour analyser les résultats des tests
analyze_test_results() {
  echo -e "${YELLOW}Analyse des résultats des tests...${NC}"
  "$PROJECT_ROOT/scripts/utils/check_test_results.sh"
}

# Fonction principale
main() {
  print_header
  
  local command=$1
  shift
  
  case $command in
    "test")
      run_component_tests
      ;;
    "test:component")
      run_component_tests "$1"
      ;;
    "test:command")
      run_command_tests
      ;;
    "test:ping")
      run_ping_tests
      ;;
    "server:start")
      start_component_server
      ;;
    "server:stop")
      stop_component_server
      ;;
    "logs:check")
      check_logs "$1"
      ;;
    "logs:analyze")
      analyze_test_results
      ;;
    "help" | "")
      show_help
      ;;
    *)
      echo -e "${RED}Commande inconnue: ${command}${NC}"
      show_help
      return 1
      ;;
  esac
}

# Exécuter la fonction principale avec les arguments
main "$@"
