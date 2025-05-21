/**
 * Setup mocks for all tests
 * 
 * This file provides a standardized way to set up mocks for tests.
 * It should be imported at the top of each test file.
 */

// Import the mock for coc.nvim
import cocMock from './mocks/coc.mock';

// Set up jest.mock calls before any imports
jest.mock('coc.nvim', () => cocMock);

// Export the mocks for use in tests
export { cocMock };
