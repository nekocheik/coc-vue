/**
 * Tests for bridge commands in the extension
 * 
 * This file contains tests specifically for the bridge-related commands and communication.
 */

// Mock dependencies - must be before any imports that use them
jest.mock('coc.nvim', () => ({
  workspace: {
    nvim: {
      call: jest.fn(),
      command: jest.fn(),
      eval: jest.fn(),
    },
    getConfiguration: jest.fn(() => ({
      get: jest.fn(() => false)
    })),
  },
  window: {
    showInformationMessage: jest.fn().mockResolvedValue(undefined),
    showErrorMessage: jest.fn().mockResolvedValue(undefined),
  },
  commands: {
    registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    executeCommand: jest.fn(),
  },
  ExtensionContext: jest.fn(() => ({
    subscriptions: [],
  })),
}));

// Mock bridge core
jest.mock('../../src/bridge/core', () => ({
  bridgeCore: {
    receiveMessage: jest.fn(),
    registerHandler: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    unregisterHandler: jest.fn(),
    sendMessage: jest.fn().mockResolvedValue({}),
  },
  MessageType: {
    REQUEST: 'request',
    RESPONSE: 'response',
    NOTIFICATION: 'notification',
  }
}));

// Import test utilities
import { resetAllMocks } from '../../helper-test/utils/test-utils';

// SOURCE CODE FIX REQUIRED IN: src/index.ts
// The issue is in how bufferRouter is destructured from registerBufferCommands
// This is a critical fix - ensure the mock returns the exact structure expected by destructuring
const mockBufferRouter = {
  createBuffer: jest.fn(),
  deleteBuffer: jest.fn(),
  switchBuffer: jest.fn(),
  getCurrentBuffer: jest.fn(),
  cleanLayout: jest.fn()
};

const mockRegisterBufferCommands = jest.fn().mockImplementation(() => {
  // Return the exact structure expected by the destructuring in index.ts
  return { bufferRouter: mockBufferRouter };
});

const mockWindowManager = {
  cleanLayout: jest.fn().mockResolvedValue(true)
};

const mockRegisterWindowManagerCommands = jest.fn().mockImplementation(() => {
  // Return the exact structure expected by the destructuring in index.ts
  return { windowManager: mockWindowManager };
});

jest.mock('../../src/commands/bufferCommands', () => ({
  registerBufferCommands: mockRegisterBufferCommands
}));

jest.mock('../../src/commands/windowManagerCommands', () => ({
  registerWindowManagerCommands: mockRegisterWindowManagerCommands
}));

// Import the module to test
import * as extension from '../../src/index';

// Get the mocked modules
const coc = jest.requireMock('coc.nvim');
const bridgeCore = jest.requireMock('../../src/bridge/core').bridgeCore;
const MessageType = jest.requireMock('../../src/bridge/core').MessageType;

describe('Bridge Commands', () => {
  let context: any;
  
  beforeEach(() => {
    // Reset all mocks
    resetAllMocks();
    
    // Clear all mock calls
    jest.clearAllMocks();
    
    // Setup module exports for testing - mock what activate would create
    (extension as any).bufferRouter = mockBufferRouter;
    (extension as any).windowManager = mockWindowManager;
    if (!(extension as any).componentRegistry) {
      (extension as any).componentRegistry = new Map();
    }
    
    // Mock extension context
    context = {
      subscriptions: [],
    };
    
    // Reset component registry if it exists
    if ((extension as any).componentRegistry) {
      (extension as any).componentRegistry = new Map();
    }

    // Setup console spies
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('vue.bridge.receiveMessage Command', () => {
    it('should register the bridge message receiver command', async () => {
      // Act
      await extension.activate(context);
      
      // Assert
      expect(coc.commands.registerCommand).toHaveBeenCalledWith(
        'vue.bridge.receiveMessage',
        expect.any(Function)
      );
    });
    
    it('should call bridgeCore.receiveMessage when command is executed', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vue.bridge.receiveMessage'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      const testMessage = JSON.stringify({ id: 'test', type: 'test' });
      
      // Act
      await commandHandler(testMessage);
      
      // Assert
      expect(bridgeCore.receiveMessage).toHaveBeenCalledWith(testMessage);
    });
    
    it('should handle errors during message processing', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vue.bridge.receiveMessage'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      // Make bridgeCore.receiveMessage throw an error
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      bridgeCore.receiveMessage.mockImplementation(() => {
        throw new Error('Bridge message processing error');
      });
      
      // Act
      await commandHandler('invalid-message');
      
      // Assert
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[COC-VUE] Error processing bridge message:'),
        expect.any(Error)
      );
    });
  });

  describe('vue.bridge.test Command', () => {
    it('should register the bridge test command', async () => {
      // Act
      await extension.activate(context);
      
      // Assert
      expect(coc.commands.registerCommand).toHaveBeenCalledWith(
        'vue.bridge.test',
        expect.any(Function)
      );
    });
    
    it('should send a ping message when command is executed', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vue.bridge.test'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      // Act
      await commandHandler();
      
      // Assert
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ping',
          type: MessageType.REQUEST,
          payload: expect.any(Object)
        })
      );
    });
    
    it('should register a pong handler when command is executed', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vue.bridge.test'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      // Act
      await commandHandler();
      
      // Assert
      expect(bridgeCore.registerHandler).toHaveBeenCalledWith(
        'pong',
        expect.any(Function)
      );
    });
    
    it('should show success message when pong response is received', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vue.bridge.test'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      // Capture the response handler
      let pongHandler: Function | null = null;
      bridgeCore.registerHandler.mockImplementation((eventType, handler) => {
        if (eventType === 'pong') {
          pongHandler = handler;
        }
        return { dispose: jest.fn() };
      });
      
      // Act - Execute the command
      await commandHandler();
      
      // Now simulate receiving a pong response
      if (!pongHandler) {
        fail('Pong handler not registered');
        return;
      }
      
      const pongResponse = {
        type: MessageType.RESPONSE,
        action: 'pong',
        payload: { latency: 42 }
      };
      
      // Make sure pongHandler is callable and then call it
      if (pongHandler && typeof pongHandler === 'function') {
        try {
          // Cast to any to avoid TypeScript errors
          const handler = pongHandler as any;
          await handler(pongResponse);
        } catch (error) {
          fail(`Error calling pongHandler: ${error}`);
        }
      } else {
        fail('pongHandler is not a function');
      }
      
      // Assert
      expect(coc.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Bridge test successful!')
      );
      expect(bridgeCore.unregisterHandler).toHaveBeenCalledWith('pong', pongHandler);
    });
    
    it('should handle errors during bridge test', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vue.bridge.test'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      // Make bridgeCore.sendMessage throw an error
      bridgeCore.sendMessage.mockRejectedValueOnce(new Error('Bridge test error'));
      
      // Act
      await commandHandler();
      
      // Assert
      expect(coc.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Error testing bridge: Bridge test error')
      );
    });
  });
});

/**
 * Helper function to find a command handler from mock calls
 */
function findCommandHandler(mockCalls: any[], commandName: string): Function | undefined {
  const call = mockCalls.find(call => call[0] === commandName);
  return call ? call[1] : undefined;
}
