#!/bin/bash
# run-unit-tests.sh
# Script pour exécuter les tests unitaires avec Jest

# Importer les utilitaires communs
source "$(dirname "${BASH_SOURCE[0]}")/../core/test-utils.sh"

# Définir le timeout global (en secondes)
MAX_TIMEOUT=${MAX_TIMEOUT:-120}  # 2 minutes par défaut

# Fonction de nettoyage à la sortie
cleanup() {
  print_info "Nettoyage des ressources..."
  
  # Tuer le processus Jest s'il est toujours en cours d'exécution
  if [ -n "$JEST_PID" ]; then
    kill_process $JEST_PID
  fi
  
  print_success "Nettoyage terminé."
}

# Fonction principale
main() {
  # Afficher l'en-tête
  print_header "Exécution des tests unitaires COC-Vue"
  print_info "Timeout défini à ${MAX_TIMEOUT} secondes"
  
  # Vérifier les prérequis
  check_prerequisites "node" "npx" "jest"
  
  # Configurer le trap pour nettoyer en cas d'interruption
  trap cleanup EXIT INT TERM
  
  print_info "Démarrage des tests unitaires..."
  
  # Construire la commande Jest
  local jest_cmd="npx jest --config ./test/jest.config.js"
  
  # Ajouter les arguments spécifiques
  if [ $# -eq 0 ]; then
    # Si aucun argument n'est fourni, sélectionner le projet UNIT
    jest_cmd="$jest_cmd --selectProjects UNIT"
  else
    # Sinon, utiliser les arguments fournis
    for arg in "$@"; do
      # Ne pas transmettre les arguments spécifiques au script principal
      if [[ "$arg" != "--unit-only" && "$arg" != "--integration-only" && 
            "$arg" != "--component" && "$arg" != "--command" && 
            "$arg" != "--ping" && "$arg" != "--all" ]]; then
        jest_cmd="$jest_cmd $arg"
      fi
    done
  fi
  
  print_debug "Commande Jest: $jest_cmd"
  
  # Exécuter les tests unitaires avec Jest en arrière-plan
  VERBOSE_LOGS=${VERBOSE_LOGS:-false} eval "$jest_cmd" &
  JEST_PID=$!
  
  # Surveiller le processus Jest avec un timeout
  local elapsed=0
  local interval=1
  while kill -0 $JEST_PID 2>/dev/null; do
    # Vérifier si le timeout est atteint
    if [ $elapsed -ge $MAX_TIMEOUT ]; then
      print_error "ERREUR: Les tests ont dépassé le timeout de ${MAX_TIMEOUT} secondes."
      print_error "Arrêt forcé des tests..."
      kill_process $JEST_PID true
      exit 1
    fi
    
    # Attendre et incrémenter le compteur
    sleep $interval
    elapsed=$((elapsed + interval))
    
    # Afficher un point toutes les 10 secondes pour montrer que le script est toujours actif
    if [ $((elapsed % 10)) -eq 0 ]; then
      echo -n "."
    fi
  done
  
  # Attendre que Jest se termine (s'il n'a pas été tué)
  wait $JEST_PID 2>/dev/null
  local exit_code=$?
  
  if [ $exit_code -eq 0 ]; then
    print_success "✓ Tous les tests unitaires ont réussi !"
  else
    print_error "✗ Certains tests unitaires ont échoué."
    print_info "Pour voir les logs détaillés, exécutez avec VERBOSE_LOGS=true :"
    print_info "VERBOSE_LOGS=true ./scripts/test/runners/run-unit-tests.sh"
    print_info "Pour augmenter le timeout, utilisez MAX_TIMEOUT=<secondes> :"
    print_info "MAX_TIMEOUT=300 ./scripts/test/runners/run-unit-tests.sh"
  fi
  
  return $exit_code
}

# Exécuter la fonction principale avec les arguments
main "$@"
