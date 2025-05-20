#!/bin/bash

# Script pour exécuter les tests d'intégration avec une configuration optimisée
# Ce script réduit les logs et améliore la lisibilité des résultats
# Ajout d'un mécanisme de timeout pour éviter les blocages

# Couleurs pour une meilleure lisibilité
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Définir le timeout global (en secondes)
MAX_TIMEOUT=${MAX_TIMEOUT:-300}  # 5 minutes par défaut

echo -e "${BLUE}=== Exécution des tests d'intégration COC-Vue ===${NC}"
echo -e "${YELLOW}Démarrage du serveur Neovim pour les tests...${NC}"
echo -e "${YELLOW}Timeout défini à ${MAX_TIMEOUT} secondes${NC}"

# Fonction pour nettoyer les processus à la sortie
cleanup() {
  echo -e "\n${YELLOW}Nettoyage des processus...${NC}"
  
  # Arrêter le serveur Neovim si nous l'avons démarré
  if [ -n "$SERVER_PID" ]; then
    echo -e "${YELLOW}Arrêt du serveur Neovim (PID: $SERVER_PID)...${NC}"
    kill $SERVER_PID 2>/dev/null
    sleep 1
    
    # Vérifier si le processus est toujours en cours
    if kill -0 $SERVER_PID 2>/dev/null; then
      echo -e "${YELLOW}Arrêt forcé du serveur Neovim...${NC}"
      kill -9 $SERVER_PID 2>/dev/null
    fi
  fi
  
  # S'assurer que rien n'est en cours d'exécution sur le port 9999
  if lsof -i :9999 > /dev/null 2>&1; then
    echo -e "${YELLOW}Arrêt forcé de tous les processus sur le port 9999...${NC}"
    kill -9 $(lsof -t -i:9999) 2>/dev/null
  fi
  
  # Tuer le processus Jest s'il est toujours en cours d'exécution
  if [ -n "$JEST_PID" ]; then
    echo -e "${YELLOW}Arrêt du processus Jest (PID: $JEST_PID)...${NC}"
    kill $JEST_PID 2>/dev/null
    sleep 1
    
    # Vérifier si le processus est toujours en cours
    if kill -0 $JEST_PID 2>/dev/null; then
      echo -e "${YELLOW}Arrêt forcé de Jest...${NC}"
      kill -9 $JEST_PID 2>/dev/null
    fi
  fi
  
  echo -e "${GREEN}Nettoyage terminé.${NC}"
}

# Configurer le trap pour nettoyer en cas d'interruption
trap cleanup EXIT INT TERM

# Démarrer le serveur Neovim avec notre script dédié
echo -e "${YELLOW}Démarrage du serveur Neovim pour les tests...${NC}"
./test-improved/scripts/start-test-server.sh
SERVER_STATUS=$?

# Vérifier si le serveur a démarré correctement
if [ $SERVER_STATUS -ne 0 ]; then
  echo -e "${RED}ERREUR: Le serveur Neovim n'a pas pu démarrer correctement.${NC}"
  echo -e "${YELLOW}Consultez les logs dans /tmp/neovim-server.log pour plus de détails.${NC}"
  exit 1
fi

# Capturer le PID du serveur pour pouvoir l'arrêter plus tard
SERVER_PID=$(lsof -i :9999 -t)

echo -e "${YELLOW}Exécution des tests d'intégration...${NC}"

# Exécuter les tests d'intégration avec Jest en arrière-plan
VERBOSE_LOGS=${VERBOSE_LOGS:-false} npx jest --config ./test-improved/jest.config.js --selectProjects INTEGRATION "$@" &
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
  echo -e "\n${GREEN}✓ Tous les tests d'intégration ont réussi !${NC}"
else
  echo -e "\n${RED}✗ Certains tests d'intégration ont échoué.${NC}"
  echo -e "${YELLOW}Pour voir les logs détaillés, exécutez avec VERBOSE_LOGS=true :${NC}"
  echo -e "${YELLOW}VERBOSE_LOGS=true ./test-improved/scripts/run-integration-tests.sh${NC}"
  echo -e "${YELLOW}Pour augmenter le timeout, utilisez MAX_TIMEOUT=<secondes> :${NC}"
  echo -e "${YELLOW}MAX_TIMEOUT=600 ./test-improved/scripts/run-integration-tests.sh${NC}"
fi

exit $EXIT_CODE
