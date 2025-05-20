#!/bin/bash
# Script pour nettoyer tous les ports utilisés par les tests

# Couleurs pour une meilleure lisibilité
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Chemin vers la racine du projet
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}=== Nettoyage des ports de test ===${NC}"

# Exécuter le script de nettoyage des ports
node -e "require('./test/utils/port-manager').cleanupAllPorts()"

# Vérifier si des processus restent sur les ports de la plage 9100-9999
REMAINING_PROCESSES=$(lsof -i:9100-9999 -t 2>/dev/null)

if [ -n "$REMAINING_PROCESSES" ]; then
  echo -e "${YELLOW}Des processus utilisent encore des ports dans la plage 9100-9999:${NC}"
  echo "$REMAINING_PROCESSES" | while read -r PID; do
    COMMAND=$(ps -p $PID -o comm= 2>/dev/null)
    PORT=$(lsof -p $PID -a -i TCP -F n 2>/dev/null | grep -oP 'n.*:.*->|n.*:.*$' | grep -oP ':[0-9]+' | grep -oP '[0-9]+')
    
    if [ -n "$COMMAND" ] && [ -n "$PORT" ]; then
      echo -e "${YELLOW}PID: $PID, Commande: $COMMAND, Port: $PORT${NC}"
      
      # Demander confirmation avant de tuer le processus
      echo -e "${YELLOW}Voulez-vous tuer ce processus? (y/n)${NC}"
      read -r CONFIRM
      
      if [[ $CONFIRM =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Tentative de tuer le processus $PID...${NC}"
        kill -9 $PID 2>/dev/null
        
        if kill -0 $PID 2>/dev/null; then
          echo -e "${RED}Échec de l'arrêt du processus $PID${NC}"
        else
          echo -e "${GREEN}Processus $PID arrêté avec succès${NC}"
        fi
      else
        echo -e "${YELLOW}Processus $PID ignoré${NC}"
      fi
    fi
  done
else
  echo -e "${GREEN}Aucun processus n'utilise de ports dans la plage 9100-9999${NC}"
fi

echo -e "${GREEN}Nettoyage des ports terminé${NC}"
