#!/bin/bash
# run-all-tests.sh
# Script principal pour exécuter tous les tests

# Importer les utilitaires communs
source "$(dirname "${BASH_SOURCE[0]}")/core/test-utils.sh"

# Variables globales
RUN_UNIT=${RUN_UNIT:-true}
RUN_INTEGRATION=${RUN_INTEGRATION:-true}
RUN_COMPONENT=${RUN_COMPONENT:-false}
RUN_COMMAND=${RUN_COMMAND:-false}
RUN_PING=${RUN_PING:-false}

# Variables pour stocker les résultats des tests
UNIT_EXIT_CODE=0
INTEGRATION_EXIT_CODE=0
COMPONENT_EXIT_CODE=0
COMMAND_EXIT_CODE=0
PING_EXIT_CODE=0

# Fonction de nettoyage à la sortie
cleanup() {
  print_info "Nettoyage final des ressources..."
  
  # Nettoyer les ports utilisés par les tests
  "$PROJECT_ROOT/scripts/test/utils/cleanup-ports.sh"
  
  print_success "Nettoyage terminé."
}

# Fonction pour exécuter un test spécifique
run_test() {
  local test_type=$1
  local script_path=$2
  local description=$3
  shift 3
  
  print_header "Exécution des tests: $description"
  
  # Exécuter le script de test
  "$script_path" "$@"
  local exit_code=$?
  
  # Stocker le résultat
  case "$test_type" in
    "unitaires")
      UNIT_EXIT_CODE=$exit_code
      ;;
    "integration")
      INTEGRATION_EXIT_CODE=$exit_code
      ;;
    "composants")
      COMPONENT_EXIT_CODE=$exit_code
      ;;
    "commandes")
      COMMAND_EXIT_CODE=$exit_code
      ;;
    "ping")
      PING_EXIT_CODE=$exit_code
      ;;
  esac
  
  if [ $exit_code -eq 0 ]; then
    print_success "✓ $description : Réussis"
  else
    print_error "✗ $description : Échoués"
  fi
  
  return $exit_code
}

# Fonction pour afficher le résumé des tests
show_summary() {
  print_header "Résumé des tests"
  
  local all_passed=true
  
  # Vérifier les tests unitaires
  if [ "$RUN_UNIT" = true ]; then
    if [ $UNIT_EXIT_CODE -eq 0 ]; then
      print_success "✓ Tests unitaires : Réussis"
    else
      print_error "✗ Tests unitaires : Échoués"
      all_passed=false
    fi
  fi
  
  # Vérifier les tests d'intégration
  if [ "$RUN_INTEGRATION" = true ]; then
    if [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
      print_success "✓ Tests d'intégration : Réussis"
    else
      print_error "✗ Tests d'intégration : Échoués"
      all_passed=false
    fi
  fi
  
  # Vérifier les tests de composants
  if [ "$RUN_COMPONENT" = true ]; then
    if [ $COMPONENT_EXIT_CODE -eq 0 ]; then
      print_success "✓ Tests de composants : Réussis"
    else
      print_error "✗ Tests de composants : Échoués"
      all_passed=false
    fi
  fi
  
  # Vérifier les tests de commandes
  if [ "$RUN_COMMAND" = true ]; then
    if [ $COMMAND_EXIT_CODE -eq 0 ]; then
      print_success "✓ Tests de commandes : Réussis"
    else
      print_error "✗ Tests de commandes : Échoués"
      all_passed=false
    fi
  fi
  
  # Vérifier les tests de ping
  if [ "$RUN_PING" = true ]; then
    if [ $PING_EXIT_CODE -eq 0 ]; then
      print_success "✓ Tests de ping : Réussis"
    else
      print_error "✗ Tests de ping : Échoués"
      all_passed=false
    fi
  fi
  
  echo ""
  if [ "$all_passed" = true ]; then
    print_success "✓ Tous les tests ont réussi !"
  else
    print_error "✗ Certains tests ont échoué."
    print_info "Pour plus de détails, exécutez les tests individuellement avec l'option VERBOSE_LOGS=true :"
    print_info "VERBOSE_LOGS=true ./scripts/test/runners/run-unit-tests.sh"
    print_info "VERBOSE_LOGS=true ./scripts/test/runners/run-integration-tests.sh"
  fi
}

# Fonction pour analyser les arguments
parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --unit-only)
        RUN_UNIT=true
        RUN_INTEGRATION=false
        RUN_COMPONENT=false
        RUN_COMMAND=false
        RUN_PING=false
        shift
        ;;
      --integration-only)
        RUN_UNIT=false
        RUN_INTEGRATION=true
        RUN_COMPONENT=false
        RUN_COMMAND=false
        RUN_PING=false
        shift
        ;;
      --component)
        RUN_COMPONENT=true
        shift
        ;;
      --command)
        RUN_COMMAND=true
        shift
        ;;
      --ping)
        RUN_PING=true
        shift
        ;;
      --all)
        RUN_UNIT=true
        RUN_INTEGRATION=true
        RUN_COMPONENT=true
        RUN_COMMAND=true
        RUN_PING=true
        shift
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
  
  # Nettoyer les ports avant de commencer
  print_info "Nettoyage initial des ports de test..."
  "$PROJECT_ROOT/scripts/test/utils/cleanup-ports.sh"
  
  # Configurer le trap pour nettoyer en cas d'interruption
  trap cleanup EXIT INT TERM
  
  # Exécuter les tests unitaires si demandé
  if [ "$RUN_UNIT" = true ]; then
    run_test "unitaires" "$PROJECT_ROOT/scripts/test/runners/run-unit-tests.sh" "Tests unitaires" "$@"
  fi
  
  # Exécuter les tests d'intégration si demandé
  if [ "$RUN_INTEGRATION" = true ]; then
    run_test "intégration" "$PROJECT_ROOT/scripts/test/runners/run-integration-tests.sh" "Tests d'intégration" "$@"
  fi
  
  # Exécuter les tests de composants si demandé
  if [ "$RUN_COMPONENT" = true ]; then
    run_test "composants" "$PROJECT_ROOT/scripts/test/runners/run-component-tests.sh" "Tests de composants" "$@"
  fi
  
  # Exécuter les tests de commandes si demandé
  if [ "$RUN_COMMAND" = true ]; then
    run_test "commandes" "$PROJECT_ROOT/scripts/test/runners/run-command-tests.sh" "Tests de commandes" "$@"
  fi
  
  # Exécuter les tests de ping si demandé
  if [ "$RUN_PING" = true ]; then
    run_test "ping" "$PROJECT_ROOT/scripts/test/runners/run-ping-tests.sh" "Tests de ping" "$@"
  fi
  
  # Afficher le résumé des tests
  show_summary
  
  # Déterminer le code de sortie global
  if [ "$RUN_UNIT" = true ] && [ $UNIT_EXIT_CODE -ne 0 ]; then
    return 1
  fi
  
  if [ "$RUN_INTEGRATION" = true ] && [ $INTEGRATION_EXIT_CODE -ne 0 ]; then
    return 1
  fi
  
  if [ "$RUN_COMPONENT" = true ] && [ $COMPONENT_EXIT_CODE -ne 0 ]; then
    return 1
  fi
  
  if [ "$RUN_COMMAND" = true ] && [ $COMMAND_EXIT_CODE -ne 0 ]; then
    return 1
  fi
  
  if [ "$RUN_PING" = true ] && [ $PING_EXIT_CODE -ne 0 ]; then
    return 1
  fi
  
  return 0
}

# Exécuter la fonction principale avec les arguments
main "$@"
