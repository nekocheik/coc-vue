/**
 * Tests for extension deactivation
 * 
 * This file contains tests for the deactivation function of the coc-vue extension.
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
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
  },
  commands: {
    registerCommand: jest.fn(),
  },
}));

jest.mock('../../src/bridge/core', () => ({
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

// Initialize the component registry for the tests
(extension as any).componentRegistry = new Map();

describe('Extension Deactivation', () => {
  beforeEach(() => {
    resetAllMocks();
    
    // Clear mock calls
    jest.clearAllMocks();
    
    // Reset component registry and ensure it exists
    (extension as any).componentRegistry = new Map();
    
    // Make sure our buffer and window manager mocks are used
    mockRegisterBufferCommands.mockReturnValue({
      bufferRouter: mockBufferRouter
    });
    
    mockRegisterWindowManagerCommands.mockReturnValue({
      windowManager: mockWindowManager
    });

    // Setup console spies
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should destroy all components during deactivation', () => {
    // Arrange - Create components with destroy methods
    const destroySpy1 = jest.fn();
    const destroySpy2 = jest.fn();
    
    const component1 = { destroy: destroySpy1 };
    const component2 = { destroy: destroySpy2 };
    
    // Create a fresh registry to ensure clean state
    const testRegistry = new Map();
    testRegistry.set('test-component-1', component1);
    testRegistry.set('test-component-2', component2);
    
    // Replace the componentRegistry directly
    (extension as any).componentRegistry = testRegistry;
    
    const consoleSpy = jest.spyOn(console, 'log');
    
    // Act
    extension.deactivate();
    
    // Assert
    expect(destroySpy1).toHaveBeenCalled();
    expect(destroySpy2).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Component test-component-1 destroyed'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Component test-component-2 destroyed'));
  });
  
  it('should handle errors during component destruction', () => {
    // Arrange - Create components with destroy methods, one throws an error
    const destroySpy1 = jest.fn();
    const destroySpy2 = jest.fn().mockImplementation(() => {
      throw new Error('Test error during component destruction');
    });
    
    const component1 = { destroy: destroySpy1 };
    const component2 = { destroy: destroySpy2 };
    
    // Create a fresh registry to ensure clean state
    const testRegistry = new Map();
    testRegistry.set('normal-component', component1);
    testRegistry.set('error-component', component2);
    
    // Replace the componentRegistry directly
    (extension as any).componentRegistry = testRegistry;
    
    const consoleErrorSpy = jest.spyOn(console, 'error');
    
    // Act
    extension.deactivate();
    
    // Assert
    expect(destroySpy1).toHaveBeenCalled();
    expect(destroySpy2).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error destroying component error-component:'),
      expect.any(Error)
    );
  });
  
  it('should handle components without destroy method', () => {
    // Arrange - Create a component without a destroy method
    const component = { someOtherMethod: jest.fn() };
    
    // Add component to registry
    (extension as any).componentRegistry.set('no-destroy-component', component);
    
    const consoleSpy = jest.spyOn(console, 'log');
    
    // Act
    extension.deactivate();
    
    // Assert
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Component no-destroy-component destroyed')
    );
  });
  
  it('should clear component registry after deactivation', () => {
    // Arrange - Create and add some components
    const component1 = { destroy: jest.fn() };
    const component2 = { destroy: jest.fn() };
    
    // Create a fresh registry to ensure clean state
    const testRegistry = new Map();
    testRegistry.set('test-component-1', component1);
    testRegistry.set('test-component-2', component2);
    
    // Replace the componentRegistry directly
    (extension as any).componentRegistry = testRegistry;
    
    // Act
    extension.deactivate();
    
    // Assert
    expect((extension as any).componentRegistry.size).toBe(0);
  });
});
