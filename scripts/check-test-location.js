#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Get staged files
const stagedFiles = execSync('git diff --cached --name-only')
  .toString()
  .trim()
  .split('\n')
  .filter(Boolean);

// Check for test files in invalid locations
const invalidTestLocations = stagedFiles.filter(file => {
  // Skip if not a TypeScript file
  if (!file.endsWith('.ts') && !file.endsWith('.js')) {
    return false;
  }

  // Check if it's a test file (has .test.ts or .spec.ts extension)
  const isTestFile = file.includes('.test.') || file.includes('.spec.');
  
  // Check if it's in a valid location
  const isInValidLocation = file.startsWith('__tests__/') || file.startsWith('helper-test/');
  
  // Return true if it's a test file in an invalid location
  return isTestFile && !isInValidLocation;
});

// If any invalid test locations are found, exit with error
if (invalidTestLocations.length > 0) {
  console.error('\x1b[31m❌ Invalid test location(s) detected:\x1b[0m');
  invalidTestLocations.forEach(file => {
    console.error(`  - ${file}`);
  });
  console.error('\x1b[31mAll tests must be in __tests__/ or helper-test/. Commit refused.\x1b[0m');
  process.exit(1);
}

// Exit successfully if no issues found
console.log('\x1b[32m✓ Test location check passed\x1b[0m');
process.exit(0);
