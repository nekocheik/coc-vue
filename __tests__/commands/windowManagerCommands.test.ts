// Use import statements at the top
import { ExtensionContext } from 'coc.nvim';

// Define mock variables that will be referenced throughout tests
let mockNvim: any;
let mockWindow: any;
let mockCommands: any;
let mockWindowManager: any;
let mockBufferRouter: any;
let commandHandlers: Record<string, Function> = {};

// Mock coc.nvim before importing any modules that depend on it
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

// Mock BufferRouter with simple implementation
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

// Mock WindowManager with simple implementation
const WindowManager = jest.fn();
jest.mock('../../src/windowManager', () => {
  return {
    WindowManager: WindowManager.mockImplementation(() => {
      mockWindowManager = {
        mountBuffer: jest.fn().mockResolvedValue(true),
        unmountBuffer: jest.fn().mockResolvedValue(true),
        getSlot: jest.fn().mockReturnValue(null),
        dispose: jest.fn()
      };
      return mockWindowManager;
    })
  };
});

// Now import the module under test after all mocks are set up
import { registerWindowManagerCommands } from '../../src/commands/windowManagerCommands';

describe('WindowManager Commands', () => {
  let context: ExtensionContext;
  let windowManagerResult: any;

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
    windowManagerResult = registerWindowManagerCommands(context);
  });
  
  describe('registerWindowManagerCommands', () => {
    it('should register the windowManager.demoLayout command', () => {
      // Assert that the command was registered
      expect(mockCommands.registerCommand).toHaveBeenCalledWith(
        'windowManager.demoLayout',
        expect.any(Function)
      );
      
      // Assert that the command was added to subscriptions
      expect(context.subscriptions.length).toBeGreaterThan(0);
    });
    
    it('should return the windowManager instance', () => {
      // Assert that we have a windowManager property
      expect(windowManagerResult).toHaveProperty('windowManager');
      // Check that the object is the mock instance
      expect(windowManagerResult.windowManager).toBe(mockWindowManager);
    });
  });
  
  describe('windowManager.demoLayout command', () => {
    it('should create buffers and mount them in slots', async () => {
      // Find the command handler
      const commandHandler = findCommandHandler(mockCommands.registerCommand, 'windowManager.demoLayout');
      
      // Execute the command
      const result = await commandHandler();
      
      // Assert that buffers were created
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_create_buf', [false, true]);
      
      // Assert that information messages were shown
      expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Setting up WindowManager demo layout')
      );
      
      // Assert that the layout was created in Lua
      expect(mockNvim.command).toHaveBeenCalledWith(
        expect.stringContaining('require(\'vue-ui.utils.window_manager\').create_layout')
      );
      
      // Assert that the command succeeded
      expect(result).toBe(true);
    });
    
    it('should handle buffer creation failures', async () => {
      // Mock buffer creation to fail
      mockNvim.call.mockImplementationOnce(() => Promise.resolve(null));
      
      // Find the command handler
      const commandHandler = findCommandHandler(mockCommands.registerCommand, 'windowManager.demoLayout');
      
      // Execute the command
      const result = await commandHandler();
      
      // Assert that an error message was shown
      expect(mockWindow.showErrorMessage).toHaveBeenCalled();
      
      // Assert that the command failed
      expect(result).toBe(false);
    });
    
    it('should handle Lua execution errors', async () => {
      // Mock the command to throw an error
      mockNvim.command.mockImplementationOnce(() => Promise.reject(new Error('Lua error')));
      
      // Find the command handler
      const commandHandler = findCommandHandler(mockCommands.registerCommand, 'windowManager.demoLayout');
      
      // Execute the command
      const result = await commandHandler();
      
      // Assert that error messages are shown (any error message is acceptable)
      expect(mockWindow.showErrorMessage).toHaveBeenCalled();
      
      // Assert that the command failed
      expect(result).toBe(false);
    });
  });
});

/**
 * Helper function to find a command handler by name
 * @param registerCommandMock The mock function for registerCommand
 * @param commandName The name of the command to find
 * @returns The command handler function
 */
function findCommandHandler(registerCommandMock: jest.Mock, commandName: string): Function {
  const calls = registerCommandMock.mock.calls;
  for (const call of calls) {
    if (call[0] === commandName) {
      return call[1];
    }
  }
  throw new Error(`Command handler not found: ${commandName}`);
}
