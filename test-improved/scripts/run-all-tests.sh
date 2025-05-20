#!/bin/bash

# Script principal pour exécuter tous les tests
# Ce script exécute les tests unitaires et d'intégration en séquence
# Ajout d'un mécanisme de timeout global pour éviter les blocages

# Couleurs pour une meilleure lisibilité
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Définir les timeouts pour chaque type de test (en secondes)
UNIT_TIMEOUT=${UNIT_TIMEOUT:-120}    # 2 minutes par défaut pour les tests unitaires
INTEGRATION_TIMEOUT=${INTEGRATION_TIMEOUT:-300}  # 5 minutes par défaut pour les tests d'intégration
GLOBAL_TIMEOUT=${GLOBAL_TIMEOUT:-600}  # 10 minutes par défaut pour l'ensemble des tests

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}=== Suite de tests complète COC-Vue ===${NC}"
echo -e "${BLUE}=======================================${NC}"
echo -e "${YELLOW}Timeout global: $(show_time $GLOBAL_TIMEOUT)${NC}"

# Créer un dossier pour les rapports
REPORT_DIR="./test-improved/reports"
mkdir -p $REPORT_DIR

# Fonction pour afficher le temps écoulé
function show_time() {
  local T=$1
  local H=$((T/3600))
  local M=$(((T%3600)/60))
  local S=$((T%60))
  
  if [ $H -gt 0 ]; then
    printf "%dh %dm %ds" $H $M $S
  elif [ $M -gt 0 ]; then
    printf "%dm %ds" $M $S
  else
    printf "%ds" $S
  fi
}

# Fonction pour surveiller le temps global et arrêter les tests si nécessaire
function monitor_timeout() {
  local start_time=$1
  local timeout=$2
  local elapsed=0
  
  while [ $elapsed -lt $timeout ]; do
    sleep 5
    current_time=$(date +%s)
    elapsed=$((current_time - start_time))
    
    # Vérifier si le processus principal est toujours en cours d'exécution
    if ! ps -p $$ > /dev/null; then
      return 0
    fi
  done
  
  echo -e "\n${RED}ERREUR: Les tests ont dépassé le timeout global de $(show_time $timeout).${NC}"
  echo -e "${RED}Arrêt forcé de tous les processus de test...${NC}"
  
  # Tuer tous les processus Jest en cours
  pkill -f "jest" 2>/dev/null
  
  # Tuer le processus principal (ce script)
  kill -9 $$ 2>/dev/null
}

# Démarrer le monitoring du timeout global en arrière-plan
START_TIME=$(date +%s)
monitor_timeout $START_TIME $GLOBAL_TIMEOUT &
MONITOR_PID=$!

# Fonction pour nettoyer les processus à la sortie
cleanup() {
  # Arrêter le processus de monitoring
  if [ -n "$MONITOR_PID" ]; then
    kill $MONITOR_PID 2>/dev/null
  fi
  
  # Arrêter tous les processus Jest en cours
  pkill -f "jest" 2>/dev/null
}

# Configurer le trap pour nettoyer en cas d'interruption
trap cleanup EXIT INT TERM

echo -e "${CYAN}[1/2] Exécution des tests unitaires...${NC}"
MAX_TIMEOUT=$UNIT_TIMEOUT ./test-improved/scripts/run-unit-tests.sh --json --outputFile=$REPORT_DIR/unit-results.json
UNIT_EXIT_CODE=$?

echo -e "${CYAN}[2/2] Exécution des tests d'intégration...${NC}"
MAX_TIMEOUT=$INTEGRATION_TIMEOUT ./test-improved/scripts/run-integration-tests.sh --json --outputFile=$REPORT_DIR/integration-results.json
INTEGRATION_EXIT_CODE=$?

# Arrêter le monitoring du timeout global
kill $MONITOR_PID 2>/dev/null

# Calculer le temps total
END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}=== Résumé des tests COC-Vue        ===${NC}"
echo -e "${BLUE}=======================================${NC}"
echo -e "${YELLOW}Temps total d'exécution: $(show_time $TOTAL_TIME)${NC}"
echo

if [ $UNIT_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✓ Tests unitaires: Réussis${NC}"
else
  echo -e "${RED}✗ Tests unitaires: Échoués${NC}"
fi

if [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✓ Tests d'intégration: Réussis${NC}"
else
  echo -e "${RED}✗ Tests d'intégration: Échoués${NC}"
fi

echo

# Générer un rapport de couverture avec timeout
echo -e "${YELLOW}Génération du rapport de couverture de code...${NC}"
timeout 60s npx jest --config ./test-improved/jest.config.js --coverage --coverageReporters="json-summary" --coverageDirectory=$REPORT_DIR/coverage
COVERAGE_EXIT_CODE=$?

if [ $COVERAGE_EXIT_CODE -eq 124 ]; then
  echo -e "${YELLOW}La génération du rapport de couverture a été interrompue (timeout).${NC}"
fi

# Afficher un résumé de la couverture
if [ -f "$REPORT_DIR/coverage/coverage-summary.json" ]; then
  echo -e "${BLUE}=======================================${NC}"
  echo -e "${BLUE}=== Couverture de code              ===${NC}"
  echo -e "${BLUE}=======================================${NC}"
  
  # Extraire les statistiques de couverture avec jq (si disponible)
  if command -v jq &> /dev/null; then
    STATEMENTS=$(jq -r '.total.statements.pct' $REPORT_DIR/coverage/coverage-summary.json)
    BRANCHES=$(jq -r '.total.branches.pct' $REPORT_DIR/coverage/coverage-summary.json)
    FUNCTIONS=$(jq -r '.total.functions.pct' $REPORT_DIR/coverage/coverage-summary.json)
    LINES=$(jq -r '.total.lines.pct' $REPORT_DIR/coverage/coverage-summary.json)
    
    echo -e "${YELLOW}Statements: ${STATEMENTS}%${NC}"
    echo -e "${YELLOW}Branches:   ${BRANCHES}%${NC}"
    echo -e "${YELLOW}Functions:  ${FUNCTIONS}%${NC}"
    echo -e "${YELLOW}Lines:      ${LINES}%${NC}"
  else
    echo -e "${YELLOW}Installez jq pour voir les statistiques de couverture détaillées${NC}"
    echo -e "${YELLOW}Rapport complet disponible dans: $REPORT_DIR/coverage${NC}"
  fi
fi

echo
echo -e "${BLUE}=======================================${NC}"
echo -e "${YELLOW}Paramètres de timeout utilisés:${NC}"
echo -e "${YELLOW}- Tests unitaires:      $(show_time $UNIT_TIMEOUT)${NC}"
echo -e "${YELLOW}- Tests d'intégration: $(show_time $INTEGRATION_TIMEOUT)${NC}"
echo -e "${YELLOW}- Timeout global:       $(show_time $GLOBAL_TIMEOUT)${NC}"
echo -e "${YELLOW}Pour modifier les timeouts:${NC}"
echo -e "${YELLOW}UNIT_TIMEOUT=180 INTEGRATION_TIMEOUT=360 GLOBAL_TIMEOUT=900 ./test-improved/scripts/run-all-tests.sh${NC}"
echo -e "${BLUE}=======================================${NC}"

# Déterminer le code de sortie global
if [ $UNIT_EXIT_CODE -eq 0 ] && [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✓ Tous les tests ont réussi !${NC}"
  exit 0
else
  echo -e "${RED}✗ Certains tests ont échoué.${NC}"
  exit 1
fi
