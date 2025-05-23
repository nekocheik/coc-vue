import { BufferRouter, BufferRoute } from '../src/bufferRouter';
import { ExtensionContext, Disposable, workspace } from 'coc.nvim';
import { EventEmitter } from 'events';

// Define mock data directly to avoid circular dependencies
const mockRoute: BufferRoute = {
  id: 'test-id-123',
  path: '/test/path',
  query: { foo: 'bar' },
  createdAt: 1747915084360
};

const mockRoute2: BufferRoute = {
  id: 'test-id-456',
  path: '/test/path2',
  query: { test: 'value' },
  createdAt: 1747915084400
};

// Create a mock EventEmitter instance for events
const mockEventEmitter = new EventEmitter();
// Increase max listeners to avoid warnings
mockEventEmitter.setMaxListeners(20);

// Mock coc.nvim
jest.mock('coc.nvim', () => {
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
    Disposable: {
      create: jest.fn(() => ({
        dispose: jest.fn()
      }))
    }
  };
});

// Access the mock for emitting events in tests
const cocMock = jest.requireMock('coc.nvim');

describe('BufferRouter', () => {
  // Mock context
  const mockContext: Partial<ExtensionContext> = {
    subscriptions: []
  };
  
  // Mock buffer data
  const mockBufferId = 'buffer-123';
  const mockPath = '/test/path';
  const mockQueryString = 'foo=bar&baz=qux';
  const mockBuffer: BufferRoute = {
    id: mockBufferId,
    path: mockPath,
    query: { foo: 'bar', baz: 'qux' },
    createdAt: 1621234567890
  };
  
  // Secondary mock buffer for testing switching
  const mockBuffer2: BufferRoute = {
    id: 'buffer-456',
    path: '/test/path2',
    query: { test: 'value' },
    createdAt: 1621234567999
  };
  
  // Spy on console methods
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Spy on console methods
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });
  
  afterEach(() => {
    // Restore console methods
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });
  
  test('loadLuaModule loads the buffer_router Lua module', async () => {
    const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
    await bufferRouter['loadLuaModule']();
    
    expect(workspace.nvim.command).toHaveBeenCalledWith('lua require("buffer_router")');
  });
  
  test('callLuaMethod calls Lua methods with proper arguments', async () => {
    const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
    workspace.nvim.lua = jest.fn().mockResolvedValue('result');
    
    const result = await bufferRouter['callLuaMethod']('test_method', 'arg1', { key: 'value' });
    
    expect(workspace.nvim.lua).toHaveBeenCalledWith(
      "return require('buffer_router'):test_method('arg1', {\"key\":\"value\"})" 
    );
    expect(result).toBe('result');
  });
  
  test('createBuffer creates a buffer and returns its ID', async () => {
    const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
    workspace.nvim.lua = jest.fn().mockResolvedValue(mockBufferId);
    
    const id = await bufferRouter.createBuffer(mockPath, { foo: 'bar', baz: 'qux' });
    
    expect(workspace.nvim.lua).toHaveBeenCalledWith(
      expect.stringContaining("return require('buffer_router'):create_buffer('" + mockPath + "'") 
    );
    expect(id).toBe(mockBufferId);
  });
  
  test('createBuffer handles undefined query', async () => {
    const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
    workspace.nvim.lua = jest.fn().mockResolvedValue(mockBufferId);
    
    const id = await bufferRouter.createBuffer(mockPath);
    
    expect(workspace.nvim.lua).toHaveBeenCalledWith(
      `return require('buffer_router'):create_buffer('${mockPath}', {})` 
    );
    expect(id).toBe(mockBufferId);
  });
  
  test('deleteBuffer deletes a buffer by ID', async () => {
    const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
    workspace.nvim.lua = jest.fn().mockResolvedValue(true);
    
    const result = await bufferRouter.deleteBuffer(mockBufferId);
    
    expect(workspace.nvim.lua).toHaveBeenCalledWith(
      `return require('buffer_router'):delete_buffer('${mockBufferId}')`
    );
    expect(result).toBe(true);
  });
  
  test('switchBuffer switches to a buffer by ID', async () => {
    const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
    workspace.nvim.lua = jest.fn().mockResolvedValue(true);
    
    const result = await bufferRouter.switchBuffer(mockBufferId);
    
    expect(workspace.nvim.lua).toHaveBeenCalledWith(
      `return require('buffer_router'):switch_buffer('${mockBufferId}')`
    );
    expect(result).toBe(true);
  });
  
  test('switchBuffer switches to a buffer by path', async () => {
    const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
    workspace.nvim.lua = jest.fn().mockResolvedValue(true);
    
    const result = await bufferRouter.switchBuffer(mockPath);
    
    expect(workspace.nvim.lua).toHaveBeenCalledWith(
      `return require('buffer_router'):switch_buffer('${mockPath}')`
    );
    expect(result).toBe(true);
  });
  
  test('getCurrentBuffer returns the current buffer info', async () => {
    const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
    workspace.nvim.lua = jest.fn().mockResolvedValue(mockBuffer);
    
    const buffer = await bufferRouter.getCurrentBuffer();
    
    expect(workspace.nvim.lua).toHaveBeenCalledWith(
      `return require('buffer_router'):get_current_buffer()`
    );
    expect(buffer).toEqual(mockBuffer);
  });
  
  test('getCurrentBuffer returns null when no current buffer', async () => {
    const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
    workspace.nvim.lua = jest.fn().mockResolvedValue(null);
    
    const buffer = await bufferRouter.getCurrentBuffer();
    
    expect(workspace.nvim.lua).toHaveBeenCalledWith(
      `return require('buffer_router'):get_current_buffer()`
    );
    expect(buffer).toBeNull();
  });
  
  test('dispose cleans up resources', () => {
    const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
    const mockDisposable = { dispose: jest.fn() };
    
    // Add a mock disposable
    bufferRouter['disposables'].push(mockDisposable);
    
    bufferRouter.dispose();
    
    expect(mockDisposable.dispose).toHaveBeenCalled();
    expect(bufferRouter['disposables']).toEqual([]);
  });

  describe('Reactivity', () => {
    test('should emit events when creating a buffer', async () => {
      // Create a spy for the event emitter
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      const emitSpy = jest.spyOn(bufferRouter['emitter'], 'emit');
      
      // Mock Lua response for buffer creation
      workspace.nvim.lua = jest.fn().mockResolvedValue(mockBufferId);
      
      // Create a buffer
      const id = await bufferRouter.createBuffer(mockPath, { foo: 'bar', baz: 'qux' });
      
      // Verify the event was emitted
      expect(emitSpy).toHaveBeenCalledWith(
        BufferRouter.Events.BUFFER_CREATED,
        expect.objectContaining({
          id: mockBufferId,
          path: mockPath,
          query: expect.objectContaining({ foo: 'bar', baz: 'qux' })
        })
      );
      
      // Verify that refreshCurrentBuffer was called
      expect(workspace.nvim.lua).toHaveBeenCalledWith(
        expect.stringContaining('get_current_buffer')
      );
    });
    
    test('should emit events when switching buffers', async () => {
      // Create a spy for the event emitter
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      const emitSpy = jest.spyOn(bufferRouter['emitter'], 'emit');
      
      // Mock Lua responses
      workspace.nvim.lua = jest.fn()
        .mockImplementation((command) => {
          if (command.includes('switch_buffer')) {
            return Promise.resolve(true);
          } else if (command.includes('get_current_buffer')) {
            return Promise.resolve(mockBuffer2);
          }
          return Promise.resolve(null);
        });
      
      // Switch buffer
      const success = await bufferRouter.switchBuffer(mockBuffer2.id);
      
      // Verify switch was successful
      expect(success).toBe(true);
      
      // Verify events were emitted
      expect(emitSpy).toHaveBeenCalledWith(
        BufferRouter.Events.BUFFER_SWITCHED,
        expect.objectContaining({ identifier: mockBuffer2.id })
      );
      
      // Verify that refreshCurrentBuffer was called
      expect(workspace.nvim.lua).toHaveBeenCalledWith(
        expect.stringContaining('get_current_buffer')
      );
      
      // Verify current buffer changed event was emitted
      expect(emitSpy).toHaveBeenCalledWith(
        BufferRouter.Events.CURRENT_BUFFER_CHANGED,
        expect.objectContaining({
          newBuffer: mockBuffer2
        })
      );
    });
    
    test('should emit events when deleting a buffer', async () => {
      // Create a spy for the event emitter
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      const emitSpy = jest.spyOn(bufferRouter['emitter'], 'emit');
      
      // Mock Lua responses
      workspace.nvim.lua = jest.fn()
        .mockImplementation((command) => {
          if (command.includes('delete_buffer')) {
            return Promise.resolve(true);
          } else if (command.includes('get_current_buffer')) {
            // Return mockBuffer first, then null after deletion
            if (emitSpy.mock.calls.some(call => call[0] === BufferRouter.Events.BUFFER_DELETED)) {
              return Promise.resolve(null);
            }
            return Promise.resolve(mockBuffer);
          }
          return Promise.resolve(null);
        });
      
      // Delete buffer
      const success = await bufferRouter.deleteBuffer(mockBufferId);
      
      // Verify delete was successful
      expect(success).toBe(true);
      
      // Verify events were emitted
      expect(emitSpy).toHaveBeenCalledWith(
        BufferRouter.Events.BUFFER_DELETED,
        expect.objectContaining({ id: mockBufferId })
      );
      
      // Verify that refreshCurrentBuffer was called
      expect(workspace.nvim.lua).toHaveBeenCalledWith(
        expect.stringContaining('get_current_buffer')
      );
    });
    
    test('should emit events when buffer changes are detected', async () => {
      // Create a buffer router instance
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      const emitSpy = jest.spyOn(bufferRouter['emitter'], 'emit');
      
      // Manually setup buffer state for testing
      const oldBuffer = { ...mockBuffer };
      const newBuffer = { ...mockBuffer2 };
      
      // Set initial state
      bufferRouter['currentBuffer'] = oldBuffer;
      
      // Mock getCurrentBuffer to return new state
      workspace.nvim.lua = jest.fn().mockResolvedValue(newBuffer);
      
      // Manually call the refresh method
      await bufferRouter.refreshCurrentBuffer();
      
      // Check if emit was called with the right event
      expect(emitSpy).toHaveBeenCalledWith(
        BufferRouter.Events.CURRENT_BUFFER_CHANGED,
        expect.objectContaining({
          oldBuffer,
          newBuffer
        })
      );
      
      // Verify the current buffer was updated
      expect(bufferRouter.getCurrentBufferSync()).toBe(newBuffer);
    });
    
    test('should support event subscriptions with on() method', () => {
      // Create a buffer router instance
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      
      // Create a mock listener
      const mockListener = jest.fn();
      
      // Subscribe to buffer created events
      const subscription = bufferRouter.on(BufferRouter.Events.BUFFER_CREATED, mockListener);
      
      // Verify that the listener was added
      expect(bufferRouter['emitter'].listenerCount(BufferRouter.Events.BUFFER_CREATED)).toBe(1);
      
      // Manually emit an event
      bufferRouter['emitter'].emit(BufferRouter.Events.BUFFER_CREATED, { id: 'test' });
      
      // Verify listener was called
      expect(mockListener).toHaveBeenCalledWith({ id: 'test' });
      
      // Dispose the subscription
      subscription.dispose();
      
      // Verify the listener was removed
      expect(bufferRouter['emitter'].listenerCount(BufferRouter.Events.BUFFER_CREATED)).toBe(0);
    });
    
    test('should handle errors gracefully during refreshCurrentBuffer', async () => {
      // Create a buffer router instance
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      
      // Store the original getCurrentBuffer method and restore it after the test
      const originalMethod = bufferRouter.getCurrentBuffer;
      
      try {
        // Explicitly override the getCurrentBuffer method to throw an error
        bufferRouter.getCurrentBuffer = jest.fn().mockRejectedValue(new Error('Lua error'));
        
        // Force currentBuffer to be null initially
        bufferRouter['currentBuffer'] = null;
        
        // Attempt to refresh current buffer
        await bufferRouter.refreshCurrentBuffer();
        
        // Verify error was logged
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error refreshing current buffer:',
          expect.any(Error)
        );
        
        // Verify that the operation didn't crash and current buffer remains null
        expect(bufferRouter.getCurrentBufferSync()).toBeNull();
      } finally {
        // Restore the original method after test
        bufferRouter.getCurrentBuffer = originalMethod;
      }
    });
    
    test('hasBufferChanged should detect changes correctly', () => {
      // Create a buffer router instance
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      
      // Test with null values
      expect(bufferRouter['hasBufferChanged'](null, null)).toBe(false);
      expect(bufferRouter['hasBufferChanged'](mockBuffer, null)).toBe(true);
      expect(bufferRouter['hasBufferChanged'](null, mockBuffer)).toBe(true);
      
      // Test with same buffer
      expect(bufferRouter['hasBufferChanged'](mockBuffer, {...mockBuffer})).toBe(false);
      
      // Test with different ID
      expect(bufferRouter['hasBufferChanged'](
        mockBuffer, 
        {...mockBuffer, id: 'different-id'}
      )).toBe(true);
      
      // Test with different path
      expect(bufferRouter['hasBufferChanged'](
        mockBuffer, 
        {...mockBuffer, path: '/different/path'}
      )).toBe(true);
      
      // Test with different query
      expect(bufferRouter['hasBufferChanged'](
        mockBuffer, 
        {...mockBuffer, query: {different: 'query'}}
      )).toBe(true);
    });
    
    test('getCurrentBufferSync returns the cached buffer', async () => {
      // Create a buffer router instance
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      
      // Mock Lua response
      workspace.nvim.lua = jest.fn().mockResolvedValue(mockBuffer);
      
      // Initially, currentBuffer should be null
      expect(bufferRouter.getCurrentBufferSync()).toBeNull();
      
      // Refresh the current buffer
      await bufferRouter.refreshCurrentBuffer();
      
      // Now getCurrentBufferSync should return the cached buffer
      expect(bufferRouter.getCurrentBufferSync()).toEqual(mockBuffer);
      
      // Clear the mock and change its implementation
      workspace.nvim.lua = jest.fn().mockResolvedValue(mockBuffer2);
      
      // getCurrentBufferSync should still return the cached value without making a Lua call
      expect(bufferRouter.getCurrentBufferSync()).toEqual(mockBuffer);
      expect(workspace.nvim.lua).not.toHaveBeenCalled();
    });
  });
});
