#!/bin/bash
# run-command-tests.sh
# Script pour exécuter les tests de commandes (mode Neovim ou Node)
#
# Usage:
#   ./scripts/test/runners/run-command-tests.sh              # Mode Neovim par défaut
#   ./scripts/test/runners/run-command-tests.sh --node       # Mode Node.js
#   ./scripts/test/runners/run-command-tests.sh --test <nom> # Exécuter un test spécifique

# Importer les utilitaires communs
source "$(dirname "${BASH_SOURCE[0]}")/../core/test-utils.sh"

# Définir le timeout global (en secondes)
MAX_TIMEOUT=${MAX_TIMEOUT:-180}  # 3 minutes par défaut

# Variables globales
MODE="neovim"  # Mode par défaut: neovim
TEST_PATTERN=""

# Fonction de nettoyage à la sortie
cleanup() {
  print_info "Nettoyage des ressources..."
  
  # Arrêter le serveur de commandes
  if [ -n "$SERVER_PID" ]; then
    kill_process $SERVER_PID
  fi
  
  # Nettoyer les processus Neovim
  if [ "$MODE" = "neovim" ]; then
    pkill -f "nvim --headless" || true
  fi
  
  # Nettoyer les ports utilisés
  cleanup_port 9999
  
  print_success "Nettoyage terminé."
}

# Fonction pour démarrer le serveur de commandes en mode Neovim
start_neovim_server() {
  print_info "Démarrage du serveur de commandes Neovim..."
  
  # Nettoyer les processus Neovim existants
  print_info "Nettoyage des processus Neovim existants..."
  pkill -f "nvim --headless" || true
  
  # Vérifier si le port 9999 est déjà utilisé
  if lsof -i :9999 > /dev/null 2>&1; then
    print_error "Le port 9999 est déjà utilisé. Nettoyage des processus existants..."
    cleanup_port 9999
    sleep 2
  fi
  
  # Démarrer le serveur de commandes Neovim
  SERVER_PID=$(start_server "$PROJECT_ROOT/scripts/server/run_command_server.sh" "/tmp/command-server.log")
  
  # Attendre que le serveur soit prêt
  print_info "Attente du démarrage du serveur Neovim..."
  sleep 5
  
  # Vérifier si le serveur est en cours d'exécution
  if ! ps -p $SERVER_PID > /dev/null; then
    print_error "Le serveur Neovim n'a pas démarré correctement."
    print_info "Consultez les logs dans /tmp/command-server.log pour plus de détails."
    return 1
  fi
  
  print_success "Serveur Neovim démarré avec succès (PID: $SERVER_PID)."
  return 0
}

# Fonction pour démarrer le serveur de commandes en mode Node
start_node_server() {
  print_info "Démarrage du serveur de commandes Node.js..."
  
  # Vérifier si le port 9999 est déjà utilisé
  if lsof -i :9999 > /dev/null 2>&1; then
    print_error "Le port 9999 est déjà utilisé. Nettoyage des processus existants..."
    cleanup_port 9999
    sleep 2
  fi
  
  # Démarrer le serveur de commandes Node
  SERVER_PID=$(start_server "node $PROJECT_ROOT/scripts/server/command_server.js" "/tmp/node-command-server.log")
  
  # Attendre que le serveur soit prêt
  print_info "Attente du démarrage du serveur Node.js..."
  sleep 3
  
  # Vérifier si le serveur est en cours d'exécution
  if ! ps -p $SERVER_PID > /dev/null; then
    print_error "Le serveur Node.js n'a pas démarré correctement."
    print_info "Consultez les logs dans /tmp/node-command-server.log pour plus de détails."
    return 1
  fi
  
  print_success "Serveur Node.js démarré avec succès (PID: $SERVER_PID)."
  return 0
}

# Fonction pour exécuter les tests de commandes
run_command_tests() {
  local test_pattern=$1
  local mode_desc="Neovim"
  
  if [ "$MODE" = "node" ]; then
    mode_desc="Node.js"
  fi
  
  print_header "Tests de commandes - Mode: $mode_desc"
  
  # Construire le pattern de test
  local jest_pattern="command"
  if [ -n "$test_pattern" ]; then
    jest_pattern="${jest_pattern}.*${test_pattern}"
  fi
  
  print_info "Exécution des tests de commandes (pattern: $jest_pattern)..."
  
  # Exécuter les tests avec Jest
  VERBOSE_LOGS=${VERBOSE_LOGS:-false} npx jest --config ./test/jest.config.js --testPathPattern="$jest_pattern"
  local result=$?
  
  if [ $result -eq 0 ]; then
    print_success "✓ Tous les tests de commandes ont réussi !"
  else
    print_error "✗ Certains tests de commandes ont échoué."
    print_info "Pour voir les logs détaillés, exécutez avec VERBOSE_LOGS=true :"
    print_info "VERBOSE_LOGS=true ./scripts/test/runners/run-command-tests.sh"
  fi
  
  return $result
}

# Fonction pour analyser les arguments
parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --node)
        MODE="node"
        shift
        ;;
      --neovim)
        MODE="neovim"
        shift
        ;;
      --test)
        TEST_PATTERN="$2"
        shift 2
        ;;
      *)
        # Si l'argument ne commence pas par --, considérer comme un pattern de test
        if [[ ! $1 == --* && -n $1 ]]; then
          TEST_PATTERN="$1"
        fi
        shift
        ;;
    esac
  done
}

# Fonction principale
main() {
  # Analyser les arguments
  parse_args "$@"
  
  # Vérifier les prérequis
  check_prerequisites "node" "npx" "jest" "lsof"
  
  # Vérifier les prérequis spécifiques au mode
  if [ "$MODE" = "neovim" ]; then
    check_prerequisites "nvim"
  fi
  
  # Configurer le trap pour nettoyer en cas d'interruption
  trap cleanup EXIT INT TERM
  
  # Démarrer le serveur selon le mode
  if [ "$MODE" = "node" ]; then
    if ! start_node_server; then
      return 1
    fi
  else
    if ! start_neovim_server; then
      return 1
    fi
  fi
  
  # Exécuter les tests de commandes
  run_command_tests "$TEST_PATTERN"
  
  return $?
}

# Exécuter la fonction principale avec les arguments
main "$@"
