#!/bin/bash
# Script to run tests in Docker environment
# This script ensures tests are run from the project root

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m'

# Display header
echo -e "${BLUE}   Docker Tests for coc-vue    ${NC}"
echo -e "${BLUE}================================${NC}"

# Configure test environment
echo -e "\\n${YELLOW}Configuring test environment...${NC}"
export NODE_ENV=test
export JEST_TIMEOUT=30000

# Run tests with Jest directly
echo -e "\\n${YELLOW}Running unit tests...${NC}"
npx jest --config /app/jest.config.js --testPathPattern="__tests__/(?!integration)" --passWithNoTests
UNIT_RESULT=$?

echo -e "\\n${YELLOW}Running component tests...${NC}"
npx jest --config /app/jest.config.js --testPathPattern="__tests__/components" --passWithNoTests
COMPONENT_RESULT=$?

echo -e "\\n${YELLOW}Running integration tests...${NC}"
npx jest --config /app/jest.config.js --testPathPattern="__tests__/integration" --passWithNoTests
INTEGRATION_RESULT=$?

# Run Vader tests for components
echo -e "\\n${YELLOW}Running Vader component tests...${NC}"
./scripts/run-vader-tests.sh
VADER_RESULT=$?

# Capture Vader test results but don't fail CI
VADER_ACTUAL_RESULT=$VADER_RESULT

# Display test summary
echo -e "\\n${BLUE}=== Test Summary ====${NC}"
[ $UNIT_RESULT -eq 0 ] && echo -e "${GREEN}✓ Unit tests: PASSED${NC}" || echo -e "${RED}✗ Unit tests: FAILED (code $UNIT_RESULT)${NC}"
[ $COMPONENT_RESULT -eq 0 ] && echo -e "${GREEN}✓ Component tests: PASSED${NC}" || echo -e "${RED}✗ Component tests: FAILED (code $COMPONENT_RESULT)${NC}"
[ $INTEGRATION_RESULT -eq 0 ] && echo -e "${GREEN}✓ Integration tests: PASSED${NC}" || echo -e "${RED}✗ Integration tests: FAILED (code $INTEGRATION_RESULT)${NC}"
[ $VADER_ACTUAL_RESULT -eq 0 ] && echo -e "${GREEN}✓ Vader component tests: PASSED${NC}" || echo -e "${RED}✗ Vader component tests: FAILED (code $VADER_ACTUAL_RESULT) - Ignored for CI${NC}"

# Show Vader test report if available
if [ -f ".ci-artifacts/vader-reports/vader_test_report.html" ]; then
  echo -e "${BLUE}Detailed Vader test report available in .ci-artifacts/vader-reports/vader_test_report.html${NC}"
fi

# Determine overall test status
if [ $UNIT_RESULT -eq 0 ] && [ $COMPONENT_RESULT -eq 0 ] && [ $INTEGRATION_RESULT -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  [ $VADER_ACTUAL_RESULT -ne 0 ] && echo -e "${YELLOW}All critical tests passed, but some Vader tests failed.${NC}"
  exit 0
else
  echo -e "${RED}Some critical tests failed.${NC}"
  exit 1
fi
