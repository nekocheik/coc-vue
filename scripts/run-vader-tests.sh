#!/bin/bash
# Script to run Vader tests and generate a detailed report

# Define colors for display
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create directory for test reports if it doesn't exist
mkdir -p .ci-artifacts/vader-reports

# Function to run a Vader test and generate a report
run_vader_test() {
  local test_file="$1"
  local test_name=$(basename "$test_file" .vader)
  local output_file=".ci-artifacts/vader-reports/${test_name}_results.json"
  local log_file=".ci-artifacts/vader-reports/${test_name}_log.txt"
  
  echo -e "${YELLOW}Running Vader tests: ${test_name}${NC}"
  
  # Run Vader test and capture output
  nvim -es -u NONE -c 'filetype plugin on' -c "source test/vader.vim" -c "Vader! $test_file" > "$log_file" 2>&1
  
  # Extract success/failure information
  local total_count=$(grep -c "Starting Vader" "$log_file")
  local success_count=$(grep -c "Success/Total" "$log_file")
  local execution_time=$(grep "Success/Total" "$log_file" | tail -n1 | grep -o "[0-9.]\+s")
  
  # Create JSON report for CI integration
  cat > "$output_file" << EOF
{
  "test_name": "$test_name",
  "total": $total_count,
  "success": $success_count,
  "execution_time": "$execution_time",
  "status": $([ $success_count -eq $total_count ] && echo '"success"' || echo '"failure"')
}
EOF
  
  # Display result
  if [ $success_count -eq $total_count ]; then
    echo -e "${GREEN}✓ $test_name: $success_count/$total_count tests passed${NC}"
  else
    echo -e "${RED}✗ $test_name: $success_count/$total_count tests passed${NC}"
    # Extract errors for detailed display
    echo -e "${RED}Detected errors:${NC}"
    grep -A 2 "Expected:" "$log_file" || true
    echo -e "${YELLOW}See full report in $output_file${NC}"
  fi
  
  return $([ $success_count -eq $total_count ])
}

# Function to generate HTML report
generate_html_report() {
  local report_file=".ci-artifacts/vader-reports/vader_test_report.html"
  
  # Create HTML report with styling
  cat > "$report_file" << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>Vader Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 30px; }
    .success { color: #4CAF50; }
    .failure { color: #f44336; }
    .test-file { 
      border: 1px solid #ddd;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .error-details {
      background: #fff3f3;
      padding: 10px;
      margin: 10px 0;
      border-left: 3px solid #f44336;
    }
  </style>
</head>
<body>
  <h1>Vader Test Report</h1>
EOF
  
  echo "<h2>Summary</h2>" >> "$report_file"
  
  # Calculate totals
  local total_tests=0
  local total_success=0
  
  for result in .ci-artifacts/vader-reports/*_results.json; do
    [ -f "$result" ] || continue
    local success=$(grep -o '"success":[[:space:]]*[0-9]\+' "$result" | grep -o '[0-9]\+')
    local total=$(grep -o '"total":[[:space:]]*[0-9]\+' "$result" | grep -o '[0-9]\+')
    total_tests=$((total_tests + total))
    total_success=$((total_success + success))
  done
  
  # Add summary to report
  cat >> "$report_file" << EOF
<p>Tests passed: <strong class="success">$total_success</strong></p>
<p>Tests failed: <strong class="failure">$((total_tests - total_success))</strong></p>
<p>Success rate: <strong>$((total_success * 100 / total_tests))%</strong></p>

<h2>Details by test file</h2>
EOF
  
  # Add details for each test file
  for result in .ci-artifacts/vader-reports/*_results.json; do
    [ -f "$result" ] || continue
    
    local test_name=$(grep -o '"test_name":"[^"]\+"' "$result" | cut -d'"' -f4)
    local total_count=$(grep -o '"total":[[:space:]]*[0-9]\+' "$result" | grep -o '[0-9]\+')
    local success_count=$(grep -o '"success":[[:space:]]*[0-9]\+' "$result" | grep -o '[0-9]\+')
    local execution_time=$(grep -o '"execution_time":"[^"]\+"' "$result" | cut -d'"' -f4)
    local status=$(grep -o '"status":"[^"]\+"' "$result" | cut -d'"' -f4)
    
    cat >> "$report_file" << EOF
<div class="test-file">
<h3>$test_name</h3>
<p>Status: <strong class="$([ "$status" = "success" ] && echo "success" || echo "failure")">$([ "$status" = "success" ] && echo "Passed" || echo "Failed")</strong></p>
<p>Tests passed: <strong>$success_count/$total_count</strong></p>
<p>Execution time: <strong>$execution_time</strong></p>
EOF
    
    # Add error details if test failed
    if [ "$status" = "failure" ]; then
      local log_file=".ci-artifacts/vader-reports/${test_name}_log.txt"
      echo "<div class=\"error-details\">
<h4>Error details:</h4>
<pre>$(grep -A 2 "Expected:" "$log_file" || echo "No detailed error information available")</pre>
</div>" >> "$report_file"
    fi
    
    echo "</div>" >> "$report_file"
  done
  
  echo "</body></html>" >> "$report_file"
  
  echo -e "${BLUE}HTML report generated: $report_file${NC}"
}

# Run all Vader tests
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}   Vader Tests for coc-vue Components   ${NC}"
echo -e "${BLUE}================================${NC}"

# Find all Vader test files
test_files=$(find test -name "*.vader")

# Variables to track results
total_files=0
failed_files=0

# Run each Vader test
for test_file in $test_files; do
  total_files=$((total_files + 1))
  run_vader_test "$test_file"
  if [ $? -ne 0 ]; then
    failed_files=$((failed_files + 1))
  fi
done

# Generate HTML report
generate_html_report

# Show final summary
echo -e "\n${BLUE}=== Vader Test Summary ====${NC}"
if [ $total_files -eq 0 ]; then
  echo -e "${YELLOW}! No Vader tests were executed.${NC}"
elif [ $failed_files -eq 0 ]; then
  echo -e "${GREEN}✓ All Vader tests passed!${NC}"
else
  echo -e "${RED}✗ Some Vader tests failed.${NC}"
fi

exit $failed_files
