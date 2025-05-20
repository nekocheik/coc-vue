#!/bin/bash
# run-ping-tests.sh
# Script pour exécuter les tests de ping (mode Neovim ou Lua)
#
# Usage:
#   ./scripts/test/runners/run-ping-tests.sh           # Mode Neovim par défaut
#   ./scripts/test/runners/run-ping-tests.sh --simple  # Mode Lua simple
#   ./scripts/test/runners/run-ping-tests.sh --timeout 30  # Définir un timeout personnalisé

# Importer les utilitaires communs
source "$(dirname "${BASH_SOURCE[0]}")/../core/test-utils.sh"

# Définir le timeout global (en secondes)
MAX_TIMEOUT=${MAX_TIMEOUT:-60}  # 1 minute par défaut

# Variables globales
MODE="neovim"  # Mode par défaut: neovim

# Fonction de nettoyage à la sortie
cleanup() {
  print_info "Nettoyage des ressources..."
  
  # Arrêter le serveur de ping
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

# Fonction pour démarrer le serveur de ping en mode Neovim
start_neovim_server() {
  print_info "Démarrage du serveur de ping Neovim..."
  
  # Nettoyer les processus Neovim existants
  print_info "Nettoyage des processus Neovim existants..."
  pkill -f "nvim --headless" || true
  
  # Vérifier si le port 9999 est déjà utilisé
  if lsof -i :9999 > /dev/null 2>&1; then
    print_error "Le port 9999 est déjà utilisé. Nettoyage des processus existants..."
    cleanup_port 9999
    sleep 2
  fi
  
  # Démarrer le serveur de ping Neovim
  SERVER_PID=$(start_server "nvim --headless -c 'lua require(\"coc-vue.server\").start()'" "/tmp/ping-server.log")
  
  # Attendre que le serveur soit prêt
  print_info "Attente du démarrage du serveur Neovim..."
  sleep 5
  
  # Vérifier si le serveur est en cours d'exécution
  if ! ps -p $SERVER_PID > /dev/null; then
    print_error "Le serveur Neovim n'a pas démarré correctement."
    print_info "Consultez les logs dans /tmp/ping-server.log pour plus de détails."
    return 1
  fi
  
  print_success "Serveur Neovim démarré avec succès (PID: $SERVER_PID)."
  return 0
}

# Fonction pour démarrer le serveur de ping en mode Lua simple
start_simple_server() {
  print_info "Démarrage du serveur de ping Lua simple..."
  
  # Vérifier si le port 9999 est déjà utilisé
  if lsof -i :9999 > /dev/null 2>&1; then
    print_error "Le port 9999 est déjà utilisé. Nettoyage des processus existants..."
    cleanup_port 9999
    sleep 2
  fi
  
  # Démarrer le serveur de ping Lua simple
  SERVER_PID=$(start_server "lua $PROJECT_ROOT/scripts/server/simple_ping_server.lua" "/tmp/simple-ping-server.log")
  
  # Attendre que le serveur soit prêt
  print_info "Attente du démarrage du serveur Lua simple..."
  sleep 3
  
  # Vérifier si le serveur est en cours d'exécution
  if ! ps -p $SERVER_PID > /dev/null; then
    print_error "Le serveur Lua simple n'a pas démarré correctement."
    print_info "Consultez les logs dans /tmp/simple-ping-server.log pour plus de détails."
    return 1
  fi
  
  print_success "Serveur Lua simple démarré avec succès (PID: $SERVER_PID)."
  return 0
}

# Fonction pour exécuter le test de ping
run_ping_test() {
  local mode_desc="Neovim"
  
  if [ "$MODE" = "simple" ]; then
    mode_desc="Lua simple"
  fi
  
  print_header "Test de ping - Mode: $mode_desc"
  
  print_info "Exécution du test de ping..."
  
  # Exécuter le test de ping avec Node.js
  node "$PROJECT_ROOT/scripts/test/ping_test.js"
  local result=$?
  
  if [ $result -eq 0 ]; then
    print_success "✓ Test de ping réussi !"
  else
    print_error "✗ Test de ping échoué."
    print_info "Pour voir les logs détaillés, exécutez avec VERBOSE_LOGS=true :"
    print_info "VERBOSE_LOGS=true ./scripts/test/runners/run-ping-tests.sh"
  fi
  
  return $result
}

# Fonction pour analyser les arguments
parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --simple)
        MODE="simple"
        shift
        ;;
      --neovim)
        MODE="neovim"
        shift
        ;;
      --timeout)
        MAX_TIMEOUT="$2"
        shift 2
        ;;
      *)
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
  check_prerequisites "node" "lsof"
  
  # Vérifier les prérequis spécifiques au mode
  if [ "$MODE" = "neovim" ]; then
    check_prerequisites "nvim"
  elif [ "$MODE" = "simple" ]; then
    check_prerequisites "lua"
  fi
  
  # Configurer le trap pour nettoyer en cas d'interruption
  trap cleanup EXIT INT TERM
  
  # Démarrer le serveur selon le mode
  if [ "$MODE" = "simple" ]; then
    if ! start_simple_server; then
      return 1
    fi
  else
    if ! start_neovim_server; then
      return 1
    fi
  fi
  
  # Exécuter le test de ping
  run_ping_test
  
  return $?
}

# Exécuter la fonction principale avec les arguments
main "$@"
