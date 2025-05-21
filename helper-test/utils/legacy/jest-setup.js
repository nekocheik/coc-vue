/**
 * Global Jest configuration
 * This file is executed before each test
 */

// Increase default timeout for all tests
jest.setTimeout(30000);

// Suppress unnecessary Jest warnings
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const message = args.join(' ');
  if (
    message.includes('ExperimentalWarning') ||
    message.includes('jest-environment-jsdom') ||
    message.includes('Deprecation Warning')
  ) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Remove debug logs during tests unless VERBOSE_LOGS is enabled
if (!process.env.VERBOSE_LOGS || process.env.VERBOSE_LOGS !== 'true') {
  const originalConsoleLog = console.log;
  console.log = function(message) {
    // Keep only important logs
    if (typeof message === 'string' && 
        (message.includes('ERROR') || 
         message.includes('FATAL') || 
         message.includes('CRITICAL'))) {
      originalConsoleLog.apply(console, arguments);
    }
  };
}

// Add custom Jest matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Utility function to wait for a condition
global.waitForCondition = async (condition, timeout = 5000, interval = 100) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  return false;
};
