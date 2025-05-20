#!/bin/bash
# run-component-tests.sh
# Script pour exécuter les tests de composants
#
# Usage:
#   ./scripts/test/runners/run-component-tests.sh                  # Exécuter tous les tests
#   ./scripts/test/runners/run-component-tests.sh --section <nom>  # Exécuter une section spécifique
#   ./scripts/test/runners/run-component-tests.sh --progressive    # Exécuter les tests progressivement
#
# Sections disponibles:
#   component-loading   - Tests de chargement des composants
#   component-state     - Tests d'état des composants
#   dropdown-control    - Tests de contrôle du dropdown
#   option-selection    - Tests de sélection d'options
#   props-update        - Tests de mise à jour des propriétés
#   multi-select        - Tests du mode multi-sélection
#   navigation          - Tests de navigation
#   error-handling      - Tests de gestion des erreurs
#   cleanup             - Tests de nettoyage des composants

# Importer les utilitaires communs
source "$(dirname "${BASH_SOURCE[0]}")/../core/test-utils.sh"

# Définir le timeout global (en secondes)
MAX_TIMEOUT=${MAX_TIMEOUT:-300}  # 5 minutes par défaut

# Variables globales
PROGRESSIVE_MODE=false
SECTION=""

# Fonction de nettoyage à la sortie
cleanup() {
  print_info "Nettoyage des ressources..."
  
  # Arrêter le serveur de composants
  if [ -n "$SERVER_PID" ]; then
    kill_process $SERVER_PID
  fi
  
  # Nettoyer les processus Neovim
  pkill -f "nvim --headless" || true
  
  # Nettoyer le port 9999
  cleanup_port 9999
  
  print_success "Nettoyage terminé."
}

# Fonction pour exécuter un test spécifique ou un pattern de test
run_test() {
  local test_pattern=$1
  local description=$2
  
  print_info "Exécution du test: $description"
  print_debug "Pattern de test: $test_pattern"
  
  # Exécuter le test avec Jest
  VERBOSE_LOGS=${VERBOSE_LOGS:-false} npx jest --config ./test/jest.config.js --testPathPattern="$test_pattern"
  local result=$?
  
  if [ $result -eq 0 ]; then
    print_success "✓ Test réussi: $description"
  else
    print_error "✗ Test échoué: $description"
  fi
  
  return $result
}

# Fonction pour exécuter les tests en mode progressif
run_progressive_tests() {
  print_header "Tests de composants en mode progressif"
  
  local all_passed=true
  local sections=(
    "component-loading:Tests de chargement des composants"
    "component-state:Tests d'état des composants"
    "dropdown-control:Tests de contrôle du dropdown"
    "option-selection:Tests de sélection d'options"
    "props-update:Tests de mise à jour des propriétés"
    "multi-select:Tests du mode multi-sélection"
    "navigation:Tests de navigation"
    "error-handling:Tests de gestion des erreurs"
    "cleanup:Tests de nettoyage des composants"
  )
  
  for section_info in "${sections[@]}"; do
    IFS=':' read -r section_name section_desc <<< "$section_info"
    
    print_info "=== Section: $section_desc ==="
    
    if ! run_test "$section_name" "$section_desc"; then
      all_passed=false
      print_error "La section '$section_desc' a échoué. Voulez-vous continuer avec les sections suivantes? (y/n)"
      read -r continue_tests
      
      if [[ ! $continue_tests =~ ^[Yy]$ ]]; then
        print_info "Tests interrompus par l'utilisateur."
        return 1
      fi
    fi
    
    # Pause entre les sections
    print_info "Pause de 2 secondes avant la prochaine section..."
    sleep 2
  done
  
  if [ "$all_passed" = true ]; then
    print_success "✓ Tous les tests de composants ont réussi !"
    return 0
  else
    print_error "✗ Certains tests de composants ont échoué."
    return 1
  fi
}

# Fonction pour exécuter une section spécifique de tests
run_section_tests() {
  local section=$1
  
  print_header "Tests de composants - Section: $section"
  
  if ! run_test "$section" "Section $section"; then
    print_error "✗ La section '$section' a échoué."
    return 1
  fi
  
  print_success "✓ La section '$section' a réussi !"
  return 0
}

# Fonction pour exécuter tous les tests de composants
run_all_tests() {
  print_header "Tests de composants - Tous les tests"
  
  # Exécuter tous les tests de composants
  VERBOSE_LOGS=${VERBOSE_LOGS:-false} npx jest --config ./test/jest.config.js --testPathPattern="components"
  local result=$?
  
  if [ $result -eq 0 ]; then
    print_success "✓ Tous les tests de composants ont réussi !"
  else
    print_error "✗ Certains tests de composants ont échoué."
  fi
  
  return $result
}

# Fonction pour démarrer le serveur de composants
start_component_server() {
  print_info "Démarrage du serveur de composants..."
  
  # Nettoyer les processus Neovim existants
  print_info "Nettoyage des processus Neovim existants..."
  pkill -f "nvim --headless" || true
  
  # Vérifier si le port 9999 est déjà utilisé
  if lsof -i :9999 > /dev/null 2>&1; then
    print_error "Le port 9999 est déjà utilisé. Nettoyage des processus existants..."
    cleanup_port 9999
    sleep 2
  fi
  
  # Démarrer le serveur de composants
  SERVER_PID=$(start_server "$PROJECT_ROOT/scripts/server/run_component_server.sh" "/tmp/component-server.log")
  
  # Attendre que le serveur soit prêt
  print_info "Attente du démarrage du serveur de composants..."
  sleep 5
  
  # Vérifier si le serveur est en cours d'exécution
  if ! ps -p $SERVER_PID > /dev/null; then
    print_error "Le serveur de composants n'a pas démarré correctement."
    print_info "Consultez les logs dans /tmp/component-server.log pour plus de détails."
    return 1
  fi
  
  print_success "Serveur de composants démarré avec succès (PID: $SERVER_PID)."
  return 0
}

# Fonction pour analyser les arguments
parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --progressive)
        PROGRESSIVE_MODE=true
        shift
        ;;
      --section)
        SECTION="$2"
        shift 2
        ;;
      *)
        # Si l'argument ne commence pas par --, considérer comme une section
        if [[ ! $1 == --* && -n $1 ]]; then
          SECTION="$1"
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
  
  # Configurer le trap pour nettoyer en cas d'interruption
  trap cleanup EXIT INT TERM
  
  # Démarrer le serveur de composants
  if ! start_component_server; then
    return 1
  fi
  
  # Exécuter les tests selon le mode
  if [ "$PROGRESSIVE_MODE" = true ]; then
    run_progressive_tests
  elif [ -n "$SECTION" ]; then
    run_section_tests "$SECTION"
  else
    run_all_tests
  fi
  
  return $?
}

# Exécuter la fonction principale avec les arguments
main "$@"
