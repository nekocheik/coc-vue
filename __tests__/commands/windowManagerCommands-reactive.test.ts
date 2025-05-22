/**
 * Test for reactive template integration in windowManagerCommands
 * 
 * This test verifies that the forceMount command properly calls the
 * renderAppTemplate function to initialize the reactive rendering pipeline.
 */

import { ExtensionContext } from 'coc.nvim';

// Mock variables
let mockNvim: any;
let mockWindow: any;
let mockCommands: any;
let mockWindowManager: any;
let mockBufferRouter: any;
let commandHandlers: Record<string, Function> = {};

// Mock the templateIntegration module
const mockRenderAppTemplate = jest.fn().mockResolvedValue(true);
jest.mock('../../template/templateIntegration', () => ({
  renderAppTemplate: mockRenderAppTemplate
}));

// Mock coc.nvim before importing modules that depend on it
jest.mock('coc.nvim', () => {
  mockNvim = {
    command: jest.fn().mockResolvedValue(undefined),
    call: jest.fn().mockImplementation((method, args) => {
      if (method === 'nvim_create_buf') return Promise.resolve(12345);
      if (method === 'nvim_buf_is_valid') return Promise.resolve(true);
      if (method === 'nvim_buf_set_lines') return Promise.resolve([]);
      if (method === 'nvim_buf_set_option') return Promise.resolve();
      return Promise.resolve();
    })
  };

  mockWindow = {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn()
  };

  mockCommands = {
    registerCommand: jest.fn().mockImplementation((id, handler) => {
      // Store handler for testing
      commandHandlers[id] = handler;
      return { dispose: jest.fn() };
    }),
    executeCommand: jest.fn()
  };

  return {
    workspace: {
      nvim: mockNvim
    },
    window: mockWindow,
    commands: mockCommands
  };
});

// Mock BufferRouter
jest.mock('../../src/bufferRouter', () => {
  return {
    BufferRouter: jest.fn().mockImplementation(() => {
      mockBufferRouter = {
        createBuffer: jest.fn().mockResolvedValue('buffer-123'),
        deleteBuffer: jest.fn().mockResolvedValue(true),
        switchBuffer: jest.fn().mockResolvedValue(true),
        getCurrentBuffer: jest.fn().mockResolvedValue({
          id: 'buffer-123',
          path: 'test.vue',
          query: { test: 'value' }
        }),
        on: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        dispose: jest.fn()
      };
      return mockBufferRouter;
    })
  };
});

// Mock WindowManager
const WindowManager = jest.fn();
jest.mock('../../src/windowManager', () => {
  return {
    WindowManager: WindowManager.mockImplementation(() => {
      mockWindowManager = {
        mountBuffer: jest.fn().mockResolvedValue(true),
        unmountBuffer: jest.fn().mockResolvedValue(true),
        getSlot: jest.fn().mockReturnValue(null),
        dispose: jest.fn(),
        createLayout: jest.fn().mockResolvedValue(true)
      };
      return mockWindowManager;
    })
  };
});

// Import the module under test after all mocks are set up
import { registerWindowManagerCommands } from '../../src/commands/windowManagerCommands';

describe('Reactive Template Integration - WindowManager Commands', () => {
  let context: ExtensionContext;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a mock extension context
    context = {
      subscriptions: [],
      workspaceState: {
        get: jest.fn(),
        update: jest.fn()
      },
      globalState: {
        get: jest.fn(),
        update: jest.fn()
      },
      storagePath: '/tmp/storage',
      extensionPath: '/tmp/extension',
      asAbsolutePath: (relativePath: string) => `/tmp/extension/${relativePath}`,
      logger: {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
        fatal: jest.fn(),
        mark: jest.fn(),
        level: 'info',
        category: 'test'
      } as any
    };
    
    // Register window manager commands
    registerWindowManagerCommands(context);
  });
  
  describe('windowManager.forceMount command', () => {
    it('should call renderAppTemplate instead of manual buffer creation', async () => {
      // Find the command handler
      const commandHandler = commandHandlers['windowManager.forceMount'];
      expect(commandHandler).toBeDefined();
      
      // Execute the command
      const result = await commandHandler();
      
      // Assert that renderAppTemplate was called with windowManager and bufferRouter
      expect(mockRenderAppTemplate).toHaveBeenCalledWith(
        expect.any(Object), 
        expect.any(Object)
      );
      
      // Assert that the manual buffer creation commands are not called
      const createBufferLuaPattern = /local function create_buffer_for_slot/;
      expect(mockNvim.command).not.toHaveBeenCalledWith(
        expect.stringMatching(createBufferLuaPattern)
      );
      
      // Assert that the command succeeded
      expect(result).toBe(true);
    });
  });
});

// Helper function to find a command handler by name
function findCommandHandler(registerCommandMock: jest.Mock, commandName: string): Function {
  for (let i = 0; i < registerCommandMock.mock.calls.length; i++) {
    if (registerCommandMock.mock.calls[i][0] === commandName) {
      return registerCommandMock.mock.calls[i][1];
    }
  }
  throw new Error(`Command handler for ${commandName} not found`);
}
