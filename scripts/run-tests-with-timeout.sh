#!/bin/bash

# Script pour exécuter les tests avec un timeout de 48 secondes
# Usage: ./run-tests-with-timeout.sh [test-command]

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log() {
  echo -e "${BLUE}[TEST RUNNER]${NC} $1"
}

# Fonction pour exécuter une commande avec timeout (compatible macOS)
run_with_timeout() {
  local cmd="$1"
  local timeout_seconds=48
  
  log "${YELLOW}Exécution de la commande:${NC} $cmd"
  log "${YELLOW}Timeout défini à:${NC} $timeout_seconds secondes"
  
  # Utiliser perl pour créer un timer qui enverra un signal TERM au processus
  # si le timeout est atteint
  (
    # Exécuter la commande en arrière-plan
    bash -c "$cmd" &
    cmd_pid=$!
    
    # Utiliser perl pour attendre le nombre de secondes spécifié
    (
      perl -e "select(undef, undef, undef, $timeout_seconds); exit 0;"
      # Si perl se termine normalement (timeout atteint), tuer le processus
      log "${RED}TIMEOUT!${NC} La commande a dépassé $timeout_seconds secondes et va être interrompue."
      kill -TERM $cmd_pid 2>/dev/null || kill -KILL $cmd_pid 2>/dev/null
      exit 124  # Code de sortie indiquant un timeout
    ) &
    timer_pid=$!
    
    # Attendre que la commande se termine
    wait $cmd_pid
    cmd_exit_code=$?
    
    # La commande s'est terminée, arrêter le timer
    kill -TERM $timer_pid 2>/dev/null || kill -KILL $timer_pid 2>/dev/null
    
    # Retourner le code de sortie de la commande
    exit $cmd_exit_code
  )
  
  local exit_code=$?
  
  if [ $exit_code -eq 124 ]; then
    log "${RED}TIMEOUT!${NC} La commande a dépassé $timeout_seconds secondes et a été interrompue."
    return 124
  elif [ $exit_code -ne 0 ]; then
    log "${RED}ÉCHEC!${NC} La commande a échoué avec le code de sortie $exit_code."
    return $exit_code
  else
    log "${GREEN}SUCCÈS!${NC} La commande s'est terminée avec succès."
    return 0
  fi
}

# Vérifier si une commande a été fournie
if [ -z "$1" ]; then
  log "Aucune commande spécifiée. Utilisation des commandes de test par défaut."
  
  # Exécuter les tests unitaires standard
  log "${BLUE}=== Exécution des tests unitaires ====${NC}"
  run_with_timeout "npm test"
  unit_test_result=$?
  
  # Exécuter les tests d'intégration du bridge
  log "${BLUE}=== Exécution des tests d'intégration du bridge ====${NC}"
  run_with_timeout "npm run test:bridge"
  bridge_test_result=$?
  
  # Exécuter les tests d'intégration des composants
  log "${BLUE}=== Exécution des tests d'intégration des composants ====${NC}"
  run_with_timeout "npm run test:integration"
  integration_test_result=$?
  
  # Afficher le résumé
  log "${BLUE}=== Résumé des tests ====${NC}"
  [ $unit_test_result -eq 0 ] && echo -e "${GREEN}✓ Tests unitaires: SUCCÈS${NC}" || echo -e "${RED}✗ Tests unitaires: ÉCHEC (code $unit_test_result)${NC}"
  [ $bridge_test_result -eq 0 ] && echo -e "${GREEN}✓ Tests d'intégration du bridge: SUCCÈS${NC}" || echo -e "${RED}✗ Tests d'intégration du bridge: ÉCHEC (code $bridge_test_result)${NC}"
  [ $integration_test_result -eq 0 ] && echo -e "${GREEN}✓ Tests d'intégration des composants: SUCCÈS${NC}" || echo -e "${RED}✗ Tests d'intégration des composants: ÉCHEC (code $integration_test_result)${NC}"
  
  # Calculer le résultat global
  if [ $unit_test_result -eq 0 ] && [ $bridge_test_result -eq 0 ] && [ $integration_test_result -eq 0 ]; then
    log "${GREEN}Tous les tests ont réussi!${NC}"
    exit 0
  else
    log "${RED}Certains tests ont échoué.${NC}"
    exit 1
  fi
else
  # Exécuter la commande spécifiée avec timeout
  run_with_timeout "$1"
  exit $?
fi
