#!/bin/bash
# run-simplified-tests.sh
# Script pour exécuter les tests simplifiés sans dépendre de l'intégration Neovim

# Définir le chemin vers la racine du projet
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Afficher le répertoire de travail pour le débogage
echo "Répertoire de travail: $(pwd)"
echo "PROJECT_ROOT: $PROJECT_ROOT"

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher l'en-tête
print_header() {
  echo -e "\n${BLUE}=========================================${NC}"
  echo -e "${BLUE}   Tests simplifiés pour coc-vue   ${NC}"
  echo -e "${BLUE}=========================================${NC}\n"
}

# Fonction pour afficher les messages d'information
print_info() {
  echo -e "${YELLOW}$1${NC}"
}

# Fonction pour afficher les messages de succès
print_success() {
  echo -e "${GREEN}$1${NC}"
}

# Fonction pour afficher les messages d'erreur
print_error() {
  echo -e "${RED}$1${NC}"
}

# Fonction pour nettoyer les ressources
cleanup() {
  print_info "Nettoyage des ressources..."
  
  # Tuer les processus sur le port 9999
  if lsof -i :9999 > /dev/null 2>&1; then
    print_info "Nettoyage des processus sur le port 9999..."
    lsof -i :9999 -t | xargs kill -9 2>/dev/null || true
  fi
  
  # Nettoyer les fichiers temporaires
  rm -f /tmp/component-server.log /tmp/simplified-test.log
  
  print_success "Nettoyage terminé."
}

# Fonction pour exécuter les tests unitaires
run_unit_tests() {
  print_info "Exécution des tests unitaires..."
  
  # Exécuter les tests unitaires avec Jest et la configuration simplifiée
  MOCK_NEOVIM=true npx jest --config "$PROJECT_ROOT/test/simplified-jest.config.js" --testPathPattern="__tests__/(?!integration)" --passWithNoTests
  local result=$?
  
  if [ $result -eq 0 ]; then
    print_success "✓ Tests unitaires réussis !"
  else
    print_error "✗ Tests unitaires échoués."
  fi
  
  return $result
}

# Fonction pour exécuter les tests de composants
run_component_tests() {
  print_info "Exécution des tests de composants avec mocks..."
  
  # Exécuter les tests de composants avec Jest et la configuration simplifiée
  MOCK_NEOVIM=true npx jest --config "$PROJECT_ROOT/test/simplified-jest.config.js" --testPathPattern="__tests__/components" --passWithNoTests
  local result=$?
  
  if [ $result -eq 0 ]; then
    print_success "✓ Tests de composants réussis !"
  else
    print_error "✗ Tests de composants échoués."
  fi
  
  return $result
}

# Fonction pour exécuter les tests d'intégration simplifiés
run_integration_tests() {
  print_info "Exécution des tests d'intégration simplifiés..."
  
  # Exécuter les tests d'intégration avec Jest et la configuration simplifiée
  MOCK_NEOVIM=true npx jest --config "$PROJECT_ROOT/test/simplified-jest.config.js" --testPathPattern="__tests__/integration" --passWithNoTests
  local result=$?
  
  if [ $result -eq 0 ]; then
    print_success "✓ Tests d'intégration réussis !"
  else
    print_error "✗ Tests d'intégration échoués."
  fi
  
  return $result
}

# Fonction principale
main() {
  print_header
  
  # Configurer le trap pour nettoyer en cas d'interruption
  trap cleanup EXIT INT TERM
  
  # Nettoyer les ressources avant de commencer
  cleanup
  
  # Exécuter les tests
  run_unit_tests
  local unit_result=$?
  
  run_component_tests
  local component_result=$?
  
  run_integration_tests
  local integration_result=$?
  
  # Afficher le résumé
  echo -e "\n${BLUE}=== Résumé des tests ====${NC}"
  [ $unit_result -eq 0 ] && echo -e "${GREEN}✓ Tests unitaires: SUCCÈS${NC}" || echo -e "${RED}✗ Tests unitaires: ÉCHEC (code $unit_result)${NC}"
  [ $component_result -eq 0 ] && echo -e "${GREEN}✓ Tests de composants: SUCCÈS${NC}" || echo -e "${RED}✗ Tests de composants: ÉCHEC (code $component_result)${NC}"
  [ $integration_result -eq 0 ] && echo -e "${GREEN}✓ Tests d'intégration: SUCCÈS${NC}" || echo -e "${RED}✗ Tests d'intégration: ÉCHEC (code $integration_result)${NC}"
  
  # Calculer le résultat global
  if [ $unit_result -eq 0 ] && [ $component_result -eq 0 ] && [ $integration_result -eq 0 ]; then
    print_success "Tous les tests ont réussi!"
    exit 0
  else
    print_error "Certains tests ont échoué."
    exit 1
  fi
}

# Exécuter la fonction principale
main "$@"
