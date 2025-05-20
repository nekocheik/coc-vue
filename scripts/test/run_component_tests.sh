#!/bin/bash
# scripts/run_component_tests.sh
# Script to run the component integration tests
#
# Usage:
#   ./scripts/run_component_tests.sh                  # Run all tests
#   ./scripts/run_component_tests.sh <section-name>   # Run tests for a specific section
#
# Available sections:
#   component-loading   - Tests for loading components (valid and invalid)
#   component-state     - Tests for getting component state
#   dropdown-control    - Tests for opening/closing the dropdown
#   option-selection    - Tests for selecting options
#   props-update        - Tests for updating component properties
#   multi-select        - Tests for multi-select mode
#   navigation          - Tests for navigating through options
#   error-handling      - Tests for error handling
#   cleanup             - Tests for unloading components

# Set the path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Fonction pour vérifier les logs après chaque étape
check_logs() {
  local step_name=$1
  echo -e "${YELLOW}Vérification des logs après l'étape: ${step_name}${NC}"
  "$PROJECT_ROOT/scripts/utils/check_neovim_logs.sh" "$step_name"
}

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting component integration tests...${NC}"

# Nettoyer tous les processus Neovim qui pourraient être en cours d'exécution
echo -e "${YELLOW}Nettoyage des processus Neovim existants...${NC}"
pkill -f "nvim --headless" || true

# Check if port 9999 is already in use
if lsof -i :9999 > /dev/null 2>&1; then
  echo -e "${RED}Port 9999 is already in use. Killing existing processes...${NC}"
  lsof -i :9999 -t | xargs kill -9 || true
  sleep 3
fi

# Start the component server in the background
echo -e "${YELLOW}Starting component server...${NC}"
echo -e "${GREEN}TIP: Pour vérifier les erreurs dans Neovim, utilisez :messages et :CocOpenLog${NC}"
"$PROJECT_ROOT/scripts/server/run_component_server.sh" &
SERVER_PID=$!

# Vérifier les logs après le démarrage du serveur
check_logs "server_startup"

# Wait for the server to start
echo -e "${YELLOW}Waiting for component server to start...${NC}"

# Attendre que le port soit disponible
MAX_RETRIES=10
COUNT=0
while ! nc -z 127.0.0.1 9999 && [ $COUNT -lt $MAX_RETRIES ]; do
  echo -e "${YELLOW}Waiting for server to be ready... ($COUNT/$MAX_RETRIES)${NC}"
  sleep 2
  COUNT=$((COUNT+1))
done

if ! nc -z 127.0.0.1 9999; then
  echo -e "${RED}Server failed to start after $MAX_RETRIES retries${NC}"
  exit 1
fi

echo -e "${GREEN}Server is ready!${NC}"
sleep 2 # Attendre un peu plus pour s'assurer que le serveur est stable

# Vérifier les logs après que le serveur est prêt
check_logs "server_ready"

# Function to clean up when the script exits
function cleanup {
  echo -e "${YELLOW}Cleaning up...${NC}"
  if ps -p $SERVER_PID > /dev/null; then
    echo -e "${YELLOW}Killing server process (PID: $SERVER_PID)${NC}"
    kill -9 $SERVER_PID
  fi
  echo -e "${GREEN}Cleanup complete${NC}"
}

# Register the cleanup function to be called on exit
trap cleanup EXIT

# Get the test section from command line argument
TEST_SECTION="$1"

# Run the integration tests
if [ -z "$TEST_SECTION" ] || [ "$TEST_SECTION" = "all" ]; then
  echo -e "${GREEN}Running ALL component integration tests...${NC}"
  TEST_SECTION="all" npx jest --verbose --runInBand --testTimeout=40000 --forceExit __tests__/integration/select-component-integration.test.ts
else
  echo -e "${GREEN}Running component integration tests for section: ${YELLOW}$TEST_SECTION${NC}"
  TEST_SECTION="$TEST_SECTION" npx jest --verbose --runInBand --testTimeout=40000 --forceExit __tests__/integration/select-component-integration.test.ts
fi

# Vérifier les logs après l'exécution des tests
check_logs "tests_execution"

# The exit code will be the exit code of the jest command
EXIT_CODE=$?

# Vérifier les logs après le nettoyage
check_logs "cleanup"

# Exit with the same code as the tests
exit $EXIT_CODE
