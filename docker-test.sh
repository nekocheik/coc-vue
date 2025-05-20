#!/bin/bash
# Script to run tests in a Docker container

# Colors for display
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display header
print_header() {
  echo -e "\n${BLUE}=========================================${NC}"
  echo -e "${BLUE}   Docker Tests for coc-vue   ${NC}"
  echo -e "${BLUE}=========================================${NC}\n"
}

# Function to display information messages
print_info() {
  echo -e "${YELLOW}$1${NC}"
}

# Function to display success messages
print_success() {
  echo -e "${GREEN}$1${NC}"
}

# Function to display error messages
print_error() {
  echo -e "${RED}$1${NC}"
}

# Main function
main() {
  print_header
  
  # Check if Docker is installed
  if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install it before continuing."
    exit 1
  fi
  
  print_info "Building Docker image..."
  docker build -t coc-vue-test .
  
  if [ $? -ne 0 ]; then
    print_error "Failed to build Docker image."
    exit 1
  fi
  
  print_success "Docker image built successfully."
  
  print_info "Running simplified tests in Docker..."
  docker run --rm coc-vue-test ./scripts/test/runners/run-simplified-tests.sh
  
  if [ $? -ne 0 ]; then
    print_error "Tests failed in Docker."
    exit 1
  fi
  
  print_success "Tests executed successfully in Docker!"
}

# Run main function
main "$@"
