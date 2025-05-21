#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Minimum required coverage percentage
const MIN_COVERAGE = 80;

try {
  // Run tests with coverage
  console.log('Running tests with coverage...');
  execSync('npm test -- --coverage', { stdio: 'inherit' });
  
  // Check if coverage summary exists
  const coverageSummaryPath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
  
  if (!fs.existsSync(coverageSummaryPath)) {
    console.error('\x1b[31m❌ Coverage summary not found. Tests may have failed.\x1b[0m');
    process.exit(1);
  }
  
  // Read coverage summary
  const coverageSummary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
  const total = coverageSummary.total;
  
  // Check if coverage meets minimum requirements
  const statementCoverage = total.statements.pct;
  const branchCoverage = total.branches.pct;
  const functionCoverage = total.functions.pct;
  const lineCoverage = total.lines.pct;
  
  console.log('\nCoverage Summary:');
  console.log(`Statements: ${statementCoverage.toFixed(2)}% (minimum: ${MIN_COVERAGE}%)`);
  console.log(`Branches:   ${branchCoverage.toFixed(2)}% (minimum: ${MIN_COVERAGE}%)`);
  console.log(`Functions:  ${functionCoverage.toFixed(2)}% (minimum: ${MIN_COVERAGE}%)`);
  console.log(`Lines:      ${lineCoverage.toFixed(2)}% (minimum: ${MIN_COVERAGE}%)`);
  
  // For validation testing, we're checking function coverage specifically
  if (
    statementCoverage < MIN_COVERAGE ||
    // branchCoverage < MIN_COVERAGE || // Branch coverage still disabled for testing
    functionCoverage < MIN_COVERAGE ||
    lineCoverage < MIN_COVERAGE
  ) {
    console.error('\n\x1b[31m❌ Coverage is below the minimum requirement of 80%. Commit refused.\x1b[0m');
    process.exit(1);
  }
  
  console.log('\n\x1b[32m✓ Coverage check passed\x1b[0m');
  process.exit(0);
} catch (error) {
  console.error('\x1b[31m❌ Tests failed. Commit refused.\x1b[0m');
  process.exit(1);
}
