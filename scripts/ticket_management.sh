#!/bin/bash
# Ticket management functions for coc-vue with category-specific templates

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Set the path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TICKET_DIR="$PROJECT_ROOT/Ticket"

# Valid categories
VALID_CATEGORIES=("feat" "ui" "structure" "ci" "docs" "test" "perf")

# Function to create a new ticket
create_ticket() {
  local category="$1"
  local priority="$2"
  local title="$3"
  local status="pending"
  
  # Validate category
  if [[ ! " ${VALID_CATEGORIES[@]} " =~ " ${category} " ]]; then
    echo -e "${RED}Error: Invalid category. Valid categories are: ${VALID_CATEGORIES[*]}${NC}"
    return 1
  fi
  
  # Validate priority
  if ! [[ "$priority" =~ ^[0-9]+$ ]] || [ "$priority" -lt 1 ] || [ "$priority" -gt 100 ]; then
    echo -e "${RED}Error: Priority must be a number between 1 and 100.${NC}"
    return 1
  fi
  
  if [ -z "$title" ]; then
    echo -e "${RED}Error: You must specify a title for the ticket.${NC}"
    echo -e "${YELLOW}Example: ./coc-vue-cli.sh ticket:create feat 90 'Fix Vader Test Integration'${NC}"
    return 1
  fi
  
  # Generate UUID for the ticket
  local uuid=$(uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]' | cut -c1-8)
  local ticket_name="issue-${priority}-${uuid}-${status}"
  local ticket_dir="$TICKET_DIR/$category/$ticket_name"
  
  # Create ticket directory
  mkdir -p "$ticket_dir"
  
  # Generate ticket content based on category
  case $category in
    "feat")
      create_feature_ticket "$ticket_dir" "$title" "$priority" "$uuid"
      ;;
    "ui")
      create_ui_ticket "$ticket_dir" "$title" "$priority" "$uuid"
      ;;
    "structure")
      create_structure_ticket "$ticket_dir" "$title" "$priority" "$uuid"
      ;;
    "ci")
      create_ci_ticket "$ticket_dir" "$title" "$priority" "$uuid"
      ;;
    "docs")
      create_docs_ticket "$ticket_dir" "$title" "$priority" "$uuid"
      ;;
    "test")
      create_test_ticket "$ticket_dir" "$title" "$priority" "$uuid"
      ;;
    "perf")
      create_perf_ticket "$ticket_dir" "$title" "$priority" "$uuid"
      ;;
  esac
  
  # Update or create category roadmap
  update_category_roadmap "$category"

  echo -e "${GREEN}Ticket created successfully:${NC}"
  echo -e "${CYAN}Category:${NC} $category"
  echo -e "${CYAN}Priority:${NC} $priority"
  echo -e "${CYAN}UUID:${NC} $uuid"
  echo -e "${CYAN}Title:${NC} $title"
  echo -e "${CYAN}Path:${NC} $ticket_dir"
}

# Feature ticket template
create_feature_ticket() {
  local ticket_dir="$1"
  local title="$2"
  local priority="$3"
  local uuid="$4"
  
  cat > "$ticket_dir/index.md" << EOF
# $title

## Feature Information
- **Priority:** $priority
- **ID:** $uuid
- **Type:** Feature

## Detailed Description
Implementation of new feature: $title

## Requirements
- [ ] Feature should be accessible via the UI
- [ ] Feature should be documented
- [ ] Feature should have appropriate tests

## Workflow

### 1. Design Phase
- [ ] Create feature specification
- [ ] Design API and interfaces
- [ ] Review design with team

### 2. Implementation Phase
- [ ] Implement core functionality
- [ ] Add UI components if needed
- [ ] Integrate with existing systems

### 3. Testing Phase
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Perform manual testing

### 4. Documentation Phase
- [ ] Update user documentation
- [ ] Add code comments
- [ ] Create examples

### 5. Review and Finalization
- [ ] Code review
- [ ] Address feedback
- [ ] Final testing
- [ ] Merge to main branch

## Test Cases
\`\`\`
# Test case 1: Basic functionality
- Setup: Initialize component
- Action: Trigger feature
- Expected: Feature performs as expected

# Test case 2: Edge cases
- Setup: Create edge case scenario
- Action: Trigger feature under edge conditions
- Expected: Feature handles edge cases gracefully
\`\`\`

## Related Components
- Component 1
- Component 2
EOF

  # Create initial test state log file
  cat > "$ticket_dir/.initial_test_state.log" << EOF
# Initial Test State for $title
# Generated on $(date)
# Feature Implementation - Priority: $priority

Test run pending...
EOF
}

# UI ticket template
create_ui_ticket() {
  local ticket_dir="$1"
  local title="$2"
  local priority="$3"
  local uuid="$4"
  
  cat > "$ticket_dir/index.md" << EOF
# $title

## UI Component Information
- **Priority:** $priority
- **ID:** $uuid
- **Type:** UI

## Detailed Description
UI implementation for: $title

## Design Requirements
- [ ] Component should follow design guidelines
- [ ] Component should be responsive
- [ ] Component should be accessible

## Workflow

### 1. Design Phase
- [ ] Create mockups
- [ ] Review design with stakeholders
- [ ] Finalize design

### 2. Implementation Phase
- [ ] Create component structure
- [ ] Implement styling
- [ ] Add interactions and animations

### 3. Testing Phase
- [ ] Test in different screen sizes
- [ ] Test accessibility
- [ ] Perform user testing if applicable

### 4. Integration Phase
- [ ] Integrate with other components
- [ ] Test in actual usage context
- [ ] Refine based on integration feedback

## Visual References
\`\`\`
[Include mockups or design references here]
\`\`\`

## Accessibility Checklist
- [ ] Proper contrast ratios
- [ ] Keyboard navigation support
- [ ] Screen reader compatibility
- [ ] Appropriate ARIA attributes
EOF

  # Create initial test state log file
  cat > "$ticket_dir/.initial_test_state.log" << EOF
# Initial Test State for $title
# Generated on $(date)
# UI Implementation - Priority: $priority

UI component development pending...
EOF
}

# Structure ticket template
create_structure_ticket() {
  local ticket_dir="$1"
  local title="$2"
  local priority="$3"
  local uuid="$4"
  
  cat > "$ticket_dir/index.md" << EOF
# $title

## Structure Information
- **Priority:** $priority
- **ID:** $uuid
- **Type:** Structure

## Detailed Description
Structural improvement for: $title

## Objectives
- [ ] Improve code organization
- [ ] Reduce complexity
- [ ] Enhance maintainability

## Workflow

### 1. Analysis Phase
- [ ] Analyze current structure
- [ ] Identify pain points
- [ ] Define target architecture

### 2. Planning Phase
- [ ] Create migration plan
- [ ] Define intermediate steps
- [ ] Establish success metrics

### 3. Implementation Phase
- [ ] Refactor code
- [ ] Update dependencies
- [ ] Migrate components

### 4. Verification Phase
- [ ] Run tests
- [ ] Verify functionality
- [ ] Measure improvements

## Impact Assessment
- **Files affected:** [List of files]
- **Risk level:** [Low/Medium/High]
- **Backward compatibility:** [Yes/No]

## Rollback Plan
\`\`\`
# Steps to roll back if needed
1. Revert commits
2. Run verification tests
3. Deploy previous version
\`\`\`
EOF

  # Create initial test state log file
  cat > "$ticket_dir/.initial_test_state.log" << EOF
# Initial Test State for $title
# Generated on $(date)
# Structure Improvement - Priority: $priority

Current structure analysis pending...
EOF
}

# CI ticket template
create_ci_ticket() {
  local ticket_dir="$1"
  local title="$2"
  local priority="$3"
  local uuid="$4"
  
  cat > "$ticket_dir/index.md" << EOF
# $title

## CI/CD Information
- **Priority:** $priority
- **ID:** $uuid
- **Type:** CI

## Detailed Description
CI/CD improvement for: $title

## Objectives
- [ ] Improve build process
- [ ] Enhance test automation
- [ ] Streamline deployment

## Workflow

### 1. Analysis Phase
- [ ] Analyze current CI/CD pipeline
- [ ] Identify bottlenecks
- [ ] Research solutions

### 2. Implementation Phase
- [ ] Update CI configuration
- [ ] Implement new tools or scripts
- [ ] Configure integrations

### 3. Testing Phase
- [ ] Test pipeline changes
- [ ] Measure performance improvements
- [ ] Verify all stages work correctly

### 4. Documentation Phase
- [ ] Update CI/CD documentation
- [ ] Create examples for common scenarios
- [ ] Document troubleshooting steps

## Pipeline Configuration
\`\`\`yaml
# Example configuration
name: CI Pipeline
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      # Additional steps
\`\`\`

## Performance Metrics
- **Before:** [Current metrics]
- **Target:** [Target metrics]
EOF

  # Create initial test state log file
  cat > "$ticket_dir/.initial_test_state.log" << EOF
# Initial Test State for $title
# Generated on $(date)
# CI/CD Improvement - Priority: $priority

Current CI/CD pipeline analysis pending...
EOF
}

# Docs ticket template
create_docs_ticket() {
  local ticket_dir="$1"
  local title="$2"
  local priority="$3"
  local uuid="$4"
  
  cat > "$ticket_dir/index.md" << EOF
# $title

## Documentation Information
- **Priority:** $priority
- **ID:** $uuid
- **Type:** Documentation

## Detailed Description
Documentation improvement for: $title

## Objectives
- [ ] Improve clarity
- [ ] Add missing information
- [ ] Update outdated content

## Workflow

### 1. Research Phase
- [ ] Gather information
- [ ] Review existing documentation
- [ ] Identify gaps

### 2. Writing Phase
- [ ] Create outline
- [ ] Write content
- [ ] Add examples

### 3. Review Phase
- [ ] Technical review
- [ ] Editorial review
- [ ] User feedback if applicable

### 4. Publication Phase
- [ ] Format for target platform
- [ ] Publish documentation
- [ ] Announce updates

## Documentation Outline
\`\`\`
1. Introduction
   - Purpose
   - Audience
2. Main Content
   - Section 1
   - Section 2
3. Examples
4. References
\`\`\`

## Target Audience
- [ ] Developers
- [ ] End users
- [ ] Administrators
EOF

  # Create initial test state log file
  cat > "$ticket_dir/.initial_test_state.log" << EOF
# Initial Test State for $title
# Generated on $(date)
# Documentation Improvement - Priority: $priority

Documentation analysis pending...
EOF
}

# Test ticket template
create_test_ticket() {
  local ticket_dir="$1"
  local title="$2"
  local priority="$3"
  local uuid="$4"
  
  cat > "$ticket_dir/index.md" << EOF
# $title

## Testing Information
- **Priority:** $priority
- **ID:** $uuid
- **Type:** Test

## Detailed Description
Testing improvement for: $title

## Objectives
- [ ] Improve test coverage
- [ ] Enhance test reliability
- [ ] Streamline test process

## Workflow

### 1. Analysis Phase
- [ ] Analyze current tests
- [ ] Identify gaps in coverage
- [ ] Define test strategy

### 2. Implementation Phase
- [ ] Create test fixtures
- [ ] Implement test cases
- [ ] Set up test environment

### 3. Verification Phase
- [ ] Run tests
- [ ] Analyze results
- [ ] Fix failing tests

### 4. Integration Phase
- [ ] Integrate with CI/CD
- [ ] Set up reporting
- [ ] Document test procedures

## Test Cases
\`\`\`
# Test case 1: [Description]
- Setup: [Setup steps]
- Action: [Actions to perform]
- Expected: [Expected results]

# Test case 2: [Description]
- Setup: [Setup steps]
- Action: [Actions to perform]
- Expected: [Expected results]
\`\`\`

## Coverage Targets
- **Current coverage:** [Current percentage]
- **Target coverage:** [Target percentage]
EOF

  # Create initial test state log file
  cat > "$ticket_dir/.initial_test_state.log" << EOF
# Initial Test State for $title
# Generated on $(date)
# Testing Improvement - Priority: $priority

Current test coverage analysis pending...
EOF
}

# Performance ticket template
create_perf_ticket() {
  local ticket_dir="$1"
  local title="$2"
  local priority="$3"
  local uuid="$4"
  
  cat > "$ticket_dir/index.md" << EOF
# $title

## Performance Information
- **Priority:** $priority
- **ID:** $uuid
- **Type:** Performance

## Detailed Description
Performance improvement for: $title

## Objectives
- [ ] Reduce latency
- [ ] Optimize resource usage
- [ ] Improve user experience

## Workflow

### 1. Profiling Phase
- [ ] Measure current performance
- [ ] Identify bottlenecks
- [ ] Set performance targets

### 2. Implementation Phase
- [ ] Optimize algorithms
- [ ] Reduce resource usage
- [ ] Implement caching if applicable

### 3. Testing Phase
- [ ] Benchmark improvements
- [ ] Verify functionality
- [ ] Test under load

### 4. Documentation Phase
- [ ] Document optimizations
- [ ] Update performance guidelines
- [ ] Create monitoring plan

## Performance Metrics
\`\`\`
# Metric 1: [Description]
- Current: [Current value]
- Target: [Target value]

# Metric 2: [Description]
- Current: [Current value]
- Target: [Target value]
\`\`\`

## Profiling Tools
- Tool 1: [Description]
- Tool 2: [Description]
EOF

  # Create initial test state log file
  cat > "$ticket_dir/.initial_test_state.log" << EOF
# Initial Test State for $title
# Generated on $(date)
# Performance Improvement - Priority: $priority

Performance profiling pending...
EOF
}

# Function to update a category roadmap
update_category_roadmap() {
  local category="$1"
  local roadmap_file="$TICKET_DIR/$category/index.md"
  
  # Create roadmap header if it doesn't exist
  if [ ! -f "$roadmap_file" ]; then
    cat > "$roadmap_file" << EOF
# $category Roadmap

This document tracks all tickets in the $category category.

## Active Tickets

| Priority | ID | Title | Status |
|----------|-------|-------|--------|
EOF
  fi
  
  # Update roadmap with all tickets in the category
  local temp_file=$(mktemp)
  head -n 7 "$roadmap_file" > "$temp_file"
  
  # Add table header
  echo "| Priority | ID | Title | Status |" >> "$temp_file"
  echo "|----------|-------|-------|--------|" >> "$temp_file"
  
  # Add all tickets sorted by priority (highest first)
  for ticket_dir in "$TICKET_DIR/$category"/issue-*; do
    if [ -d "$ticket_dir" ]; then
      local ticket_name=$(basename "$ticket_dir")
      local priority=$(echo "$ticket_name" | cut -d'-' -f2)
      local uuid=$(echo "$ticket_name" | cut -d'-' -f3)
      local status=$(echo "$ticket_name" | cut -d'-' -f4)
      local title=""
      
      if [ -f "$ticket_dir/index.md" ]; then
        title=$(head -n 1 "$ticket_dir/index.md" | sed 's/^# //')
      else
        title="[No title found]"
      fi
      
      echo "| $priority | $uuid | [$title](./$ticket_name) | $status |" >> "$temp_file"
    fi
  done | sort -t'|' -k2 -nr
  
  mv "$temp_file" "$roadmap_file"
}

# Function to list all tickets
list_tickets() {
  echo -e "${YELLOW}Listing all tickets by category...${NC}"
  
  if [ ! -d "$TICKET_DIR" ]; then
    echo -e "${RED}No tickets found.${NC}"
    return 1
  fi
  
  for category in "${VALID_CATEGORIES[@]}"; do
    if [ -d "$TICKET_DIR/$category" ] && [ "$(ls -A "$TICKET_DIR/$category" 2>/dev/null)" ]; then
      echo -e "\n${CYAN}Category: ${category}${NC}"
      echo -e "${CYAN}-------------------${NC}"
      
      for ticket_dir in "$TICKET_DIR/$category"/issue-*; do
        if [ -d "$ticket_dir" ]; then
          local ticket_name=$(basename "$ticket_dir")
          local priority=$(echo "$ticket_name" | cut -d'-' -f2)
          local uuid=$(echo "$ticket_name" | cut -d'-' -f3)
          local status=$(echo "$ticket_name" | cut -d'-' -f4)
          local title=""
          
          if [ -f "$ticket_dir/index.md" ]; then
            title=$(head -n 1 "$ticket_dir/index.md" | sed 's/^# //')
          else
            title="[No title found]"
          fi
          
          echo -e "${GREEN}[$priority] ${uuid}${NC} - ${status}: $title"
        fi
      done | sort -nr
    fi
  done
}

# Function to change ticket status
change_ticket_status() {
  local uuid="$1"
  local new_status="$2"
  
  if [ -z "$uuid" ] || [ -z "$new_status" ]; then
    echo -e "${RED}Error: You must specify a ticket UUID and a new status.${NC}"
    echo -e "${YELLOW}Example: ./coc-vue-cli.sh ticket:status a88cf6d1 in-progress${NC}"
    return 1
  fi
  
  # Find the ticket
  local found=false
  local ticket_path=""
  local category=""
  
  for cat in "${VALID_CATEGORIES[@]}"; do
    for ticket_dir in "$TICKET_DIR/$cat"/issue-*-"$uuid"-*; do
      if [ -d "$ticket_dir" ]; then
        found=true
        ticket_path="$ticket_dir"
        category="$cat"
        break 2
      fi
    done
  done
  
  if [ "$found" = false ]; then
    echo -e "${RED}Error: Ticket with UUID $uuid not found.${NC}"
    return 1
  fi
  
  # Extract ticket components
  local ticket_name=$(basename "$ticket_path")
  local priority=$(echo "$ticket_name" | cut -d'-' -f2)
  local old_status=$(echo "$ticket_name" | cut -d'-' -f4)
  
  # Create new ticket path
  local new_ticket_name="issue-${priority}-${uuid}-${new_status}"
  local new_ticket_path="$TICKET_DIR/$category/$new_ticket_name"
  
  # Rename the ticket directory
  mv "$ticket_path" "$new_ticket_path"
  
  # Update category roadmap
  update_category_roadmap "$category"
  
  echo -e "${GREEN}Ticket status updated:${NC}"
  echo -e "${CYAN}UUID:${NC} $uuid"
  echo -e "${CYAN}Old Status:${NC} $old_status"
  echo -e "${CYAN}New Status:${NC} $new_status"
  echo -e "${CYAN}Path:${NC} $new_ticket_path"
}

# Function to deploy a ticket to GitHub Issues
deploy_ticket_to_github() {
  local uuid="$1"
  
  if [ -z "$uuid" ]; then
    echo -e "${RED}Error: You must specify a ticket UUID to deploy.${NC}"
    echo -e "${YELLOW}Example: ./coc-vue-cli.sh ticket:deploy a88cf6d1${NC}"
    return 1
  fi
  
  # Find the ticket
  local found=false
  local ticket_path=""
  local category=""
  
  for cat in "${VALID_CATEGORIES[@]}"; do
    for ticket_dir in "$TICKET_DIR/$cat"/issue-*-"$uuid"-*; do
      if [ -d "$ticket_dir" ]; then
        found=true
        ticket_path="$ticket_dir"
        category="$cat"
        break 2
      fi
    done
  done
  
  if [ "$found" = false ]; then
    echo -e "${RED}Error: Ticket with UUID $uuid not found.${NC}"
    return 1
  fi
  
  echo -e "${YELLOW}Deploying ticket $uuid to GitHub Issues...${NC}"
  
  # Extract ticket information
  local title=$(head -n 1 "$ticket_path/index.md" | sed 's/^# //')
  local ticket_name=$(basename "$ticket_path")
  local priority=$(echo "$ticket_name" | cut -d'-' -f2)
  
  # Extract description (different for each category)
  local description=$(sed -n '/^## Detailed Description/,/^## /p' "$ticket_path/index.md" | sed '1d;$d')
  
  # Prepare issue body
  local body="## Ticket UUID: $uuid\n\n## Category: $category\n\n## Priority: $priority\n\n$description\n\n---\nGenerated from local ticket system"
  
  # Check if GitHub CLI is installed
  if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed.${NC}"
    echo -e "${YELLOW}Please install it from: https://cli.github.com/${NC}"
    return 1
  fi
  
  # Check if user is authenticated with GitHub CLI
  if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: You are not authenticated with GitHub CLI.${NC}"
    echo -e "${YELLOW}Please run 'gh auth login' to authenticate.${NC}"
    return 1
  fi
  
  # Create GitHub issue
  local issue_url=$(gh issue create --title "$title" --body "$body" --label "$category,priority:$priority" 2>/dev/null)
  
  if [ $? -eq 0 ] && [ -n "$issue_url" ]; then
    echo -e "${GREEN}Ticket successfully deployed to GitHub Issues:${NC}"
    echo -e "${CYAN}URL:${NC} $issue_url"
    
    # Save issue URL in ticket directory for reference
    echo "$issue_url" > "$ticket_path/.github_issue_url"
    
    # Update ticket status to "in-progress"
    change_ticket_status "$uuid" "in-progress"
  else
    echo -e "${RED}Failed to create GitHub issue.${NC}"
    return 1
  fi
}

# Main function to handle commands
ticket_main() {
  local command=$1
  shift
  
  case $command in
    "create")
      create_ticket "$1" "$2" "$3"
      ;;
    "list")
      list_tickets
      ;;
    "status")
      change_ticket_status "$1" "$2"
      ;;
    "deploy")
      deploy_ticket_to_github "$1"
      ;;
    *)
      echo -e "${RED}Unknown ticket command: ${command}${NC}"
      echo -e "${YELLOW}Available commands: create, list, status, deploy${NC}"
      return 1
      ;;
  esac
}

# If script is run directly, execute the main function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  ticket_main "$@"
fi
