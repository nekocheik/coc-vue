#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get commit hash from argument or use 'staged' for uncommitted changes
const hash = process.argv[2] || 'staged';
const time = new Date().toISOString();

// Path to the history log file
const logDir = path.join(process.cwd(), '.test-logs');
const logPath = path.join(logDir, 'history.json');

try {
  // Read coverage summary
  const coverageSummaryPath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
  const coverageSummary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
  const coverage = coverageSummary.total;
  
  // Get failing tests if any (from test results)
  let failingTests = [];
  try {
    const testResultsPath = path.join(process.cwd(), 'coverage', 'test-results.json');
    if (fs.existsSync(testResultsPath)) {
      const testResults = JSON.parse(fs.readFileSync(testResultsPath, 'utf8'));
      failingTests = testResults.testResults
        .filter(result => result.status === 'failed')
        .map(result => result.name);
    }
  } catch (error) {
    console.warn('Warning: Could not read test results file');
  }
  
  // Create entry for history
  const entry = {
    hash,
    time,
    coverage: {
      statements: coverage.statements.pct,
      branches: coverage.branches.pct,
      functions: coverage.functions.pct,
      lines: coverage.lines.pct
    },
    failingTests: failingTests.length > 0 ? failingTests : null
  };
  
  // Read existing history or create new array
  let history = [];
  if (fs.existsSync(logPath)) {
    try {
      history = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    } catch (error) {
      console.warn('Warning: Could not parse existing history file, creating new one');
    }
  }
  
  // Add new entry
  history.push(entry);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // Write updated history
  fs.writeFileSync(logPath, JSON.stringify(history, null, 2));
  
  // Compare with previous commit if available
  if (history.length > 1) {
    const previousEntry = history[history.length - 2];
    const currentEntry = entry;
    
    // Check for coverage drop
    const hasCoverageDrop = 
      currentEntry.coverage.statements < previousEntry.coverage.statements ||
      currentEntry.coverage.branches < previousEntry.coverage.branches ||
      currentEntry.coverage.functions < previousEntry.coverage.functions ||
      currentEntry.coverage.lines < previousEntry.coverage.lines;
    
    // Check for new failing tests
    const hasNewFailingTests = 
      (!previousEntry.failingTests && currentEntry.failingTests) ||
      (previousEntry.failingTests && currentEntry.failingTests && 
       currentEntry.failingTests.length > previousEntry.failingTests.length);
    
    if (hasCoverageDrop) {
      console.warn('\n\x1b[33m⚠️ Warning: Coverage has dropped since the previous commit\x1b[0m');
      console.log('Previous coverage:');
      console.log(`  Statements: ${previousEntry.coverage.statements.toFixed(2)}%`);
      console.log(`  Branches:   ${previousEntry.coverage.branches.toFixed(2)}%`);
      console.log(`  Functions:  ${previousEntry.coverage.functions.toFixed(2)}%`);
      console.log(`  Lines:      ${previousEntry.coverage.lines.toFixed(2)}%`);
      
      console.log('Current coverage:');
      console.log(`  Statements: ${currentEntry.coverage.statements.toFixed(2)}%`);
      console.log(`  Branches:   ${currentEntry.coverage.branches.toFixed(2)}%`);
      console.log(`  Functions:  ${currentEntry.coverage.functions.toFixed(2)}%`);
      console.log(`  Lines:      ${currentEntry.coverage.lines.toFixed(2)}%`);
    }
    
    if (hasNewFailingTests) {
      console.warn('\n\x1b[33m⚠️ Warning: New failing tests detected\x1b[0m');
    }
  }
  
  console.log(`\n\x1b[32m✓ Test results logged to ${logPath}\x1b[0m`);
} catch (error) {
  console.error(`\x1b[31m❌ Error logging test results: ${error.message}\x1b[0m`);
  process.exit(1);
}
