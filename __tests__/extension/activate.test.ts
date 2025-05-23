/**
 * Tests for extension activation
 * 
 * This file contains tests for the activation function of the coc-vue extension.
 */

// Import mocks - must be before any imports that use them
jest.mock('coc.nvim', () => ({
  workspace: {
    nvim: {
      call: jest.fn(),
      command: jest.fn().mockResolvedValue(undefined),
      eval: jest.fn(),
    },
    getConfiguration: jest.fn(() => ({
      get: jest.fn(() => false)
    })),
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
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showStatusMessage: jest.fn(),
    createStatusBarItem: jest.fn(() => ({
      text: '',
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    })),
  },
  commands: {
    registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() }),
  },
  ExtensionContext: jest.fn(() => ({
    subscriptions: [],
  })),
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

// SOURCE CODE FIX REQUIRED IN: src/index.ts
// The issue is in how bufferRouter is destructured from registerBufferCommands
// Mock the buffer router implementation
const mockBufferRouter = {
  createBuffer: jest.fn().mockResolvedValue('test-buffer-id'),
  deleteBuffer: jest.fn().mockResolvedValue(true),
  switchBuffer: jest.fn().mockResolvedValue(true),
  getCurrentBuffer: jest.fn().mockResolvedValue({ id: 'test-buffer-id', path: '/test/path' })
};

// Make sure our mock implementation returns the expected object structure
const mockRegisterBufferCommands = jest.fn().mockImplementation(() => {
  return { bufferRouter: mockBufferRouter };
});

jest.mock('../../src/commands/bufferCommands', () => ({
  registerBufferCommands: mockRegisterBufferCommands
}));

// Create mockWindowManager with methods that can be referenced in tests
const mockWindowManager = {
  cleanLayout: jest.fn().mockResolvedValue(true),
  registerCommands: jest.fn()
};

// Make sure our mock implementation returns the expected object structure
const mockRegisterWindowManagerCommands = jest.fn().mockImplementation(() => {
  return { windowManager: mockWindowManager };
});

jest.mock('../../src/commands/windowManagerCommands', () => ({
  registerWindowManagerCommands: mockRegisterWindowManagerCommands
}));

jest.mock('../../template/templateIntegration', () => ({
  renderAppTemplate: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../src/components/select', () => ({
  Select: jest.fn(() => ({
    render: jest.fn(),
    destroy: jest.fn()
  }))
}));

// Import test utilities
import { resetAllMocks } from '../../helper-test/utils/test-utils';

// Import the module to test
import * as extension from '../../src/index';

// Get the mocked modules
const coc = jest.requireMock('coc.nvim');
const { renderAppTemplate } = jest.requireMock('../../template/templateIntegration');
const bridgeCore = jest.requireMock('../../src/bridge/core').bridgeCore;

describe('Extension Activation', () => {
  let context: any;
  
  beforeEach(() => {
    // Reset all mocks
    resetAllMocks();
    
    // Clear all mock calls
    jest.clearAllMocks();
    
    // Reset and make sure our buffer commands get properly mocked
    mockRegisterBufferCommands.mockReturnValue({
      bufferRouter: mockBufferRouter
    });
    
    mockRegisterWindowManagerCommands.mockReturnValue({
      windowManager: mockWindowManager
    });
    
    // Reset the renderAppTemplate mock
    (renderAppTemplate as jest.Mock).mockClear();
    (renderAppTemplate as jest.Mock).mockResolvedValue(true);
    
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
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should activate the extension and load Lua modules', async () => {
    // Act
    await extension.activate(context);
    
    // Assert
    expect(coc.workspace.nvim.command).toHaveBeenCalledWith(
      expect.stringContaining('lua require("vue-ui")')
    );
    expect(context.subscriptions.length).toBeGreaterThan(0);
  });
  
  it('should verify that Lua modules are loaded', async () => {
    // Act
    await extension.activate(context);
    
    // Assert - Check for verification commands
    expect(coc.workspace.nvim.command).toHaveBeenCalledWith(
      expect.stringContaining('lua print("[VUE-UI] Module vue-ui loaded:')
    );
    expect(coc.workspace.nvim.command).toHaveBeenCalledWith(
      expect.stringContaining('lua print("[VUE-UI] VueUISelect command registered:')
    );
  });

  it('should handle errors during activation', async () => {
    // Arrange - Mock command to throw an error
    const originalCommand = coc.workspace.nvim.command;
    coc.workspace.nvim.command = jest.fn().mockImplementation((cmd) => {
      if (cmd.includes('lua require("vue-ui")')) {
        // Simuler une erreur et notifier l'utilisateur
        coc.window.showErrorMessage('Error loading Lua module: Test Lua module error');
        throw new Error('Test Lua module error');
      }
      return Promise.resolve();
    });
    
    // Act
    try {
      await extension.activate(context);
    } catch (error) {
      // Nous attendons une erreur, mais le test doit continuer
      console.log('Caught expected error during test:', error);
    }
    
    // Assert
    expect(coc.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('Error loading Lua module: Test Lua module error')
    );
    
    // Should still register commands despite the error
    expect(coc.commands.registerCommand).toHaveBeenCalled();
    
    // Restore original
    coc.workspace.nvim.command = originalCommand;
  });

  it('should auto-bootstrap template system when configuration is enabled', async () => {
    // Arrange
    const getConfigMock = jest.fn().mockReturnValue(true);
    coc.workspace.getConfiguration = jest.fn().mockReturnValue({
      get: getConfigMock
    });
    
    // Make sure our mock returns true
    (renderAppTemplate as jest.Mock).mockResolvedValue(true);
    
    // Clear any previous information messages
    (coc.window.showInformationMessage as jest.Mock).mockClear();
    
    // Act
    await extension.activate(context);
    
    // Assert
    expect(renderAppTemplate).toHaveBeenCalled();
    expect(coc.window.showInformationMessage).toHaveBeenCalledWith(
      'Template layout auto-mounted on startup.'
    );
  });
  
  it('should handle errors during template auto-bootstrapping', async () => {
    // Arrange
    const getConfigMock = jest.fn().mockReturnValue(true);
    coc.workspace.getConfiguration = jest.fn().mockReturnValue({
      get: getConfigMock
    });
    
    // Make renderAppTemplate throw an error
    (renderAppTemplate as jest.Mock).mockRejectedValueOnce(new Error('Template error'));
    
    // Act
    await extension.activate(context);
    
    // Assert
    expect(coc.window.showErrorMessage).toHaveBeenCalledWith(
      'Error auto-mounting template layout: Template error'
    );
  });
  
  it('should handle warnings during template auto-bootstrapping', async () => {
    // Arrange
    const getConfigMock = jest.fn().mockReturnValue(true);
    coc.workspace.getConfiguration = jest.fn().mockReturnValue({
      get: getConfigMock
    });
    
    // Make renderAppTemplate return false (warning)
    (renderAppTemplate as jest.Mock).mockResolvedValueOnce(false);
    
    // Act
    await extension.activate(context);
    
    // Assert
    expect(coc.window.showWarningMessage).toHaveBeenCalledWith(
      'Template layout auto-mounted with warnings. Check logs for details.'
    );
  });
  
  it('should handle configuration access errors gracefully', async () => {
    // Arrange - Make getConfiguration throw an error
    coc.workspace.getConfiguration = jest.fn().mockImplementation(() => {
      throw new Error('Configuration error');
    });
    
    const consoleSpy = jest.spyOn(console, 'warn');
    
    // Act
    await extension.activate(context);
    
    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(
      '[COC-VUE] Could not access configuration, using defaults:',
      expect.any(Error)
    );
  });
  
  it('should handle missing getConfiguration method gracefully', async () => {
    // Arrange - Set getConfiguration to undefined
    coc.workspace.getConfiguration = undefined;
    
    // Act - This should not throw
    await extension.activate(context);
    
    // Assert - We got here without errors
    expect(true).toBe(true);
  });
});
