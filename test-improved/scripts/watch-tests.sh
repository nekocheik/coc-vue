#!/bin/bash

# Script pour exécuter les tests en mode "watch"
# Ce script est utile pendant le développement pour voir les résultats des tests en temps réel

# Couleurs pour une meilleure lisibilité
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Mode Watch pour les tests COC-Vue ===${NC}"
echo -e "${YELLOW}Les tests seront automatiquement réexécutés lorsque les fichiers sont modifiés.${NC}"
echo -e "${YELLOW}Appuyez sur 'q' pour quitter, 'p' pour filtrer par nom de fichier.${NC}"
echo

# Par défaut, on exécute les tests unitaires en mode watch
# Les tests d'intégration ne sont pas exécutés en mode watch car ils nécessitent un serveur Neovim
TEST_TYPE=${1:-"unit"}

if [ "$TEST_TYPE" = "unit" ]; then
  echo -e "${GREEN}Exécution des tests unitaires en mode watch...${NC}"
  npx jest --config ./test-improved/jest.config.js --selectProjects UNIT --watch
elif [ "$TEST_TYPE" = "integration" ]; then
  echo -e "${YELLOW}Attention: Les tests d'intégration en mode watch nécessitent un serveur Neovim en cours d'exécution.${NC}"
  echo -e "${YELLOW}Assurez-vous que le serveur est démarré avec ./scripts/server/run_component_server.sh${NC}"
  echo
  echo -e "${GREEN}Exécution des tests d'intégration en mode watch...${NC}"
  VERBOSE_LOGS=false npx jest --config ./test-improved/jest.config.js --selectProjects INTEGRATION --watch
else
  echo -e "${YELLOW}Type de test non reconnu: $TEST_TYPE${NC}"
  echo -e "${YELLOW}Utilisez 'unit' ou 'integration'${NC}"
  exit 1
fi
