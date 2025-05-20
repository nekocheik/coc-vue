#!/bin/bash
# run-integration-tests.sh
# Script pour exécuter les tests d'intégration avec Jest et le serveur mock

# Importer les utilitaires communs
source "$(dirname "${BASH_SOURCE[0]}")/../core/test-utils.sh"

# Définir le timeout global (en secondes)
MAX_TIMEOUT=${MAX_TIMEOUT:-300}  # 5 minutes par défaut

# Fonction de nettoyage à la sortie
cleanup() {
  print_info "Nettoyage des ressources..."
  
  # Arrêter le serveur mock
  if [ -n "$SERVER_PID" ]; then
    kill_process $SERVER_PID
  fi
  
  # Tuer le processus Jest s'il est toujours en cours d'exécution
  if [ -n "$JEST_PID" ]; then
    kill_process $JEST_PID
  fi
  
  # Libérer les ports utilisés
  node -e "require('$PROJECT_ROOT/test/utils/port-manager').killAllActivePorts()"
  
  print_success "Nettoyage terminé."
}

# Fonction principale
main() {
  # Afficher l'en-tête
  print_header "Exécution des tests d'intégration COC-Vue"
  print_info "Timeout défini à ${MAX_TIMEOUT} secondes"
  
  # Vérifier les prérequis
  check_prerequisites "node" "npx" "jest" "lsof"
  
  # Configurer le trap pour nettoyer en cas d'interruption
  trap cleanup EXIT INT TERM
  
  # Nettoyer les ports avant de commencer
  print_info "Nettoyage des ports de test..."
  node -e "require('$PROJECT_ROOT/test/utils/port-manager').cleanupAllPorts()"
  
  # Démarrer le serveur mock
  print_info "Démarrage du serveur mock pour les tests..."
  SERVER_PID=$(start_server "node \"$PROJECT_ROOT/scripts/test/core/mock-server.js\"" "/tmp/mock-server.log")
  
  # Attendre que le serveur soit prêt (vérifier le fichier .server-info.json)
  print_info "Attente du démarrage du serveur..."
  if ! wait_for_file "$PROJECT_ROOT/test/.server-info.json" 30; then
    print_error "ERREUR: Le serveur mock n'a pas démarré correctement."
    print_info "Consultez les logs dans /tmp/mock-server.log pour plus de détails."
    cleanup
    exit 1
  fi
  
  # Récupérer le port du serveur
  SERVER_PORT=$(node -e "console.log(require('$PROJECT_ROOT/test/.server-info.json').port)")
  print_success "Serveur mock démarré sur le port $SERVER_PORT."
  
  print_info "Exécution des tests d'intégration..."
  
  # Construire la commande Jest
  local jest_cmd="npx jest --config ./test/jest.config.js"
  
  # Ajouter les arguments spécifiques
  if [ $# -eq 0 ]; then
    # Si aucun argument n'est fourni, sélectionner le projet INTEGRATION
    jest_cmd="$jest_cmd --selectProjects INTEGRATION"
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
  
  # Exécuter les tests d'intégration avec Jest en arrière-plan
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
    print_success "✓ Tous les tests d'intégration ont réussi !"
  else
    print_error "✗ Certains tests d'intégration ont échoué."
    print_info "Pour voir les logs détaillés, exécutez avec VERBOSE_LOGS=true :"
    print_info "VERBOSE_LOGS=true ./scripts/test/runners/run-integration-tests.sh"
    print_info "Pour augmenter le timeout, utilisez MAX_TIMEOUT=<secondes> :"
    print_info "MAX_TIMEOUT=600 ./scripts/test/runners/run-integration-tests.sh"
  fi
  
  return $exit_code
}

# Exécuter la fonction principale avec les arguments
main "$@"
