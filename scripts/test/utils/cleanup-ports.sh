#!/bin/bash
# cleanup-ports.sh
# Script pour nettoyer les ports utilisés par les tests

# Importer les utilitaires communs
source "$(dirname "${BASH_SOURCE[0]}")/../core/test-utils.sh"

# Fonction de nettoyage principale
cleanup_test_ports() {
  print_header "Nettoyage des ports de test"
  
  # Plage de ports à nettoyer
  local start_port=${START_PORT:-9000}
  local end_port=${END_PORT:-10000}
  
  print_info "Nettoyage des ports dans la plage $start_port-$end_port..."
  
  # Utiliser le gestionnaire de ports si disponible
  if [ -f "$PROJECT_ROOT/test/utils/port-manager.js" ]; then
    print_info "Utilisation du gestionnaire de ports pour le nettoyage..."
    node -e "require('$PROJECT_ROOT/test/utils/port-manager').cleanupAllPorts()"
    local result=$?
    
    if [ $result -eq 0 ]; then
      print_success "Nettoyage des ports réussi via le gestionnaire de ports."
    else
      print_error "Erreur lors du nettoyage des ports via le gestionnaire de ports."
      print_info "Tentative de nettoyage manuel..."
      cleanup_port_range $start_port $end_port
    fi
  else
    # Fallback manuel
    print_info "Gestionnaire de ports non trouvé, utilisation du nettoyage manuel..."
    cleanup_port_range $start_port $end_port
  fi
  
  # Vérifier les processus Neovim
  if pgrep -f "nvim --headless" > /dev/null; then
    print_info "Nettoyage des processus Neovim..."
    pkill -f "nvim --headless" || true
    sleep 1
    
    if ! pgrep -f "nvim --headless" > /dev/null; then
      print_success "Processus Neovim nettoyés avec succès."
    else
      print_error "Impossible de nettoyer tous les processus Neovim."
      print_info "Tentative de nettoyage forcé..."
      pkill -9 -f "nvim --headless" || true
    fi
  else
    print_info "Aucun processus Neovim en cours d'exécution."
  fi
  
  # Vérifier les processus Node spécifiques
  local node_processes=("mock-server.js" "command_server.js" "ping_server.js")
  
  for process in "${node_processes[@]}"; do
    if pgrep -f "$process" > /dev/null; then
      print_info "Nettoyage des processus Node pour $process..."
      pkill -f "$process" || true
      sleep 1
      
      if ! pgrep -f "$process" > /dev/null; then
        print_success "Processus $process nettoyés avec succès."
      else
        print_error "Impossible de nettoyer tous les processus $process."
        print_info "Tentative de nettoyage forcé..."
        pkill -9 -f "$process" || true
      fi
    else
      print_info "Aucun processus $process en cours d'exécution."
    fi
  done
  
  print_success "Nettoyage des ports et processus terminé."
}

# Fonction principale
main() {
  # Vérifier les prérequis
  check_prerequisites "node" "lsof" "pkill"
  
  # Exécuter le nettoyage
  cleanup_test_ports
  
  return $?
}

# Exécuter la fonction principale
main "$@"
