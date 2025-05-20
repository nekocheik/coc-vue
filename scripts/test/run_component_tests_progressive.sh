#!/bin/bash
# scripts/run_component_tests_progressive.sh
# Script to run the component integration tests progressively, section by section

# Set the path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${BLUE}=== PROGRESSIVE SELECT COMPONENT INTEGRATION TESTS ===${NC}"
echo -e "${YELLOW}Starting progressive component integration tests...${NC}"

# Check if port 9999 is already in use
if lsof -i :9999 > /dev/null 2>&1; then
  echo -e "${RED}Port 9999 is already in use. Killing existing processes...${NC}"
  lsof -i :9999 -t | xargs kill -9
  sleep 2
fi

# Start the component server in the background
echo -e "${YELLOW}Starting component server...${NC}"
"$PROJECT_ROOT/scripts/run_component_server.sh" &
SERVER_PID=$!

# Wait for the server to start
echo -e "${YELLOW}Waiting for component server to start...${NC}"
sleep 5

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

# Function to run a specific test or test pattern
run_test() {
  local test_pattern=$1
  local test_description=$2
  
  echo -e "\n${BOLD}${BLUE}=== RUNNING TEST SECTION: ${test_description} ===${NC}"
  echo -e "${YELLOW}Test pattern: ${test_pattern}${NC}"
  
  # Set environment variables based on test section
  if [ "$section" != "Component Load" ]; then
    export SKIP_COMPONENT_LOAD="true"
    echo -e "${YELLOW}Using existing component (SKIP_COMPONENT_LOAD=true)${NC}"
  else
    export SKIP_COMPONENT_LOAD="false"
    echo -e "${YELLOW}Creating new component (SKIP_COMPONENT_LOAD=false)${NC}"
  fi
  
  # Set FINAL_TEST_SECTION for the last section
  if [ "$section" == "Unload Component" ]; then
    export FINAL_TEST_SECTION="true"
    echo -e "${YELLOW}Final test section (FINAL_TEST_SECTION=true)${NC}"
  else
    export FINAL_TEST_SECTION="false"
  fi
  
  # Run the test with the specified pattern
  npx jest --verbose --runInBand --testNamePattern="${test_pattern}" --forceExit --detectOpenHandles __tests__/integration/select-component-integration.test.ts
  
  # Check if the test passed
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✓ SUCCESS: ${test_description} tests passed!${NC}"
    return 0
  else
    echo -e "${RED}${BOLD}✗ FAILURE: ${test_description} tests failed!${NC}"
    return 1
  fi
}

# Function to check if we should continue
check_continue() {
  local section_name=$1
  local success=$2
  
  if [ $success -ne 0 ]; then
    echo -e "${RED}${BOLD}Section '${section_name}' failed. Cannot continue to next section.${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}${BOLD}Section '${section_name}' completed successfully.${NC}"
  echo -e "${YELLOW}Continuing to the next section...${NC}"
  # Sleep for 2 seconds to allow reading the output
  sleep 2
}

# Run tests section by section
echo -e "\n${BOLD}${BLUE}Starting progressive test execution...${NC}"

# Section 1: Component load (valid + invalid)
run_test "should handle loading an invalid component|should handle loading with invalid options format|should load a Select component with valid configuration" "Component Load"
check_continue "Component Load" $?

# Section 2: Component load + Get initial state
run_test "should handle loading an invalid component|should handle loading with invalid options format|should load a Select component with valid configuration|should get the initial state of the Select component" "Get Initial State"
check_continue "Get Initial State" $?

# Section 3: Component load + Get initial state + Open dropdown
run_test "should handle loading an invalid component|should handle loading with invalid options format|should load a Select component with valid configuration|should get the initial state of the Select component|should open the Select component" "Open Dropdown"
check_continue "Open Dropdown" $?

# Section 4: Component load + Get initial state + Open dropdown + Select options
run_test "should handle loading an invalid component|should handle loading with invalid options format|should load a Select component with valid configuration|should get the initial state of the Select component|should open the Select component|should focus an option in the Select component|should select an option in the Select component|should update the options of the Select component|should select an option by value" "Select Options"
check_continue "Select Options" $?

# Section 5: Component load + Get initial state + Open dropdown + Select options + Change props
run_test "should handle loading an invalid component|should handle loading with invalid options format|should load a Select component with valid configuration|should get the initial state of the Select component|should open the Select component|should focus an option in the Select component|should select an option in the Select component|should select an option by value|should update the options of the Select component|should set the disabled state of the Select component" "Change Props"
check_continue "Change Props" $?

# Section 6: Component load + Multi-select mode
run_test "should handle loading an invalid component|should handle loading with invalid options format|should load a Select component with valid configuration|should get the initial state of the Select component|should open the Select component|should focus an option in the Select component|should select an option in the Select component|should select an option by value|should update the options of the Select component|should set the disabled state of the Select component|should handle multi-select mode" "Multi-select Mode"
check_continue "Multi-select Mode" $?

# Section 7: Component load + Multi-select mode + Navigation methods
run_test "should handle loading an invalid component|should handle loading with invalid options format|should load a Select component with valid configuration|should get the initial state of the Select component|should open the Select component|should focus an option in the Select component|should select an option in the Select component|should select an option by value|should update the options of the Select component|should set the disabled state of the Select component|should handle multi-select mode|should navigate through options" "Navigation Methods"
check_continue "Navigation Methods" $?

# Section 8: Component load + Multi-select mode + Navigation methods + Error handling
run_test "should handle loading an invalid component|should handle loading with invalid options format|should load a Select component with valid configuration|should get the initial state of the Select component|should open the Select component|should focus an option in the Select component|should select an option in the Select component|should select an option by value|should update the options of the Select component|should set the disabled state of the Select component|should handle multi-select mode|should navigate through options|should handle calling a non-existent method|should handle calling a method with invalid arguments" "Error Handling"
check_continue "Error Handling" $?

# Section 9: All tests including unload component
run_test "should handle loading an invalid component|should handle loading with invalid options format|should load a Select component with valid configuration|should get the initial state of the Select component|should open the Select component|should focus an option in the Select component|should select an option in the Select component|should select an option by value|should update the options of the Select component|should set the disabled state of the Select component|should handle multi-select mode|should navigate through options|should handle calling a non-existent method|should handle calling a method with invalid arguments|should unload the Select component|should handle operations on non-existent component" "Unload Component"
check_continue "Unload Component" $?

# Final summary
echo -e "\n${BOLD}${GREEN}=== TEST EXECUTION SUMMARY ===${NC}"
echo -e "${GREEN}All test sections completed successfully!${NC}"
echo -e "${BLUE}Sections covered:${NC}"
echo -e "  ${GREEN}✓${NC} Component Load (valid + invalid)"
echo -e "  ${GREEN}✓${NC} Get Initial State"
echo -e "  ${GREEN}✓${NC} Open and Close Dropdown"
echo -e "  ${GREEN}✓${NC} Select Option by Index and Value"
echo -e "  ${GREEN}✓${NC} Change Props and Re-check State"
echo -e "  ${GREEN}✓${NC} Multi-select Mode"
echo -e "  ${GREEN}✓${NC} Navigation Methods"
echo -e "  ${GREEN}✓${NC} Invalid Method and Config Errors"
echo -e "  ${GREEN}✓${NC} Unload Component and Resource Release"

echo -e "\n${BOLD}${GREEN}All integration tests for the Select component have passed!${NC}"
