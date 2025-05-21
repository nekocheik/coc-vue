#!/usr/bin/env node
/**
 * Script to generate a comprehensive final report for VADER test refactoring
 * 
 * This script:
 * 1. Collects test results
 * 2. Collects coverage data
 * 3. Generates a comprehensive markdown report
 */

const fs = require('fs');
const path = require('path');

// Paths
const TEST_REPORT_PATH = path.resolve(__dirname, '../.ci-artifacts/vader-reports/summary.md');
const COVERAGE_REPORT_PATH = path.resolve(__dirname, '../.ci-artifacts/coverage-reports/coverage_report.md');
const FINAL_REPORT_PATH = path.resolve(__dirname, '../VADER_TEST_FINAL_REPORT.md');

// Function to read a file if it exists
function readFileIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch (error) {
    console.error(`Error reading ${filePath}: ${error.message}`);
  }
  return null;
}

// Function to extract test results from summary
function extractTestResults(summaryContent) {
  if (!summaryContent) return { testFiles: [], totalTests: 0, passedTests: 0, successRate: 0 };
  
  const testFiles = [];
  let totalTests = 0;
  let passedTests = 0;
  
  // Extract test file table
  const tableRegex = /\| Test File \| Status \| Tests \| Passed \| Time \|\n\|[-\s|]+\|\n([\s\S]*?)(?:\n\n|$)/;
  const tableMatch = summaryContent.match(tableRegex);
  
  if (tableMatch && tableMatch[1]) {
    const rows = tableMatch[1].trim().split('\n');
    
    for (const row of rows) {
      const cells = row.split('|').map(cell => cell.trim());
      if (cells.length >= 6) {
        testFiles.push({
          file: cells[1],
          status: cells[2],
          tests: parseInt(cells[3], 10) || 0,
          passed: parseInt(cells[4], 10) || 0,
          time: cells[5]
        });
      }
    }
  }
  
  // Extract overall summary
  const totalTestsMatch = summaryContent.match(/- Total tests: (\d+)/);
  const passedTestsMatch = summaryContent.match(/- Passed tests: (\d+)/);
  const successRateMatch = summaryContent.match(/- Success rate: (\d+)%/);
  
  if (totalTestsMatch) totalTests = parseInt(totalTestsMatch[1], 10);
  if (passedTestsMatch) passedTests = parseInt(passedTestsMatch[1], 10);
  
  const successRate = successRateMatch ? parseInt(successRateMatch[1], 10) : 
    (totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0);
  
  return { testFiles, totalTests, passedTests, successRate };
}

// Function to extract coverage data from report
function extractCoverageData(coverageContent) {
  if (!coverageContent) return { overallCoverage: 0, coveredLines: 0, totalLines: 0, lowCoverageFiles: [] };
  
  let overallCoverage = 0;
  let coveredLines = 0;
  let totalLines = 0;
  const lowCoverageFiles = [];
  
  // Extract coverage summary
  const coverageMatch = coverageContent.match(/- Overall coverage: (\d+)%/);
  const linesMatch = coverageContent.match(/- Covered lines: (\d+)\/(\d+)/);
  
  if (coverageMatch) overallCoverage = parseInt(coverageMatch[1], 10);
  if (linesMatch) {
    coveredLines = parseInt(linesMatch[1], 10);
    totalLines = parseInt(linesMatch[2], 10);
  }
  
  // Extract low coverage files
  const tableRegex = /\| File \| Coverage \| Lines \|\n\|[-\s|]+\|\n([\s\S]*?)(?:\n\n|$)/;
  const tableMatch = coverageContent.match(tableRegex);
  
  if (tableMatch && tableMatch[1]) {
    const rows = tableMatch[1].trim().split('\n');
    
    for (const row of rows) {
      const cells = row.split('|').map(cell => cell.trim());
      if (cells.length >= 4) {
        lowCoverageFiles.push({
          file: cells[1],
          coverage: cells[2],
          lines: cells[3]
        });
      }
    }
  }
  
  return { overallCoverage, coveredLines, totalLines, lowCoverageFiles };
}

// Function to generate the final report
function generateFinalReport(testResults, coverageData) {
  const timestamp = new Date().toLocaleString();
  
  let report = `# VADER Test Refactoring Final Report

## Overview

This report summarizes the results of refactoring VADER tests to align with TypeScript test structure in the coc-vue project. The goal was to standardize test patterns across the codebase and achieve 100% code coverage for all VADER tests.

**Generated:** ${timestamp}

## Test Results Summary

- **Total Test Files:** ${testResults.testFiles.length}
- **Total Tests:** ${testResults.totalTests}
- **Passed Tests:** ${testResults.passedTests}
- **Success Rate:** ${testResults.successRate}%

### Test Files Status

| Test File | Status | Tests | Passed | Time |
|-----------|--------|-------|--------|------|
`;

  // Add test files
  for (const file of testResults.testFiles) {
    report += `| ${file.file} | ${file.status} | ${file.tests} | ${file.passed} | ${file.time} |\n`;
  }

  report += `
## Coverage Summary

- **Overall Coverage:** ${coverageData.overallCoverage}%
- **Covered Lines:** ${coverageData.coveredLines}/${coverageData.totalLines}

### Files with Low Coverage

`;

  if (coverageData.lowCoverageFiles.length > 0) {
    report += `| File | Coverage | Lines |\n|------|----------|-------|\n`;
    
    for (const file of coverageData.lowCoverageFiles) {
      report += `| ${file.file} | ${file.coverage} | ${file.lines} |\n`;
    }
  } else {
    report += `No files with low coverage were found.`;
  }

  report += `
## TypeScript to VADER Structure Mapping

| TypeScript Structure | VADER Equivalent |
|----------------------|-----------------|
| \`describe('Suite', () => {})\` | \`Execute (Test Suite: Suite):\` |
| \`it('should do something', () => {})\` | \`Execute (Test Case: Should do something):\` |
| \`beforeEach(() => {})\` | \`Execute (Global Setup):\` |
| \`afterEach(() => {})\` | Cleanup code at end of test case |
| \`beforeAll(() => {})\` | \`Execute (Global Setup):\` |
| \`afterAll(() => {})\` | \`Execute (Global Teardown):\` |
| \`expect(x).toBe(y)\` | \`lua assert(x == y, "message")\` |

## Next Steps to Achieve 100% Coverage

`;

  if (coverageData.overallCoverage < 100) {
    report += `1. **Focus on Low Coverage Files First**
   - Prioritize files with coverage below 50%
   - Add tests for uncovered functions and branches

2. **Improve Existing Tests**
   - Add edge case tests
   - Ensure all code paths are tested

3. **Add Missing Tests**
   - Identify components without tests
   - Create comprehensive test suites for them

4. **Refactor Complex Tests**
   - Break down complex tests into smaller, focused tests
   - Improve test readability and maintainability

5. **Run Tests Regularly**
   - Integrate tests into CI/CD pipeline
   - Monitor coverage trends over time`;
  } else {
    report += `Congratulations! 100% coverage has been achieved. To maintain this:

1. **Add Tests for New Code**
   - Ensure all new code is covered by tests
   - Follow the established test patterns

2. **Maintain Test Quality**
   - Regularly review and refactor tests
   - Keep tests up to date with code changes

3. **Monitor Coverage**
   - Continue to track coverage in CI/CD pipeline
   - Address any coverage drops immediately`;
  }

  report += `

## Conclusion

The VADER test refactoring has successfully aligned the test structure with TypeScript tests, making the codebase more consistent and maintainable. ${
    coverageData.overallCoverage < 100 
      ? `There is still work to be done to achieve 100% code coverage, but the foundation has been laid for comprehensive testing.`
      : `The goal of 100% code coverage has been achieved, ensuring all components are thoroughly tested.`
  }

By following the steps outlined in this document, the team can ${
    coverageData.overallCoverage < 100 
      ? `systematically improve test coverage and ensure all components are thoroughly tested.`
      : `maintain the high quality of tests and ensure new code is properly tested.`
  }
`;

  return report;
}

// Main function
function generateReport() {
  try {
    console.log('Generating final report...');
    
    // Read test summary
    const testSummary = readFileIfExists(TEST_REPORT_PATH);
    const testResults = extractTestResults(testSummary);
    
    // Read coverage report
    const coverageReport = readFileIfExists(COVERAGE_REPORT_PATH);
    const coverageData = extractCoverageData(coverageReport);
    
    // Generate final report
    const finalReport = generateFinalReport(testResults, coverageData);
    
    // Write final report
    fs.writeFileSync(FINAL_REPORT_PATH, finalReport);
    
    console.log(`Final report generated: ${FINAL_REPORT_PATH}`);
  } catch (error) {
    console.error('Error generating final report:', error);
    process.exit(1);
  }
}

// Run the report generation
generateReport();
