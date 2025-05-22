/**
 * Tests for buffer commands in the extension
 * 
 * This file contains tests for buffer-related commands.
 */

// Mock dependencies - must be before any imports that use them
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

// Mock the buffer router with specific implementations
const mockCreateBuffer = jest.fn().mockResolvedValue({ id: 'test-buffer', path: '/test/path.vue' });
const mockDeleteBuffer = jest.fn().mockResolvedValue({ success: true, id: 'test-buffer' });
const mockSwitchBuffer = jest.fn().mockResolvedValue({ id: 'test-buffer', active: true });
const mockGetCurrentBuffer = jest.fn().mockResolvedValue({ id: 'current-buffer', path: '/current/path.vue' });
const mockCleanLayout = jest.fn().mockResolvedValue(true);

// Create the mock buffer router object that can be referenced in tests
const mockBufferRouter = {
  createBuffer: mockCreateBuffer,
  deleteBuffer: mockDeleteBuffer,
  switchBuffer: mockSwitchBuffer,
  getCurrentBuffer: mockGetCurrentBuffer,
  cleanLayout: mockCleanLayout
};

const mockRegisterBufferCommands = jest.fn().mockReturnValue({
  bufferRouter: mockBufferRouter
});

// Create the mock window manager
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

describe('Buffer Commands', () => {
  let context: any;
  
  beforeEach(() => {
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
    
    // Reset buffer command mocks
    mockCreateBuffer.mockClear();
    mockDeleteBuffer.mockClear();
    mockSwitchBuffer.mockClear();
    mockGetCurrentBuffer.mockClear();
    mockCleanLayout.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Buffer Command Registration', () => {
    it('should register buffer commands', async () => {
      // Act
      await extension.activate(context);
      
      // Assert
      expect(coc.commands.registerCommand).toHaveBeenCalledWith(
        'vue.buffer.create',
        expect.any(Function)
      );
      expect(coc.commands.registerCommand).toHaveBeenCalledWith(
        'vue.buffer.delete',
        expect.any(Function)
      );
      expect(coc.commands.registerCommand).toHaveBeenCalledWith(
        'vue.buffer.switch',
        expect.any(Function)
      );
      expect(coc.commands.registerCommand).toHaveBeenCalledWith(
        'vue.buffer.current',
        expect.any(Function)
      );
    });
  });
  
  describe('vue.buffer.create Command', () => {
    it('should call bufferRouter.createBuffer with correct parameters', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vue.buffer.create'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      const testPath = '/test/path.vue';
      const testOptions = { mode: 'edit' };
      
      // Act
      await commandHandler(testPath, testOptions);
      
      // Assert
      expect(mockCreateBuffer).toHaveBeenCalledWith(testPath, testOptions);
    });
    
    it('should return the result from bufferRouter.createBuffer', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vue.buffer.create'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      const testPath = '/test/path.vue';
      const expectedResult = { id: 'test-buffer', path: '/test/path.vue' };
      mockCreateBuffer.mockResolvedValueOnce(expectedResult);
      
      // Act
      const result = await commandHandler(testPath);
      
      // Assert
      expect(result).toEqual(expectedResult);
    });
  });
  
  describe('vue.buffer.delete Command', () => {
    it('should call bufferRouter.deleteBuffer with correct parameters', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vue.buffer.delete'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      const testBufferId = 'test-buffer';
      
      // Act
      await commandHandler(testBufferId);
      
      // Assert
      expect(mockDeleteBuffer).toHaveBeenCalledWith(testBufferId);
    });
    
    it('should return the result from bufferRouter.deleteBuffer', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vue.buffer.delete'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      const testBufferId = 'test-buffer';
      const expectedResult = { success: true, id: 'test-buffer' };
      mockDeleteBuffer.mockResolvedValueOnce(expectedResult);
      
      // Act
      const result = await commandHandler(testBufferId);
      
      // Assert
      expect(result).toEqual(expectedResult);
    });
  });
  
  describe('vue.buffer.switch Command', () => {
    it('should call bufferRouter.switchBuffer with correct parameters', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vue.buffer.switch'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      const testBufferId = 'test-buffer';
      
      // Act
      await commandHandler(testBufferId);
      
      // Assert
      expect(mockSwitchBuffer).toHaveBeenCalledWith(testBufferId);
    });
    
    it('should return the result from bufferRouter.switchBuffer', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vue.buffer.switch'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      const testBufferId = 'test-buffer';
      const expectedResult = { id: 'test-buffer', active: true };
      mockSwitchBuffer.mockResolvedValueOnce(expectedResult);
      
      // Act
      const result = await commandHandler(testBufferId);
      
      // Assert
      expect(result).toEqual(expectedResult);
    });
  });
  
  describe('vue.buffer.current Command', () => {
    it('should call bufferRouter.getCurrentBuffer', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vue.buffer.current'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      // Act
      await commandHandler();
      
      // Assert
      expect(mockGetCurrentBuffer).toHaveBeenCalled();
    });
    
    it('should return the result from bufferRouter.getCurrentBuffer', async () => {
      // Arrange
      await extension.activate(context);
      
      // Find the command handler
      const commandHandler = findCommandHandler(
        coc.commands.registerCommand.mock.calls,
        'vue.buffer.current'
      );
      
      if (!commandHandler) {
        fail('Command handler not found');
        return;
      }
      
      const expectedResult = { id: 'current-buffer', path: '/current/path.vue' };
      mockGetCurrentBuffer.mockResolvedValueOnce(expectedResult);
      
      // Act
      const result = await commandHandler();
      
      // Assert
      expect(result).toEqual(expectedResult);
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
