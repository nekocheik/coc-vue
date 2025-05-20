#!/bin/bash
# Script principal pour exécuter tous les tests

# Couleurs pour une meilleure lisibilité
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Chemin vers la racine du projet
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}=== Exécution de tous les tests COC-Vue ===${NC}"

# Nettoyer les ports avant de commencer
echo -e "${YELLOW}Nettoyage des ports de test...${NC}"
"$PROJECT_ROOT/scripts/test/cleanup-test-ports.sh"

# Exécuter les tests unitaires
echo -e "\n${BLUE}=== Exécution des tests unitaires ===${NC}"
"$PROJECT_ROOT/scripts/test/run-unit-tests.sh" "$@"
UNIT_EXIT_CODE=$?

# Exécuter les tests d'intégration
echo -e "\n${BLUE}=== Exécution des tests d'intégration ===${NC}"
"$PROJECT_ROOT/scripts/test/run-integration-tests.sh" "$@"
INTEGRATION_EXIT_CODE=$?

# Nettoyer les ports après les tests
echo -e "\n${YELLOW}Nettoyage final des ports de test...${NC}"
"$PROJECT_ROOT/scripts/test/cleanup-test-ports.sh"

# Afficher le résumé des tests
echo -e "\n${BLUE}=== Résumé des tests ===${NC}"
if [ $UNIT_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✓ Tests unitaires : Réussis${NC}"
else
  echo -e "${RED}✗ Tests unitaires : Échoués${NC}"
fi

if [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✓ Tests d'intégration : Réussis${NC}"
else
  echo -e "${RED}✗ Tests d'intégration : Échoués${NC}"
fi

# Déterminer le code de sortie global
if [ $UNIT_EXIT_CODE -eq 0 ] && [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
  echo -e "\n${GREEN}✓ Tous les tests ont réussi !${NC}"
  exit 0
else
  echo -e "\n${RED}✗ Certains tests ont échoué.${NC}"
  echo -e "${YELLOW}Pour plus de détails, exécutez les tests individuellement avec l'option VERBOSE_LOGS=true :${NC}"
  echo -e "${YELLOW}VERBOSE_LOGS=true ./test/scripts/run-unit-tests.sh${NC}"
  echo -e "${YELLOW}VERBOSE_LOGS=true ./test/scripts/run-integration-tests.sh${NC}"
  exit 1
fi
