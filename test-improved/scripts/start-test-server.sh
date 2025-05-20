#!/bin/bash
# Script pour démarrer et vérifier le serveur mock pour les tests

# Couleurs pour une meilleure lisibilité
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Chemin vers la racine du projet
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}=== Démarrage du serveur mock pour les tests ===${NC}"

# Fonction pour nettoyer les processus à la sortie
cleanup() {
  echo -e "\n${YELLOW}Nettoyage des processus...${NC}"
  
  # Tuer tous les processus sur le port 9999
  if lsof -i :9999 > /dev/null 2>&1; then
    echo -e "${YELLOW}Arrêt de tous les processus sur le port 9999...${NC}"
    lsof -i :9999 -t | xargs kill -9 2>/dev/null
    sleep 2
  fi
  
  # Vérifier si le serveur est arrêté
  if ! lsof -i :9999 > /dev/null 2>&1; then
    echo -e "${GREEN}Serveur mock arrêté avec succès.${NC}"
  else
    echo -e "${RED}Impossible d'arrêter tous les processus sur le port 9999.${NC}"
  fi
}

# Configurer le trap pour nettoyer en cas d'interruption
trap cleanup EXIT INT TERM

# Vérifier si un serveur est déjà en cours d'exécution
if lsof -i :9999 > /dev/null 2>&1; then
  echo -e "${YELLOW}Un serveur est déjà en cours d'exécution sur le port 9999. Arrêt...${NC}"
  lsof -i :9999 -t | xargs kill -9 2>/dev/null
  sleep 2
fi

# Démarrer le serveur mock Node.js en arrière-plan
echo -e "${YELLOW}Démarrage du serveur mock Node.js...${NC}"
node "$PROJECT_ROOT/test-improved/scripts/mock-server.js" > /tmp/mock-server.log 2>&1 &
SERVER_PID=$!

# Attendre que le serveur soit prêt et vérifier qu'il est opérationnel
echo -e "${YELLOW}Vérification de la disponibilité du serveur...${NC}"

# Attendre 2 secondes pour que le serveur démarre
sleep 2

# Vérifier que le serveur est accessible avec notre script de vérification
MAX_RETRIES=15
for i in $(seq 1 $MAX_RETRIES); do
  echo -n "."
  
  if node "$PROJECT_ROOT/test-improved/scripts/test-server-status.js" > /dev/null 2>&1; then
    echo -e "\n${GREEN}Serveur mock démarré et opérationnel sur le port 9999.${NC}"
    # Attendre 1 seconde supplémentaire pour s'assurer que le serveur est complètement initialisé
    sleep 1
    exit 0
  fi
  
  # Si on atteint la dernière tentative, échouer
  if [ $i -eq $MAX_RETRIES ]; then
    echo -e "\n${RED}ERREUR: Le serveur mock n'est pas opérationnel après ${MAX_RETRIES} tentatives.${NC}"
    echo -e "${YELLOW}Vérifiez les logs du serveur dans /tmp/mock-server.log${NC}"
    cleanup
    exit 1
  fi
  
  sleep 1
done
