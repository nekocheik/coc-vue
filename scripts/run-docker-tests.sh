#!/bin/bash
# Script to run tests in Docker container using local resources

# Terminal colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print header
echo -e "\n${BLUE}=========================================${NC}"
echo -e "${BLUE}   Docker Test Runner for coc-vue   ${NC}"
echo -e "${BLUE}=========================================${NC}\n"

# Check if .env file exists, if not create from example
if [ ! -f .env ]; then
  echo -e "${YELLOW}No .env file found. Creating from .env.example...${NC}"
  cp .env.example .env
  echo -e "${GREEN}Created .env file. Please edit it with your configuration if needed.${NC}"
fi

# Load environment variables from .env file
if [ -f .env ]; then
  echo -e "${YELLOW}Loading environment variables from .env file...${NC}"
  export $(grep -v '^#' .env | xargs)
fi

# Create test results directory if it doesn't exist
mkdir -p test-results

# Build the Docker image
echo -e "${YELLOW}Building Docker test image...${NC}"
docker-compose build test

# Check if build was successful
if [ $? -ne 0 ]; then
  echo -e "${RED}Docker build failed. Please check the error messages above.${NC}"
  exit 1
fi

# Run the tests in Docker container
echo -e "${YELLOW}Running tests in Docker container...${NC}"
docker-compose run --rm test

# Check test result
TEST_RESULT=$?
if [ $TEST_RESULT -eq 0 ]; then
  echo -e "\n${GREEN}✅ All tests passed successfully!${NC}"
else
  echo -e "\n${RED}❌ Some tests failed. Please check the output above.${NC}"
fi

# Clean up
echo -e "${YELLOW}Cleaning up Docker resources...${NC}"
docker-compose down

exit $TEST_RESULT
