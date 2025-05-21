#!/bin/bash
# Refactored script to run Vader tests and generate a detailed report
# This script follows a component-by-component approach, ensuring each test passes
# before moving on to the next one, and tracking coverage for each component.

# Define colors for display
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create directories for test reports
mkdir -p test/coverage/reports
mkdir -p test/coverage/json

# Function to run a Vader test and generate a report
run_vader_test() {
  local test_file="$1"
  local component_name=$(basename "$test_file" .vader)
  local component_type=$(dirname "$test_file" | xargs basename)
  local output_dir="test/coverage/reports"
  local json_dir="test/coverage/json"
  local output_file="${json_dir}/${component_type}_${component_name}_results.json"
  local log_file="${output_dir}/${component_type}_${component_name}_log.txt"
  
  echo -e "${BLUE}======================================${NC}"
  echo -e "${YELLOW}Testing: ${component_type}/${component_name}${NC}"
  echo -e "${BLUE}======================================${NC}"
  
  # Create Vim setup file
  cat > "test/vader/setup.vim" << EOF
set runtimepath+=.
let &runtimepath.=','.expand('<sfile>:p:h:h')
filetype plugin on
EOF
  
  # Run Vader test
  echo -e "${BLUE}Running test...${NC}"
  
  nvim -es -u test/vader/setup.vim \
       -c "source test/vader.vim" \
       -c "Vader! ${test_file}" > "${log_file}" 2>&1
  
  local exit_code=$?
  
  # Extract success/failure information
  local total_tests=$(grep -c "Starting Vader" "${log_file}" || echo 0)
  local success_tests=$(grep -c "Success/Total" "${log_file}" || echo 0)
  local assertions_line=$(grep "assertions:" "${log_file}" | tail -n1 || echo "assertions: 0/0")
  local assertions_total=$(echo "$assertions_line" | sed -E 's/.*assertions: ([0-9]+)\/([0-9]+).*/\2/' || echo 0)
  local assertions_passed=$(echo "$assertions_line" | sed -E 's/.*assertions: ([0-9]+)\/([0-9]+).*/\1/' || echo 0)
  local execution_time=$(grep "Elapsed time:" "${log_file}" | sed -E 's/.*Elapsed time: ([0-9.]+) sec\..*/\1/' || echo 0)
  
  # Create JSON report
  cat > "${output_file}" << EOF
{
  "component": "${component_name}",
  "type": "${component_type}",
  "total_tests": ${total_tests},
  "success_tests": ${success_tests},
  "assertions_total": ${assertions_total:-0},
  "assertions_passed": ${assertions_passed:-0},
  "execution_time": ${execution_time:-0},
  "status": $([ "${assertions_passed:-0}" -eq "${assertions_total:-0}" ] && [ "${assertions_total:-0}" -gt 0 ] && echo '"success"' || echo '"failure"')
}
EOF
  
  # Display result
  if [ "${assertions_passed}" = "${assertions_total}" ] && [ "${assertions_total}" != "0" ]; then
    echo -e "${GREEN}✓ ${component_type}/${component_name}: ${assertions_passed}/${assertions_total} assertions passed${NC}"
    echo -e "${BLUE}Execution time: ${execution_time}s${NC}"
    return 0
  else
    echo -e "${RED}✗ ${component_type}/${component_name}: ${assertions_passed}/${assertions_total} assertions passed${NC}"
    # Extract errors for detailed display
    echo -e "${RED}Detected errors:${NC}"
    grep -A 2 "Expected:" "${log_file}" || true
    grep -A 5 "Error:" "${log_file}" || true
    echo -e "${YELLOW}See full log in ${log_file}${NC}"
    return 1
  fi
}

# Function to generate comprehensive HTML report
generate_html_report() {
  local report_file="test/coverage/reports/vader_test_report.html"
  
  # Create HTML report with styling
  cat > "$report_file" << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>VADER Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background-color: #f8f9fa; }
    h1 { color: #333; margin-bottom: 30px; }
    h2 { color: #444; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
    h3 { color: #555; }
    .success { color: #28a745; }
    .warning { color: #ffc107; }
    .failure { color: #dc3545; }
    .test-component { 
      border: 1px solid #ddd;
      padding: 20px;
      margin: 15px 0;
      border-radius: 8px;
      background-color: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .error-details {
      background: #fff3f3;
      padding: 15px;
      margin: 10px 0;
      border-left: 4px solid #dc3545;
      border-radius: 4px;
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .timestamp {
      color: #6c757d;
      font-size: 0.9em;
      margin-top: 10px;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      color: white;
      font-size: 0.8em;
      font-weight: bold;
    }
    .badge-success { background-color: #28a745; }
    .badge-warning { background-color: #ffc107; color: #212529; }
    .badge-danger { background-color: #dc3545; }
  </style>
</head>
<body>
  <h1>VADER Test Report</h1>
  <div class="timestamp">Generated on $(date)</div>
EOF
  
  echo "<h2>Summary</h2>" >> "$report_file"
  
  # Calculate totals
  local total_tests=0
  local success_tests=0
  local total_components=0
  local passed_components=0
  local total_assertions=0
  local passed_assertions=0
  
  for result in test/coverage/json/*_results.json; do
    [ -f "$result" ] || continue
    total_components=$((total_components + 1))
    
    local success=$(jq -r '.status // "failure"' "$result" 2>/dev/null || echo "failure")
    local assertions_total=$(jq '.assertions_total // 0' "$result" 2>/dev/null || echo 0)
    local assertions_passed=$(jq '.assertions_passed // 0' "$result" 2>/dev/null || echo 0)
    local component_tests=$(jq '.total_tests // 0' "$result" 2>/dev/null || echo 0)
    local component_success=$(jq '.success_tests // 0' "$result" 2>/dev/null || echo 0)
    
    total_tests=$((total_tests + component_tests))
    success_tests=$((success_tests + component_success))
    total_assertions=$((total_assertions + assertions_total))
    passed_assertions=$((passed_assertions + assertions_passed))
    
    if [ "$success" = "success" ]; then
      passed_components=$((passed_components + 1))
    fi
  done
  
  # Calculate percentages
  local success_rate=0
  if [ $total_assertions -gt 0 ]; then
    success_rate=$((passed_assertions * 100 / total_assertions))
  fi
  
  # Add summary to report
  cat >> "$report_file" << EOF
<div class="test-component">
  <p>Components: <strong>${passed_components}/${total_components}</strong> passing</p>
  <p>Test Suites: <strong>${success_tests}/${total_tests}</strong></p>
  <p>Assertions: <strong class="success">${passed_assertions}</strong> / <strong>${total_assertions}</strong> (${success_rate}%)</p>
</div>

<h2>Component Details</h2>
<table>
  <tr>
    <th>Component</th>
    <th>Type</th>
    <th>Tests</th>
    <th>Assertions</th>
    <th>Execution Time</th>
    <th>Status</th>
  </tr>
EOF
  
  # Add details for each component
  for result in test/coverage/json/*_results.json; do
    [ -f "$result" ] || continue
    
    local component=$(jq -r '.component // "unknown"' "$result" 2>/dev/null || echo "unknown")
    local type=$(jq -r '.type // "unknown"' "$result" 2>/dev/null || echo "unknown")
    local total_tests=$(jq '.total_tests // 0' "$result" 2>/dev/null || echo 0)
    local success_tests=$(jq '.success_tests // 0' "$result" 2>/dev/null || echo 0)
    local assertions_total=$(jq '.assertions_total // 0' "$result" 2>/dev/null || echo 0)
    local assertions_passed=$(jq '.assertions_passed // 0' "$result" 2>/dev/null || echo 0)
    local execution_time=$(jq '.execution_time // 0' "$result" 2>/dev/null || echo 0)
    local status=$(jq -r '.status // "failure"' "$result" 2>/dev/null || echo "failure")
    
    local status_class="danger"
    local status_text="Failed"
    
    if [ "$status" = "success" ]; then
      status_class="success"
      status_text="Passed"
    fi
    
    cat >> "$report_file" << EOF
  <tr>
    <td>${component}</td>
    <td>${type}</td>
    <td>${success_tests}/${total_tests}</td>
    <td>${assertions_passed}/${assertions_total}</td>
    <td>${execution_time}s</td>
    <td><span class="badge badge-${status_class}">${status_text}</span></td>
  </tr>
EOF
  done
  
  echo "</table>" >> "$report_file"
  
  # Add detailed component reports
  echo "<h2>Detailed Component Reports</h2>" >> "$report_file"
  
  for result in test/coverage/json/*_results.json; do
    [ -f "$result" ] || continue
    
    local component=$(jq -r '.component // "unknown"' "$result" 2>/dev/null || echo "unknown")
    local type=$(jq -r '.type // "unknown"' "$result" 2>/dev/null || echo "unknown")
    local total_tests=$(jq '.total_tests // 0' "$result" 2>/dev/null || echo 0)
    local success_tests=$(jq '.success_tests // 0' "$result" 2>/dev/null || echo 0)
    local assertions_total=$(jq '.assertions_total // 0' "$result" 2>/dev/null || echo 0)
    local assertions_passed=$(jq '.assertions_passed // 0' "$result" 2>/dev/null || echo 0)
    local execution_time=$(jq '.execution_time // 0' "$result" 2>/dev/null || echo 0)
    local status=$(jq -r '.status // "failure"' "$result" 2>/dev/null || echo "failure")
    
    cat >> "$report_file" << EOF
<div class="test-component">
  <h3>${type}/${component}</h3>
  <p>Status: <strong class="$([ "$status" = "success" ] && echo "success" || echo "failure")">$([ "$status" = "success" ] && echo "Passed" || echo "Failed")</strong></p>
  <p>Tests: <strong>${success_tests}/${total_tests}</strong></p>
  <p>Assertions: <strong>${assertions_passed}/${assertions_total}</strong></p>
  <p>Execution time: <strong>${execution_time}s</strong></p>
EOF
    
    # Add error details if test failed
    if [ "$status" = "failure" ]; then
      local log_file="test/coverage/reports/${type}_${component}_log.txt"
      if [ -f "$log_file" ]; then
        echo "<div class=\"error-details\">
<h4>Error details:</h4>
<pre>$(grep -A 3 "Expected:" "$log_file" || grep -A 5 "Error:" "$log_file" || echo "No detailed error information available")</pre>
</div>" >> "$report_file"
      fi
    fi
    
    echo "</div>" >> "$report_file"
  done
  
  # Add next steps section
  echo "<h2>Next Steps</h2>" >> "$report_file"
  
  if [ $passed_components -lt $total_components ]; then
    echo "<div class=\"test-component\">
<h3>Components Needing Attention</h3>
<p>The following components need to be fixed or improved:</p>
<ul>" >> "$report_file"
    
    for result in test/coverage/json/*_results.json; do
      [ -f "$result" ] || continue
      
      local component=$(jq -r '.component // "unknown"' "$result" 2>/dev/null || echo "unknown")
      local type=$(jq -r '.type // "unknown"' "$result" 2>/dev/null || echo "unknown")
      local status=$(jq -r '.status // "failure"' "$result" 2>/dev/null || echo "failure")
      
      if [ "$status" = "failure" ]; then
        echo "<li><strong>${type}/${component}</strong>: Fix failing tests.</li>" >> "$report_file"
      fi
    done
    
    echo "</ul>
</div>" >> "$report_file"
  else
    echo "<div class=\"test-component\">
<h3>All Components Passing</h3>
<p>Congratulations! All components are passing their tests.</p>
<p>Continue to maintain tests as the codebase evolves.</p>
</div>" >> "$report_file"
  fi
  
  echo "</body></html>" >> "$report_file"
  
  echo -e "${BLUE}HTML report generated: $report_file${NC}"
}

# Function to check if a component has been tested and passed
component_passed() {
  local component_type="$1"
  local component_name="$2"
  local result_file="test/coverage/json/${component_type}_${component_name}_results.json"
  
  if [ -f "$result_file" ]; then
    local status=$(jq -r '.status // "failure"' "$result_file" 2>/dev/null || echo "failure")
    
    if [ "$status" = "success" ]; then
      return 0  # Passed
    fi
  fi
  
  return 1  # Failed or not tested
}

# Run Vader tests component by component
echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}   VADER Tests for coc-vue Components   ${NC}"
echo -e "${BLUE}=================================${NC}"

# Find all Vader test files
component_types=("components" "core" "utils" "events")

# Variables to track results
total_components=0
passed_components=0
failed_components=0

# Process each component type
for component_type in "${component_types[@]}"; do
  echo -e "\n${BLUE}Processing ${component_type}...${NC}"
  
  # Find all test files for this component type
  test_files=$(find "test/vader/${component_type}" -name "*.vader" 2>/dev/null)
  
  if [ -z "$test_files" ]; then
    echo -e "${YELLOW}No test files found for ${component_type}.${NC}"
    continue
  fi
  
  # Run each test file
  for test_file in $test_files; do
    component_name=$(basename "$test_file" .vader)
    total_components=$((total_components + 1))
    
    # Check if component has already been tested and passed
    if component_passed "$component_type" "$component_name"; then
      echo -e "${GREEN}✓ ${component_type}/${component_name} already tested and passed.${NC}"
      passed_components=$((passed_components + 1))
      continue
    fi
    
    # Run the test
    run_vader_test "$test_file"
    
    if [ $? -eq 0 ]; then
      passed_components=$((passed_components + 1))
    else
      failed_components=$((failed_components + 1))
      echo -e "${RED}✗ ${component_type}/${component_name} failed. Fix this component before proceeding to the next one.${NC}"
      echo -e "${YELLOW}Stopping test execution. Fix the failing component and run again.${NC}"
      
      # Generate HTML report with current progress
      generate_html_report
      
      exit 1
    fi
  done
done

# Generate HTML report
generate_html_report

# Show final summary
echo -e "\n${BLUE}=== VADER Test Summary ====${NC}"
if [ $total_components -eq 0 ]; then
  echo -e "${YELLOW}! No VADER tests were found.${NC}"
  echo -e "${YELLOW}Create test files in test/vader/{components,core,utils,events}/ directories.${NC}"
elif [ $failed_components -eq 0 ]; then
  echo -e "${GREEN}✓ All ${passed_components}/${total_components} components passed!${NC}"
  echo -e "${BLUE}See the detailed report at: test/coverage/reports/vader_test_report.html${NC}"
else
  echo -e "${RED}✗ ${failed_components}/${total_components} components failed.${NC}"
  echo -e "${YELLOW}Fix the failing components and run again.${NC}"
  echo -e "${BLUE}See the detailed report at: test/coverage/reports/vader_test_report.html${NC}"
fi

exit $failed_components
