#!/bin/bash
# Script to set up GitHub Actions CI and manage secrets

# Terminal colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print header
echo -e "\n${BLUE}=========================================${NC}"
echo -e "${BLUE}   GitHub CI Setup for coc-vue   ${NC}"
echo -e "${BLUE}=========================================${NC}\n"

# Check if gh CLI is logged in
echo -e "${YELLOW}Checking GitHub CLI authentication...${NC}"
gh auth status > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo -e "${RED}You are not logged in to GitHub CLI.${NC}"
  echo -e "${YELLOW}Please run 'gh auth login' to authenticate.${NC}"
  exit 1
fi

# Get repository information
REPO_URL=$(git config --get remote.origin.url)
if [ -z "$REPO_URL" ]; then
  echo -e "${RED}No git remote found. Please set up a GitHub repository first.${NC}"
  exit 1
fi

echo -e "${GREEN}Repository URL: $REPO_URL${NC}"

# Check if workflow file exists
if [ -f .github/workflows/test.yml ]; then
  echo -e "${GREEN}GitHub Actions workflow file already exists.${NC}"
else
  echo -e "${RED}GitHub Actions workflow file not found.${NC}"
  echo -e "${YELLOW}Please ensure .github/workflows/test.yml exists.${NC}"
  exit 1
fi

# Function to add a secret to GitHub
add_secret() {
  local secret_name=$1
  local prompt_text=$2
  
  echo -e "${YELLOW}$prompt_text${NC}"
  read -s secret_value
  echo
  
  if [ -z "$secret_value" ]; then
    echo -e "${RED}No value provided. Skipping this secret.${NC}"
    return
  fi
  
  echo -e "${YELLOW}Adding secret $secret_name to GitHub...${NC}"
  echo "$secret_value" | gh secret set "$secret_name"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Secret $secret_name added successfully.${NC}"
  else
    echo -e "${RED}Failed to add secret $secret_name.${NC}"
  fi
}

# Ask if user wants to add secrets
echo -e "${YELLOW}Do you want to add secrets to your GitHub repository? (y/n)${NC}"
read add_secrets

if [ "$add_secrets" = "y" ] || [ "$add_secrets" = "Y" ]; then
  # Add example secrets (customize as needed)
  add_secret "API_TOKEN" "Enter your API token (input will be hidden):"
  add_secret "NPM_TOKEN" "Enter your NPM token (input will be hidden):"
  
  echo -e "${GREEN}Secrets have been added to your GitHub repository.${NC}"
  echo -e "${YELLOW}These secrets can be used in your GitHub Actions workflows.${NC}"
else
  echo -e "${YELLOW}Skipping secret addition.${NC}"
fi

# Enable GitHub Actions if not already enabled
echo -e "${YELLOW}Ensuring GitHub Actions is enabled for this repository...${NC}"
gh api repos/:owner/:repo/actions/permissions --method PUT -f enabled=true > /dev/null 2>&1

# Create a test workflow dispatch to verify setup
echo -e "${YELLOW}Do you want to trigger a test workflow now? (y/n)${NC}"
read trigger_workflow

if [ "$trigger_workflow" = "y" ] || [ "$trigger_workflow" = "Y" ]; then
  echo -e "${YELLOW}Triggering workflow...${NC}"
  gh workflow run test.yml
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Workflow triggered successfully.${NC}"
    echo -e "${YELLOW}You can check the workflow status with:${NC}"
    echo -e "${BLUE}gh run list${NC}"
  else
    echo -e "${RED}Failed to trigger workflow.${NC}"
  fi
else
  echo -e "${YELLOW}Skipping workflow trigger.${NC}"
fi

echo -e "\n${GREEN}GitHub CI setup completed!${NC}"
echo -e "${YELLOW}You can now run tests locally with:${NC}"
echo -e "${BLUE}./scripts/run-docker-tests.sh${NC}"
echo -e "${YELLOW}And monitor GitHub Actions runs with:${NC}"
echo -e "${BLUE}gh run list${NC}"
