/**
 * Global Jest configuration
 * This file is executed before each test
 */

// Increase default timeout for all tests
jest.setTimeout(30000);

// Remove unnecessary Jest warnings
const originalConsoleWarn = console.warn;
console.warn = function(...args) {
  // Filter known warnings
  const message = args[0]?.toString() || '';
  if (
    message.includes('jest-environment-jsdom') ||
    message.includes('ExperimentalWarning') ||
    message.includes('deprecated')
  ) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Add custom Jest matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toHaveBeenCalledWithMatch(received, ...expected) {
    const pass = received.mock.calls.some(call => {
      return expected.every((arg, i) => {
        if (typeof arg === 'object' && arg !== null) {
          return expect.objectContaining(arg).asymmetricMatch(call[i]);
        }
        return arg === call[i];
      });
    });
    
    if (pass) {
      return {
        message: () => `expected ${received.getMockName()} not to have been called with arguments matching ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received.getMockName()} to have been called with arguments matching ${expected}`,
        pass: false,
      };
    }
  }
});

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
