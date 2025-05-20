#!/bin/bash
# Script pour exécuter les tests dans un conteneur Docker

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher l'en-tête
print_header() {
  echo -e "\n${BLUE}=========================================${NC}"
  echo -e "${BLUE}   Tests Docker pour coc-vue   ${NC}"
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

# Fonction principale
main() {
  print_header
  
  # Vérifier si Docker est installé
  if ! command -v docker &> /dev/null; then
    print_error "Docker n'est pas installé. Veuillez l'installer avant de continuer."
    exit 1
  fi
  
  print_info "Construction de l'image Docker..."
  docker build -t coc-vue-test .
  
  if [ $? -ne 0 ]; then
    print_error "Échec de la construction de l'image Docker."
    exit 1
  fi
  
  print_success "Image Docker construite avec succès."
  
  print_info "Exécution des tests simplifiés dans Docker..."
  docker run --rm coc-vue-test ./scripts/test/runners/run-simplified-tests.sh
  
  if [ $? -ne 0 ]; then
    print_error "Échec des tests dans Docker."
    exit 1
  fi
  
  print_success "Tests exécutés avec succès dans Docker!"
}

# Exécuter la fonction principale
main "$@"
