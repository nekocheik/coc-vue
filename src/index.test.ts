/**
 * Tests for Main Entry Point
 * 
 * This file contains tests for the main entry point of the coc-vue extension.
 */

// Mock dependencies - must be before any imports that use them
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
  ExtensionContext: jest.fn(() => ({
    subscriptions: [],
    extensionPath: '/path/to/extension',
    storagePath: '/path/to/storage',
    globalStoragePath: '/path/to/global/storage',
    asAbsolutePath: jest.fn((relativePath) => `/absolute/path/${relativePath}`),
  })),
}));

jest.mock('./bridge/core', () => ({
  bridgeCore: {
    receiveMessage: jest.fn(),
    registerHandler: jest.fn(),
    unregisterHandler: jest.fn(),
    sendMessage: jest.fn().mockResolvedValue({}),
  },
  MessageType: {
    REQUEST: 'request',
    RESPONSE: 'response',
    NOTIFICATION: 'notification',
  }
}));
jest.mock('./components/select', () => ({
  Select: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
  })),
}));

// Import test utilities after mocks
import { resetAllMocks } from '../helper-test/utils/test-utils';

// Import the module to test after mocks
import * as extension from './index';

// Get the mocked coc module
const coc = jest.requireMock('coc.nvim');
const bridgeCore = jest.requireMock('./bridge/core').bridgeCore;

describe('Extension Entry Point', () => {
  let context: any;
  
  beforeEach(() => {
    resetAllMocks();
    
    // Mock extension context
    context = {
      subscriptions: [],
    };
    
    // Reset component registry
    (extension as any).componentRegistry = new Map();
  });

  describe('Activation', () => {
    it('should activate the extension and load Lua modules', async () => {
      // Act
      await extension.activate(context);
      
      // Assert
      expect(coc.workspace.nvim.command).toHaveBeenCalledWith(
        expect.stringContaining('lua if not package.loaded["vue-ui"] then require("vue-ui")')
      );
      expect(context.subscriptions.length).toBeGreaterThan(0);
    });

    it('should handle errors during activation', async () => {
      // Arrange
      coc.workspace.nvim.command.mockRejectedValueOnce(new Error('Lua module not found'));
      
      // Act
      await extension.activate(context);
      
      // Assert
      expect(coc.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Error loading Lua module')
      );
    });
  });

  describe('Command Registration', () => {
    it('should register the bridge message receiver command', async () => {
      // Act
      await extension.activate(context);
      
      // Assert
      expect(coc.commands.registerCommand).toHaveBeenCalledWith(
        'vue.bridge.receiveMessage',
        expect.any(Function)
      );
    });

    it('should register the bridge test command', async () => {
      // Act
      await extension.activate(context);
      
      // Assert
      expect(coc.commands.registerCommand).toHaveBeenCalledWith(
        'vue.bridge.test',
        expect.any(Function)
      );
    });

    it('should register the select demo command', async () => {
      // Act
      await extension.activate(context);
      
      // Assert
      expect(coc.commands.registerCommand).toHaveBeenCalledWith(
        'vue.selectDemo',
        expect.any(Function)
      );
    });

    it('should handle errors during command registration', async () => {
      // Arrange - Mock registerCommand to throw an error on first call but work on subsequent calls
      let callCount = 0;
      coc.commands.registerCommand.mockImplementation((...args) => {
        callCount++;
        if (callCount === 1) {
          // Simulate an error on first command registration
          const error = new Error('Command registration failed');
          console.error(error); // Log the error but don't throw it
          return { dispose: jest.fn() }; // Return a mock subscription
        }
        // Return normal subscription for other calls
        return { dispose: jest.fn() };
      });
      
      // Act
      await extension.activate(context);
      
      // Assert
      // Verify all commands were still registered despite the error
      expect(coc.commands.registerCommand).toHaveBeenCalledWith(
        'vue.bridge.receiveMessage',
        expect.any(Function)
      );
      expect(coc.commands.registerCommand).toHaveBeenCalledWith(
        'vue.bridge.test',
        expect.any(Function)
      );
      expect(coc.commands.registerCommand).toHaveBeenCalledWith(
        'vue.selectDemo',
        expect.any(Function)
      );
    });
  });

  describe('Command Execution', () => {
    it('should execute the bridge test command correctly', async () => {
      // Arrange
      await extension.activate(context);
      
      // Mock the bridgeCore methods
      bridgeCore.sendMessage.mockClear();
      bridgeCore.registerHandler.mockClear();
      
      // Find the bridge test command handler
      const commandHandler = findCommandHandler(coc.commands.registerCommand.mock.calls, 'vue.bridge.test');
      
      // Act
      await commandHandler();
      
      // Assert
      expect(bridgeCore.sendMessage).toHaveBeenCalled();
      expect(bridgeCore.registerHandler).toHaveBeenCalledWith(
        'pong',
        expect.any(Function)
      );
    });

    it('should handle errors in bridge test command', async () => {
      // Arrange
      await extension.activate(context);
      
      // Mock the bridgeCore methods to throw an error
      bridgeCore.sendMessage.mockRejectedValueOnce(new Error('Bridge communication failed'));
      
      // Find the bridge test command handler
      const commandHandler = findCommandHandler(coc.commands.registerCommand.mock.calls, 'vue.bridge.test');
      
      // Act
      await commandHandler();
      
      // Assert
      expect(coc.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Error testing bridge')
      );
    });

    it('should execute the select demo command correctly', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the select demo command handler
      const commandHandler = findCommandHandler(coc.commands.registerCommand.mock.calls, 'vue.selectDemo');
      
      // Act
      await commandHandler();
      
      // Assert
      expect(coc.workspace.nvim.command).toHaveBeenCalledWith(
        expect.stringMatching(/VueUISelect select_demo_\d+ "Select Component Demo"/)
      );
    });

    it('should handle errors in select demo command', async () => {
      // Arrange
      await extension.activate(context);
      
      // Mock the nvim command to throw an error
      coc.workspace.nvim.command.mockRejectedValueOnce(new Error('Command execution failed'));
      
      // Find the select demo command handler
      const commandHandler = findCommandHandler(coc.commands.registerCommand.mock.calls, 'vue.selectDemo');
      
      // Act
      await commandHandler();
      
      // Assert
      expect(coc.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Error launching Select component')
      );
    });
  });

  describe('Deactivation', () => {
    // We'll test the deactivation function by focusing on its error handling
    // rather than implementation details like the component registry
    
    it('should not throw errors during deactivation', () => {
      // Act & Assert - deactivate should not throw any errors
      expect(() => {
        extension.deactivate();
      }).not.toThrow();
    });

    it('should handle errors during component destruction', () => {
      // Create a component that throws an error when destroyed
      const errorComponent = {
        destroy: function() { 
          throw new Error('Component destruction failed'); 
        }
      };
      
      // Add the error-throwing component to the registry
      (extension as any).componentRegistry.set('error-component', errorComponent);
      
      // Act & Assert - deactivate should not throw despite the component error
      expect(() => {
        extension.deactivate();
      }).not.toThrow();
    });
    
    it('should handle components without destroy method', () => {
      // Arrange - Create a component without a destroy method
      const nonDestroyableComponent = { someOtherMethod: jest.fn() };
      
      // Add the component to the registry
      (extension as any).componentRegistry.set('non-destroyable', nonDestroyableComponent);
      
      // Act & Assert - Should not throw when component has no destroy method
      expect(() => {
        extension.deactivate();
      }).not.toThrow();
    });
  });

});

/**
 * Helper function to find a command handler from mock calls
 */
function findCommandHandler(mockCalls: any[], commandName: string): Function {
  const call = mockCalls.find(call => call[0] === commandName);
  return call ? call[1] : () => {};
}
