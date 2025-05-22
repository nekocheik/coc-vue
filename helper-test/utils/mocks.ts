/**
 * Centralized mocks for tests
 * 
 * This file contains mock implementations for external dependencies
 * and internal modules that are used across multiple test files.
 */
import { EventEmitter } from 'events';
import { BufferRoute } from '../../src/bufferRouter';

// Create mock event emitter for testing events
const mockEventEmitter = new EventEmitter();

/**
 * Mock implementation of ExtensionContext
 */
export const createExtensionContextMock = () => {
  return {
    subscriptions: [],
    extensionPath: '/path/to/extension',
    storagePath: '/path/to/storage',
    globalStoragePath: '/path/to/global/storage',
    asAbsolutePath: jest.fn((relativePath) => `/absolute/path/${relativePath}`),
    workspaceState: {
      get: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined)
    },
    globalState: {
      get: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined)
    },
    logPath: '/path/to/log',
    environmentVariableCollection: {} as any,
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
      mark: jest.fn(),
      level: 'info',
      category: 'test'
    }
  };
};

/**
 * Mock implementation of coc.nvim
 */
export const createCocMock = () => {
  return {
    workspace: {
      nvim: {
        command: jest.fn().mockResolvedValue(true),
        call: jest.fn().mockResolvedValue(null),
        lua: jest.fn().mockImplementation(() => Promise.resolve(null)),
        eval: jest.fn().mockResolvedValue(null),
        createBuffer: jest.fn().mockResolvedValue(1),
        createWindow: jest.fn().mockResolvedValue(1),
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
      registerCommand: jest.fn((name, callback) => {
        registeredCommands[name] = callback;
        return { dispose: jest.fn() };
      }),
      executeCommand: jest.fn(),
      getCommands: jest.fn(() => []),
    },
    events: {
      on: jest.fn().mockImplementation((event, callback, thisArg, disposables) => {
        // Store the callback in our mock emitter
        mockEventEmitter.on(event, callback);
        
        // Return a mock disposable
        const disposable = {
          dispose: jest.fn().mockImplementation(() => {
            mockEventEmitter.removeListener(event, callback);
          })
        };
        
        // Add to disposables array if provided
        if (Array.isArray(disposables)) {
          disposables.push(disposable);
        }
        
        return disposable;
      })
    },
    ExtensionContext: jest.fn(() => ({
      subscriptions: [],
      extensionPath: '/path/to/extension',
      storagePath: '/path/to/storage',
      globalStoragePath: '/path/to/global/storage',
      asAbsolutePath: jest.fn((relativePath) => `/absolute/path/${relativePath}`),
    })),
    // Helper method to emit events in tests
    __TEST_HELPERS__: {
      emitEvent: (event: string | string[], ...args: any[]) => {
        if (Array.isArray(event)) {
          event.forEach(e => mockEventEmitter.emit(e, ...args));
        } else {
          mockEventEmitter.emit(event, ...args);
        }
      }
    }
  };
};

// Default mock route for testing
export const mockRoute: BufferRoute = {
  id: 'test-id-123',
  path: '/test/path',
  query: { foo: 'bar' },
  createdAt: 1747915084360
};

// Secondary mock route for testing route changes
export const mockRoute2: BufferRoute = {
  id: 'test-id-456',
  path: '/test/path2',
  query: { test: 'value' },
  createdAt: 1747915084400
};

// Store registered commands for testing
export const registeredCommands: Record<string, Function> = {};

/**
 * Mock implementation of BufferRouter
 */
export const createBufferRouterMock = () => {
  return {
    BufferRouter: Object.assign(
      jest.fn().mockImplementation(() => ({
        getCurrentBuffer: jest.fn().mockResolvedValue(null),
        switchBuffer: jest.fn().mockResolvedValue(true),
        createBuffer: jest.fn().mockResolvedValue('new-id-123'),
        deleteBuffer: jest.fn().mockResolvedValue(true),
        on: jest.fn().mockImplementation((event, listener) => ({
          dispose: jest.fn()
        })),
        getCurrentBufferSync: jest.fn().mockReturnValue(null),
        refreshCurrentBuffer: jest.fn().mockResolvedValue(undefined),
        dispose: jest.fn()
      })),
      {
        // Add static Events property to mock class
        Events: {
          BUFFER_CREATED: 'buffer-created',
          BUFFER_DELETED: 'buffer-deleted',
          BUFFER_SWITCHED: 'buffer-switched',
          BUFFER_UPDATED: 'buffer-updated',
          CURRENT_BUFFER_CHANGED: 'current-buffer-changed'
        }
      }
    )
  };
};

/**
 * Reset all mocks between tests
 */
export function resetAllMocks() {
  jest.clearAllMocks();
  Object.keys(registeredCommands).forEach(key => {
    delete registeredCommands[key];
  });
}
