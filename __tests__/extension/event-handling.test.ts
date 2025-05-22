/**
 * Tests for event handling in the extension
 * 
 * This file contains tests for the vueui.callMethod command and event handling.
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

// Create mock objects that can be referenced in tests
const mockBufferRouter = {
  createBuffer: jest.fn(),
  deleteBuffer: jest.fn(),
  switchBuffer: jest.fn(),
  getCurrentBuffer: jest.fn(),
  cleanLayout: jest.fn()
};

const mockRegisterBufferCommands = jest.fn().mockReturnValue({
  bufferRouter: mockBufferRouter
});

const mockWindowManager = {
  cleanLayout: jest.fn().mockResolvedValue(true)
};

const mockRegisterWindowManagerCommands = jest.fn().mockReturnValue({
  windowManager: mockWindowManager
});

jest.mock('../../src/commands/bufferCommands', () => ({
  registerBufferCommands: mockRegisterBufferCommands
}));

jest.mock('../../src/commands/windowManagerCommands', () => ({
  registerWindowManagerCommands: mockRegisterWindowManagerCommands
}));

// Import test utilities
import { resetAllMocks } from '../../helper-test/utils/test-utils';

// Import the module to test
import * as extension from '../../src/index';

// Get the mocked modules
const coc = jest.requireMock('coc.nvim');

describe('Event Handling', () => {
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
      workspaceState: {
        get: jest.fn(),
        update: jest.fn()
      },
      extensionPath: '/test/extension/path'
    };
    
    // Setup console spies
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('vueui.callMethod Command', () => {
    it('should register the vueui.callMethod command', async () => {
      // Act
      await extension.activate(context);
      
      // Assert
      expect(coc.commands.registerCommand).toHaveBeenCalledWith(
        'vueui.callMethod',
        expect.any(Function)
      );
    });
    
    it('should handle component:created event', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vueui.callMethod'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      // Act
      await commandHandler('component:created', { id: 'test-component' });
      
      // Assert
      expect(coc.window.showInformationMessage).toHaveBeenCalledWith(
        'Component created: test-component'
      );
    });
    
    it('should handle select:opened event', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vueui.callMethod'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      // Mock Select component to verify it's being used
      const testId = 'test-select-' + Date.now();
      
      // Act
      const result = await commandHandler('select:opened', { id: testId });
      
      // Assert - just verify we got a success response
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          eventName: 'select:opened',
          timestamp: expect.any(Number)
        })
      );
    });
    
    it('should handle select:confirmed event', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vueui.callMethod'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      // Act
      await commandHandler('select:confirmed', { value: 'test-value' });
      
      // Assert
      expect(coc.window.showInformationMessage).toHaveBeenCalledWith(
        'Selected value: test-value'
      );
    });
    
    it('should handle select:confirmed event with missing value', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vueui.callMethod'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      // Act
      await commandHandler('select:confirmed', {});
      
      // Assert
      expect(coc.window.showInformationMessage).toHaveBeenCalledWith(
        'Selected value: none'
      );
    });
    
    it('should handle component:destroyed event', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vueui.callMethod'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      // Set up test component ID
      const testId = 'test-component-' + Date.now();
      
      // Act
      const result = await commandHandler('component:destroyed', { id: testId, type: 'test' });
      
      // Assert - just verify we got a success response
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          eventName: 'component:destroyed',
          timestamp: expect.any(Number)
        })
      );
    });
    
    it('should handle unknown event types', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vueui.callMethod'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      // Act
      await commandHandler('unknown:event', { id: 'test' });
      
      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        '[COC-VUE] Unhandled event type: unknown:event'
      );
    });
    
    it('should return success response for successful event handling', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vueui.callMethod'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      // Act
      const result = await commandHandler('component:created', { id: 'test' });
      
      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          eventName: 'component:created',
          timestamp: expect.any(Number)
        })
      );
    });
    
    it('should handle errors during event processing', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vueui.callMethod'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      // Force an error by making showInformationMessage throw
      coc.window.showInformationMessage.mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      
      // Act
      const result = await commandHandler('component:created', { id: 'test' });
      
      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Test error'),
          timestamp: expect.any(Number)
        })
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
