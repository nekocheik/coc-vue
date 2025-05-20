#!/bin/bash
# test-utils.sh
# Fonctions utilitaires communes pour les scripts de test

# Chemin vers la racine du projet
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

# Couleurs pour une meilleure lisibilité
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Fonction pour afficher un message d'en-tête
print_header() {
  local title="$1"
  echo -e "\n${BLUE}=========================================${NC}"
  echo -e "${BLUE}   ${title}   ${NC}"
  echo -e "${BLUE}=========================================${NC}\n"
}

# Fonction pour afficher un message d'information
print_info() {
  echo -e "${YELLOW}$1${NC}"
}

# Fonction pour afficher un message de succès
print_success() {
  echo -e "${GREEN}$1${NC}"
}

# Fonction pour afficher un message d'erreur
print_error() {
  echo -e "${RED}$1${NC}"
}

# Fonction pour afficher un message de débogage (uniquement si VERBOSE=true)
print_debug() {
  if [ "${VERBOSE:-false}" = "true" ]; then
    echo -e "${CYAN}[DEBUG] $1${NC}"
  fi
}

# Fonction pour nettoyer les processus sur un port spécifique
cleanup_port() {
  local port="$1"
  print_info "Nettoyage des processus sur le port $port..."
  
  if lsof -i ":$port" > /dev/null 2>&1; then
    lsof -i ":$port" -t | xargs kill -9 2>/dev/null
    sleep 1
    
    if ! lsof -i ":$port" > /dev/null 2>&1; then
      print_success "Port $port libéré avec succès."
    else
      print_error "Impossible de libérer le port $port."
    fi
  else
    print_info "Aucun processus n'utilise le port $port."
  fi
}

# Fonction pour nettoyer tous les ports dans une plage
cleanup_port_range() {
  local start_port="$1"
  local end_port="$2"
  print_info "Nettoyage des ports dans la plage $start_port-$end_port..."
  
  # Utiliser le gestionnaire de ports si disponible
  if [ -f "$PROJECT_ROOT/test/utils/port-manager.js" ]; then
    node -e "require('$PROJECT_ROOT/test/utils/port-manager').cleanupAllPorts()"
  else
    # Fallback manuel
    local ports=$(lsof -i ":$start_port-$end_port" -t 2>/dev/null)
    if [ -n "$ports" ]; then
      echo "$ports" | xargs kill -9 2>/dev/null
      print_success "Ports dans la plage $start_port-$end_port libérés."
    else
      print_info "Aucun processus n'utilise de ports dans la plage $start_port-$end_port."
    fi
  fi
}

# Fonction pour attendre qu'un port soit disponible
wait_for_port() {
  local port="$1"
  local timeout="${2:-30}"  # Timeout par défaut: 30 secondes
  local interval="${3:-1}"  # Intervalle par défaut: 1 seconde
  
  print_info "Attente de la disponibilité du port $port (timeout: ${timeout}s)..."
  
  local elapsed=0
  while [ $elapsed -lt $timeout ]; do
    if lsof -i ":$port" > /dev/null 2>&1; then
      print_success "Port $port est disponible."
      return 0
    fi
    
    sleep $interval
    elapsed=$((elapsed + interval))
    echo -n "."
  done
  
  print_error "Timeout atteint en attendant que le port $port soit disponible."
  return 1
}

# Fonction pour attendre qu'un fichier existe
wait_for_file() {
  local file_path="$1"
  local timeout="${2:-30}"  # Timeout par défaut: 30 secondes
  local interval="${3:-1}"  # Intervalle par défaut: 1 seconde
  
  print_info "Attente de la création du fichier $file_path (timeout: ${timeout}s)..."
  
  local elapsed=0
  while [ $elapsed -lt $timeout ]; do
    if [ -f "$file_path" ]; then
      print_success "Fichier $file_path créé."
      return 0
    fi
    
    sleep $interval
    elapsed=$((elapsed + interval))
    echo -n "."
  done
  
  print_error "Timeout atteint en attendant la création du fichier $file_path."
  return 1
}

# Fonction pour démarrer un serveur en arrière-plan et capturer son PID
start_server() {
  local command="$1"
  local log_file="${2:-/tmp/server.log}"
  
  print_info "Démarrage du serveur en arrière-plan..."
  print_debug "Commande: $command"
  print_debug "Logs: $log_file"
  
  eval "$command > $log_file 2>&1 &"
  local server_pid=$!
  
  print_success "Serveur démarré avec PID: $server_pid"
  echo $server_pid
}

# Fonction pour tuer un processus proprement
kill_process() {
  local pid="$1"
  local force="${2:-false}"
  
  if [ -z "$pid" ]; then
    print_error "PID non spécifié."
    return 1
  fi
  
  if ! ps -p $pid > /dev/null; then
    print_info "Le processus $pid n'existe pas ou a déjà été arrêté."
    return 0
  fi
  
  print_info "Arrêt du processus $pid..."
  
  if [ "$force" = "true" ]; then
    kill -9 $pid 2>/dev/null
  else
    kill $pid 2>/dev/null
    sleep 1
    
    # Si le processus existe toujours, utiliser kill -9
    if ps -p $pid > /dev/null; then
      print_info "Le processus $pid ne répond pas, arrêt forcé..."
      kill -9 $pid 2>/dev/null
    fi
  fi
  
  if ! ps -p $pid > /dev/null; then
    print_success "Processus $pid arrêté avec succès."
    return 0
  else
    print_error "Impossible d'arrêter le processus $pid."
    return 1
  fi
}

# Fonction pour exécuter une commande avec timeout
run_with_timeout() {
  local command="$1"
  local timeout="${2:-60}"  # Timeout par défaut: 60 secondes
  local description="${3:-Commande}"
  
  print_info "Exécution de: $description (timeout: ${timeout}s)..."
  print_debug "Commande complète: $command"
  
  # Démarrer la commande en arrière-plan
  eval "$command" &
  local cmd_pid=$!
  
  # Surveiller le processus avec un timeout
  local elapsed=0
  local interval=1
  while kill -0 $cmd_pid 2>/dev/null; do
    if [ $elapsed -ge $timeout ]; then
      print_error "Timeout atteint pour: $description"
      kill_process $cmd_pid true
      return 124  # Code de sortie standard pour timeout
    fi
    
    sleep $interval
    elapsed=$((elapsed + interval))
    
    # Afficher un point toutes les 5 secondes pour montrer que le script est toujours actif
    if [ $((elapsed % 5)) -eq 0 ]; then
      echo -n "."
    fi
  done
  
  # Récupérer le code de sortie
  wait $cmd_pid
  local exit_code=$?
  
  if [ $exit_code -eq 0 ]; then
    print_success "$description terminé avec succès."
  else
    print_error "$description a échoué avec le code de sortie: $exit_code"
  fi
  
  return $exit_code
}

# Fonction pour vérifier les prérequis
check_prerequisites() {
  local missing=false
  
  # Vérifier les commandes requises
  for cmd in "$@"; do
    if ! command -v $cmd &> /dev/null; then
      print_error "Commande requise non trouvée: $cmd"
      missing=true
    fi
  done
  
  if [ "$missing" = "true" ]; then
    print_error "Certains prérequis sont manquants. Veuillez les installer avant de continuer."
    return 1
  fi
  
  print_success "Tous les prérequis sont installés."
  return 0
}

# Exporter les fonctions et variables
export PROJECT_ROOT
export GREEN RED YELLOW BLUE CYAN BOLD NC
export -f print_header print_info print_success print_error print_debug
export -f cleanup_port cleanup_port_range wait_for_port wait_for_file
export -f start_server kill_process run_with_timeout check_prerequisites
