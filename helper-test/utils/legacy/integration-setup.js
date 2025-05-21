/**
 * Specific configuration for integration tests
 * This file is executed before each integration test
 */

// Increase timeout for integration tests
jest.setTimeout(60000);

// Function to clean up environment after each test
afterEach(async () => {
  // Reset mocks
  jest.clearAllMocks();
  
  // Reset Neovim client instance
  try {
    const { NeovimClient } = require('./neovim-client');
    NeovimClient.resetInstance();
  } catch (err) {
    console.error('Error while resetting Neovim client:', err);
  }
});

// Function to clean up environment after all tests
afterAll(async () => {
  // Make sure all connections are closed
  try {
    const { NeovimClient } = require('./neovim-client');
    NeovimClient.resetInstance();
  } catch (err) {
    console.error('Error while resetting Neovim client:', err);
  }
});
