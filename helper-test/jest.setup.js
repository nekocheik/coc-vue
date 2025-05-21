/**
 * Jest setup file for coc-vue tests
 * 
 * This file contains global setup code that runs before each test.
 */

// Set up console mocks to prevent noise in test output
// Store original console methods
const originalConsole = { ...console };

// Mock console methods
global.console = {
  ...console,
  // Comment these out during debugging if you need to see the logs
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Restore console in afterAll
afterAll(() => {
  global.console = originalConsole;
});

// Set timeout for all tests
jest.setTimeout(10000);

// Mock timers
jest.useFakeTimers();

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Reset mocked modules after each test
afterEach(() => {
  jest.resetModules();
});

// Global mock for setTimeout and setInterval
global.setTimeout = jest.fn((callback, ms) => {
  return { 
    unref: jest.fn(),
    ref: jest.fn(),
    refresh: jest.fn(),
    hasRef: jest.fn(() => true),
  };
});

global.setInterval = jest.fn((callback, ms) => {
  return { 
    unref: jest.fn(),
    ref: jest.fn(),
    refresh: jest.fn(),
    hasRef: jest.fn(() => true),
  };
});

// Add custom matchers if needed
expect.extend({
  // Example custom matcher
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
});
