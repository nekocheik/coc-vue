#!/bin/bash
# Script pour exécuter les tests dans un environnement Docker
# Ce script s'assure que les tests sont exécutés depuis la racine du projet

# Définir la racine du projet comme répertoire de travail
cd /app

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Afficher l'en-tête
echo -e "\n${BLUE}=========================================${NC}"
echo -e "${BLUE}   Tests Docker pour coc-vue   ${NC}"
echo -e "${BLUE}=========================================${NC}\n"

# Afficher le répertoire de travail
echo -e "${YELLOW}Répertoire de travail: $(pwd)${NC}"

# Configurer l'environnement pour les tests
export MOCK_NEOVIM=true
export NODE_ENV=test

# Exécuter les tests avec Jest directement
echo -e "\n${YELLOW}Exécution des tests unitaires...${NC}"
npx jest --config /app/test/simplified-jest.config.js --testPathPattern="__tests__/(?!integration)" --passWithNoTests
UNIT_RESULT=$?

echo -e "\n${YELLOW}Exécution des tests de composants...${NC}"
npx jest --config /app/test/simplified-jest.config.js --testPathPattern="__tests__/components" --passWithNoTests
COMPONENT_RESULT=$?

echo -e "\n${YELLOW}Exécution des tests d'intégration...${NC}"
npx jest --config /app/test/simplified-jest.config.js --testPathPattern="__tests__/integration" --passWithNoTests
INTEGRATION_RESULT=$?

# Afficher le résumé
echo -e "\n${BLUE}=== Résumé des tests ====${NC}"
[ $UNIT_RESULT -eq 0 ] && echo -e "${GREEN}✓ Tests unitaires: SUCCÈS${NC}" || echo -e "${RED}✗ Tests unitaires: ÉCHEC (code $UNIT_RESULT)${NC}"
[ $COMPONENT_RESULT -eq 0 ] && echo -e "${GREEN}✓ Tests de composants: SUCCÈS${NC}" || echo -e "${RED}✗ Tests de composants: ÉCHEC (code $COMPONENT_RESULT)${NC}"
[ $INTEGRATION_RESULT -eq 0 ] && echo -e "${GREEN}✓ Tests d'intégration: SUCCÈS${NC}" || echo -e "${RED}✗ Tests d'intégration: ÉCHEC (code $INTEGRATION_RESULT)${NC}"

# Calculer le résultat global
if [ $UNIT_RESULT -eq 0 ] && [ $COMPONENT_RESULT -eq 0 ] && [ $INTEGRATION_RESULT -eq 0 ]; then
  echo -e "${GREEN}Tous les tests ont réussi!${NC}"
  exit 0
else
  echo -e "${RED}Certains tests ont échoué.${NC}"
  exit 1
fi
