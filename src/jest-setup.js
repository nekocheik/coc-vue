// src/jest-setup.js
// Jest setup file for coc-vue tests

// Set up global test environment
global.beforeEach(() => {
  jest.clearAllMocks();
});

// Add custom matchers if needed
expect.extend({
  // Add custom matchers here
});
