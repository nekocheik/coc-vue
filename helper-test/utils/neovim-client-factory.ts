/**
 * Neovim client factory
 * This file determines whether to use a real client or a mock based on the environment
 */

// Import both client types
import getNeovimTestClient from './neovim-test-client-mock';
import { NeovimTestClient as RealNeovimTestClient } from './neovim-test-client';

// Function to get the real client
function getRealNeovimTestClient() {
  // Create a new instance of the real client
  return new RealNeovimTestClient();
}

/**
 * Get the appropriate Neovim client based on the environment
 * If MOCK_NEOVIM=true, uses the mock, otherwise attempts a real connection
 */
export function getNeovimClient() {
  // Check if we should use the mock
  const useMock = process.env.MOCK_NEOVIM === 'true';
  
  if (useMock) {
    console.log('Using mock Neovim client');
    return getNeovimTestClient();
  } else {
    console.log('Using real Neovim client');
    try {
      return getRealNeovimTestClient();
    } catch (error) {
      console.error('Failed to create real Neovim client, falling back to mock:', error);
      return getNeovimTestClient();
    }
  }
}

export default getNeovimClient;
