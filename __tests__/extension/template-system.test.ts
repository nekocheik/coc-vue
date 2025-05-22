/**
 * Tests for template system in the extension
 * 
 * This file contains tests for template-related commands and functionality.
 */

// Mock dependencies - must be before any imports that use them
jest.mock('coc.nvim', () => ({
  workspace: {
    nvim: {
      call: jest.fn().mockResolvedValue(1),
      command: jest.fn().mockResolvedValue(undefined),
      eval: jest.fn(),
    },
    getConfiguration: jest.fn(() => ({
      get: jest.fn(() => false)
    })),
  },
  window: {
    showInformationMessage: jest.fn().mockResolvedValue(undefined),
    showErrorMessage: jest.fn().mockResolvedValue(undefined),
    showWarningMessage: jest.fn().mockResolvedValue(undefined),
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

// Mock window manager with cleanLayout that we'll reference in tests
const mockCleanLayout = jest.fn().mockResolvedValue(true);
const mockWindowManager = {
  cleanLayout: mockCleanLayout
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

jest.mock('../../template/templateIntegration', () => ({
  renderAppTemplate: jest.fn().mockResolvedValue(true)
}));

// Import test utilities
import { resetAllMocks } from '../../helper-test/utils/test-utils';

// Import the module to test
import * as extension from '../../src/index';

// Get the mocked modules
const coc = jest.requireMock('coc.nvim');
const { renderAppTemplate } = jest.requireMock('../../template/templateIntegration');

describe('Template System', () => {
  let context: any;
  
  beforeEach(() => {
    resetAllMocks();
    
    // Reset and make sure our buffer commands get properly mocked
    mockRegisterBufferCommands.mockReturnValue({
      bufferRouter: mockBufferRouter
    });
    
    mockRegisterWindowManagerCommands.mockReturnValue({
      windowManager: mockWindowManager
    });
    
    // Clear any previous calls to our mocks
    mockCleanLayout.mockClear();
    renderAppTemplate.mockClear();
    
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

  describe('Template Command Registration', () => {
    it('should register the showTemplateStatus command', async () => {
      // Act
      await extension.activate(context);
      
      // Assert
      expect(coc.commands.registerCommand).toHaveBeenCalledWith(
        'vue.showTemplateStatus',
        expect.any(Function)
      );
    });
    
    it('should register the mountTemplateLayout command', async () => {
      // Act
      await extension.activate(context);
      
      // Assert
      expect(coc.commands.registerCommand).toHaveBeenCalledWith(
        'vue.mountTemplateLayout',
        expect.any(Function)
      );
    });
  });
  
  describe('vue.showTemplateStatus Command', () => {
    it('should show active template status', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vue.showTemplateStatus'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      // Mock nvim.call to return 1 (template status active)
      coc.workspace.nvim.call.mockResolvedValueOnce(1);
      
      // Act
      await commandHandler();
      
      // Assert
      expect(coc.workspace.nvim.call).toHaveBeenCalledWith(
        'exists', 'g:coc_vue_template_status'
      );
      expect(coc.window.showInformationMessage).toHaveBeenCalledWith(
        'Template status: Active'
      );
    });
    
    it('should show inactive template status', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vue.showTemplateStatus'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      // Mock nvim.call to return 0 (template status inactive)
      coc.workspace.nvim.call.mockResolvedValueOnce(0);
      
      // Act
      await commandHandler();
      
      // Assert
      expect(coc.window.showInformationMessage).toHaveBeenCalledWith(
        'Template status: Inactive'
      );
    });
    
    it('should handle errors during template status check', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vue.showTemplateStatus'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      // Mock nvim.call to throw error
      coc.workspace.nvim.call.mockRejectedValueOnce(new Error('Template status error'));
      
      // Act
      await commandHandler();
      
      // Assert
      expect(coc.window.showErrorMessage).toHaveBeenCalledWith(
        'Error getting template status: Template status error'
      );
    });
  });
  
  describe('vue.mountTemplateLayout Command', () => {
    it('should mount template layout successfully', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vue.mountTemplateLayout'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      // Mock renderAppTemplate to return true (success)
      renderAppTemplate.mockResolvedValueOnce(true);
      
      // Act
      await commandHandler();
      
      // Assert
      expect(mockCleanLayout).toHaveBeenCalled();
      expect(renderAppTemplate).toHaveBeenCalled();
      expect(coc.window.showInformationMessage).toHaveBeenCalledWith(
        'Template layout mounted successfully.'
      );
    });
    
    it('should handle warnings during template mounting', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vue.mountTemplateLayout'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      // Mock renderAppTemplate to return false (warnings)
      renderAppTemplate.mockResolvedValueOnce(false);
      
      // Act
      await commandHandler();
      
      // Assert
      expect(coc.window.showWarningMessage).toHaveBeenCalledWith(
        'Template layout mounted with warnings. Check logs for details.'
      );
    });
    
    it('should handle errors during template mounting', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vue.mountTemplateLayout'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      // Mock renderAppTemplate to throw error
      renderAppTemplate.mockRejectedValueOnce(new Error('Template mounting error'));
      
      // Act
      await commandHandler();
      
      // Assert
      expect(coc.window.showErrorMessage).toHaveBeenCalledWith(
        'Error mounting template layout: Template mounting error'
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
