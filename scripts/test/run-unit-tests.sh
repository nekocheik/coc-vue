#!/bin/bash
# Script pour exécuter les tests unitaires

# Couleurs pour une meilleure lisibilité
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Chemin vers la racine du projet
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Définir le timeout global (en secondes)
MAX_TIMEOUT=${MAX_TIMEOUT:-120}  # 2 minutes par défaut

echo -e "${BLUE}=== Exécution des tests unitaires COC-Vue ===${NC}"
echo -e "${YELLOW}Démarrage des tests...${NC}"
echo -e "${YELLOW}Timeout défini à ${MAX_TIMEOUT} secondes${NC}"

# Fonction pour nettoyer les processus à la sortie
cleanup() {
  # Tuer le processus Jest s'il est toujours en cours d'exécution
  if [ -n "$JEST_PID" ]; then
    echo -e "${YELLOW}Arrêt forcé de Jest...${NC}"
    kill -9 $JEST_PID 2>/dev/null
  fi
}

# Configurer le trap pour nettoyer en cas d'interruption
trap cleanup EXIT INT TERM

# Exécuter les tests unitaires avec Jest en arrière-plan
VERBOSE_LOGS=${VERBOSE_LOGS:-false} npx jest --config ./test/jest.config.js --selectProjects UNIT "$@" &
JEST_PID=$!

# Surveiller le processus Jest avec un timeout
ELAPSED=0
while kill -0 $JEST_PID 2>/dev/null; do
  # Vérifier si le timeout est atteint
  if [ $ELAPSED -ge $MAX_TIMEOUT ]; then
    echo -e "\n${RED}ERREUR: Les tests ont dépassé le timeout de ${MAX_TIMEOUT} secondes.${NC}"
    echo -e "${RED}Arrêt forcé des tests...${NC}"
    kill -9 $JEST_PID 2>/dev/null
    EXIT_CODE=1
    break
  fi
  
  # Attendre 1 seconde et incrémenter le compteur
  sleep 1
  ELAPSED=$((ELAPSED + 1))
  
  # Afficher un point toutes les 10 secondes pour montrer que le script est toujours actif
  if [ $((ELAPSED % 10)) -eq 0 ]; then
    echo -n "."
  fi
done

# Attendre que Jest se termine (s'il n'a pas été tué)
wait $JEST_PID 2>/dev/null
JEST_EXIT_CODE=$?

# Si EXIT_CODE n'est pas défini (pas de timeout), utiliser le code de sortie de Jest
if [ -z "$EXIT_CODE" ]; then
  EXIT_CODE=$JEST_EXIT_CODE
fi

if [ $EXIT_CODE -eq 0 ]; then
  echo -e "\n${GREEN}✓ Tous les tests unitaires ont réussi !${NC}"
else
  echo -e "\n${RED}✗ Certains tests unitaires ont échoué.${NC}"
  echo -e "${YELLOW}Pour voir les logs détaillés, exécutez avec VERBOSE_LOGS=true :${NC}"
  echo -e "${YELLOW}VERBOSE_LOGS=true ./test/scripts/run-unit-tests.sh${NC}"
  echo -e "${YELLOW}Pour augmenter le timeout, utilisez MAX_TIMEOUT=<secondes> :${NC}"
  echo -e "${YELLOW}MAX_TIMEOUT=300 ./test/scripts/run-unit-tests.sh${NC}"
fi

exit $EXIT_CODE
