/**
 * Configuration for integration tests
 * This file contains setup specific to integration tests
 */

// Disable default console logs except for critical errors
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Variable to control verbosity level
global.VERBOSE_LOGS = process.env.VERBOSE_LOGS === 'true';

// Replace console functions to reduce noise
console.log = function(...args) {
  if (global.VERBOSE_LOGS) {
    originalConsoleLog(...args);
  }
};

console.info = function(...args) {
  if (global.VERBOSE_LOGS) {
    originalConsoleInfo(...args);
  }
};

console.warn = function(...args) {
  if (global.VERBOSE_LOGS) {
    originalConsoleWarn(...args);
  }
};

// Keep errors visible
console.error = function(...args) {
  // Filter out certain known messages that are not critical
  const message = args[0]?.toString() || '';
  if (message.includes('Connection attempt failed, retrying')) {
    if (global.VERBOSE_LOGS) {
      originalConsoleError(...args);
    }
  } else {
    originalConsoleError(...args);
  }
};

// Increase timeouts for integration tests
jest.setTimeout(30000);

// Utility function to wait for a condition to be met
global.waitForCondition = async function(condition, timeout = 5000, interval = 100) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`Condition not met after ${timeout}ms`);
};

// Restore original console functions after all tests
afterAll(() => {
  console.log = originalConsoleLog;
  console.info = originalConsoleInfo;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});
