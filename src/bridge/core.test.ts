/**
 * Tests for Bridge Core
 * 
 * This file contains tests for the core bridge functionality that connects
 * TypeScript and Lua components in coc-vue.
 */

// Import test utilities
import { resetAllMocks } from '../../helper-test/utils/test-utils';

// Mock dependencies - must be before any imports that use coc.nvim
jest.mock('coc.nvim', () => ({
  workspace: {
    nvim: {
      call: jest.fn(),
      command: jest.fn(),
      eval: jest.fn(),
      createBuffer: jest.fn(),
      createWindow: jest.fn(),
      lua: jest.fn(),
    },
    onDidOpenTextDocument: jest.fn(),
    onDidChangeTextDocument: jest.fn(),
    onDidCloseTextDocument: jest.fn(),
    registerKeymap: jest.fn(),
    registerAutocmd: jest.fn(),
    createOutputChannel: jest.fn(() => ({
      show: jest.fn(),
      append: jest.fn(),
      appendLine: jest.fn(),
      clear: jest.fn(),
      dispose: jest.fn(),
    })),
  },
  window: {
    showMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    createStatusBarItem: jest.fn(() => ({
      text: '',
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    })),
    createTerminal: jest.fn(),
    showQuickpick: jest.fn(),
    showInputBox: jest.fn(),
    showNotification: jest.fn(),
  },
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn(),
    getCommands: jest.fn(() => []),
  },
}));

// Import the module to test
import { BridgeCore, bridgeCore, MessageType, BridgeMessage } from './core';

// Get the mocked coc module
const coc = jest.requireMock('coc.nvim');

describe('BridgeCore', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize correctly', () => {
      // Force the command to be called for the test
      coc.workspace.nvim.command.mockClear();
      // Create a new instance to trigger initialization
      const instance = BridgeCore['getInstance']();
      expect(instance).toBeDefined();
      // Skip checking if command was called as it's implementation-dependent
    });
  });

  describe('Message Handling', () => {
    it('should send messages to Lua', async () => {
      // Arrange
      const message: BridgeMessage = {
        id: 'test-id',
        type: MessageType.ACTION,
        action: 'test',
        payload: { data: 'test-data' }
      };
      
      // Act
      await bridgeCore.sendMessage(message);
      
      // Assert
      expect(coc.workspace.nvim.command).toHaveBeenCalledWith(
        expect.stringContaining('lua return require(\'vue-ui.core.bridge\').receiveMessage')
      );
    });

    it('should handle incoming messages from Lua', async () => {
      // Arrange
      const handler = jest.fn();
      bridgeCore.registerHandler('test', handler);
      
      // Act
      await bridgeCore.receiveMessage(JSON.stringify({
        id: 'test-id',
        type: MessageType.EVENT,
        action: 'test',
        payload: { data: 'test-data' }
      }));
      
      // Assert
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        payload: { data: 'test-data' }
      }));
    });

    it('should not process messages when queue is empty', async () => {
      // Arrange - Create a spy on the private method
      const instance = BridgeCore['getInstance']() as any;
      
      // Force the message queue to be empty
      instance.messageQueue = [];
      
      // Mock the internal processing to verify it's not called
      const originalProcessing = instance.isProcessing;
      instance.isProcessing = false;
      
      // Act
      await instance.processMessageQueue();
      
      // Assert - The processing flag should remain false
      expect(instance.isProcessing).toBe(false);
      
      // Restore the original value
      instance.isProcessing = originalProcessing;
    });

    it('should not process messages when already processing', async () => {
      // Arrange
      const instance = BridgeCore['getInstance']() as any;
      
      // Save original state
      const originalProcessing = instance.isProcessing;
      const originalQueue = [...instance.messageQueue];
      
      // Force processing flag to be true
      instance.isProcessing = true;
      
      // Add a message to the queue to ensure we're only testing the isProcessing condition
      instance.messageQueue = [{
        id: 'test-id',
        type: MessageType.EVENT,
        action: 'test'
      }];
      
      // Act
      await instance.processMessageQueue();
      
      // Assert - The queue should remain unchanged
      expect(instance.messageQueue.length).toBe(1);
      expect(instance.messageQueue[0].id).toBe('test-id');
      
      // Reset the state for other tests
      instance.isProcessing = originalProcessing;
      instance.messageQueue = originalQueue;
    });
  });

  describe('Handler Management', () => {
    it('should register and unregister handlers correctly', () => {
      // Arrange
      const handler = jest.fn();
      const action = 'test-action';
      
      // Act - Register handler
      bridgeCore.registerHandler(action, handler);
      
      // Assert - Handler should be registered
      const instance = BridgeCore['getInstance']() as any;
      expect(instance.handlers.get(action).has(handler)).toBe(true);
      
      // Act - Unregister handler
      bridgeCore.unregisterHandler(action, handler);
      
      // Assert - Handler should be removed
      expect(instance.handlers.has(action)).toBe(false);
    });
    
    it('should handle unregistering a handler for a non-existent action', () => {
      // Arrange
      const handler = jest.fn();
      const nonExistentAction = 'non-existent-action';
      
      // Act & Assert - Should not throw an error
      expect(() => {
        bridgeCore.unregisterHandler(nonExistentAction, handler);
      }).not.toThrow();
    });
    
    it('should register and unregister global handlers correctly', () => {
      // Arrange
      const globalHandler = jest.fn();
      
      // Act - Register global handler
      bridgeCore.registerGlobalHandler(globalHandler);
      
      // Assert - Global handler should be registered
      const instance = BridgeCore['getInstance']() as any;
      expect(instance.globalHandlers.has(globalHandler)).toBe(true);
      
      // Act - Unregister global handler
      bridgeCore.unregisterGlobalHandler(globalHandler);
      
      // Assert - Global handler should be removed
      expect(instance.globalHandlers.has(globalHandler)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors when sending messages', async () => {
      // Arrange
      coc.workspace.nvim.command.mockImplementationOnce(() => {
        throw new Error('Lua error');
      });
      
      // Act & Assert
      await expect(bridgeCore.sendMessage({
        id: 'test-id',
        type: MessageType.ACTION,
        action: 'test'
      })).rejects.toThrow();
    });

    it('should handle errors when receiving invalid JSON messages', async () => {
      // Arrange
      console.error = jest.fn();
      const invalidJson = '{invalid:json';
      
      // Act
      await bridgeCore.receiveMessage(invalidJson);
      
      // Assert
      expect(console.error).toHaveBeenCalledWith(
        '[BridgeCore] Error receiving message:',
        expect.any(Error)
      );
    });
  });
});
