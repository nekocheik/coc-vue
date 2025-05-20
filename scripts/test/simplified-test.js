/**
 * Simplified test script for Vue components
 * This script allows testing Vue components without depending on Neovim integration
 */

const fs = require('fs');
const path = require('path');
const jest = require('jest');
const { execSync } = require('child_process');

// Configuration
const TEST_LOG_FILE = '/tmp/test_results.txt';
const JEST_CONFIG = {
  rootDir: process.cwd(),
  testEnvironment: 'node',
  testMatch: ['**/test/simplified/**/*.test.js'],
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage/simplified'
};

// Clean up temporary files
const cleanup = () => {
  if (fs.existsSync(TEST_LOG_FILE)) {
    fs.unlinkSync(TEST_LOG_FILE);
  }
};

// Create log file
const createLogFile = () => fs.writeFileSync(TEST_LOG_FILE, '');

// Function to run a Jest test
const runTest = async (description, testFn) => {
  console.log(`\n\x1b[33mRunning test: ${description}\x1b[0m`);
  
  try {
    // Run test with Jest in isolation
    await testFn();
    
    // Log success
    console.log(`\x1b[32m✓ Test passed: ${description}\x1b[0m`);
    return true;
  } catch (error) {
    // Log failure
    console.log(`\x1b[31m✗ Test failed: ${description}\x1b[0m`);
    console.error(error);
    return false;
  }
};

// Function to run unit tests
const runUnitTests = async () => {
  try {
    const results = await jest.runCLI(JEST_CONFIG, [process.cwd()]);
    
    if (results.results.success) {
      console.log(`\x1b[32m✓ Unit tests passed\x1b[0m`);
      return true;
    } else {
      console.log(`\x1b[31m✗ Unit tests failed\x1b[0m`);
      return false;
    }
  } catch (error) {
    console.error('Error running unit tests:', error);
    return false;
  }
};

// Function to run component tests with mocks
const runComponentTests = async () => {
  const testFiles = fs.readdirSync(path.join(process.cwd(), 'test/simplified/components'))
    .filter(file => file.endsWith('.test.js'));
  
  let allPassed = true;
  
  for (const testFile of testFiles) {
    const testPath = path.join(process.cwd(), 'test/simplified/components', testFile);
    try {
      const results = await jest.runCLI({
        ...JEST_CONFIG,
        testMatch: [testPath]
      }, [process.cwd()]);
      
      if (!results.results.success) {
        allPassed = false;
      }
    } catch (error) {
      console.error(`Error running ${testFile}:`, error);
      allPassed = false;
    }
  }
  
  return allPassed;
};

// Main execution
const main = async () => {
  cleanup();
  createLogFile();
  
  console.log('\n\x1b[34m=== Running Simplified Tests ===\x1b[0m\n');
  
  const unitTestsPassed = await runUnitTests();
  const componentTestsPassed = await runComponentTests();
  
  console.log('\n\x1b[34m=== Test Summary ===\x1b[0m');
  console.log(unitTestsPassed ? '\x1b[32m✓ Unit tests passed\x1b[0m' : '\x1b[31m✗ Unit tests failed\x1b[0m');
  console.log(componentTestsPassed ? '\x1b[32m✓ Component tests passed\x1b[0m' : '\x1b[31m✗ Component tests failed\x1b[0m');
  
  process.exit(unitTestsPassed && componentTestsPassed ? 0 : 1);
};

main().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});
