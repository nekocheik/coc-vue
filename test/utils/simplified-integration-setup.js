/**
 * Specific configuration for simplified integration tests
 * This file is executed before each integration test
 */

// Increase timeout for integration tests
jest.setTimeout(30000);

// Set environment variable to use mocks
process.env.MOCK_NEOVIM = 'true';

// Mock for Neovim client
jest.mock('coc.nvim', () => require('../mocks/coc'));
jest.mock('../../src/bridge/core', () => require('../mocks/bridge-core'));
jest.mock('../../src/components/vim-component', () => require('../mocks/vim-component'));

// Function to clean up environment after each test
afterEach(async () => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Reset bridge core singleton
  const BridgeCore = require('../mocks/bridge-core').default;
  BridgeCore.resetInstance();
  
  // Reset component registry
  const ComponentRegistry = require('../../src/components/registry').default;
  ComponentRegistry.resetInstance();
});

// Function to clean up environment after all tests
afterAll(async () => {
  // Clean up any remaining resources
  jest.resetModules();
  
  // Reset environment variables
  delete process.env.MOCK_NEOVIM;
});
