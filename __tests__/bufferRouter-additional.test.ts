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

// Create mock event emitter for testing events
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

// Mock context for testing
const mockContext: Partial<ExtensionContext> = {
  subscriptions: [],
  extensionPath: '/path/to/extension',
  asAbsolutePath: jest.fn(),
};

// Mock buffer and buffer 2 for testing
const mockBuffer = {
  id: 'buffer-1',
  path: '/test/path',
  query: { param: 'value' },
  createdAt: Date.now()
};

const mockBuffer2 = {
  id: 'buffer-2',
  path: '/test/path2',
  query: { param: 'value2' },
  createdAt: Date.now()
};

describe('BufferRouter Additional Tests', () => {
  // Console spy setup
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  
  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockClear();
    consoleLogSpy.mockClear();
  });
  
  afterAll(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });
  
  // Run a partial copy of the testBufferRouter function to increase coverage
  describe('Integrated Buffer Operations', () => {
    test('should run a sequence of buffer operations successfully', async () => {
      const router = new BufferRouter(mockContext as ExtensionContext);
      
      // Mock successful Lua calls
      workspace.nvim.lua = jest.fn().mockImplementation((command) => {
        if (command.includes('create_buffer')) {
          return Promise.resolve({
            id: 'test-buffer-id',
            nvimBufferId: 999
          });
        } else if (command.includes('switch_buffer')) {
          return Promise.resolve(true);
        } else if (command.includes('delete_buffer')) {
          return Promise.resolve(true);
        } else if (command.includes('get_current_buffer')) {
          return Promise.resolve({
            id: 'test-buffer-id',
            path: '/test/path',
            query: { test: 'value' },
            createdAt: Date.now(),
            nvimBufferId: 999
          });
        }
        return Promise.resolve(null);
      });
      
      // Run all operations
      const id1 = await router.createBuffer('/test/path1');
      expect(id1).toBe('test-buffer-id');
      
      const id2 = await router.createBuffer('/test/path2', { param: 'value' });
      expect(id2).toBe('test-buffer-id');
      
      const switchResult = await router.switchBuffer(id1 as string);
      expect(switchResult).toBe(true);
      
      const currentBuffer = await router.getCurrentBuffer();
      expect(currentBuffer).not.toBeNull();
      expect(currentBuffer?.id).toBe('test-buffer-id');
      
      const deleteResult = await router.deleteBuffer(id1 as string);
      expect(deleteResult).toBe(true);
      
      // Cleanup
      router.dispose();
    });
    
    test('should handle error conditions in buffer operations', async () => {
      const router = new BufferRouter(mockContext as ExtensionContext);
      
      // First call succeeds, subsequent calls fail
      let callCount = 0;
      workspace.nvim.lua = jest.fn().mockImplementation((command) => {
        callCount++;
        if (callCount === 1) {
          // For createBuffer, return the expected object format with id
          return Promise.resolve({ id: 'test-buffer-id', nvimBufferId: 123 });
        } else {
          return Promise.reject(new Error('Lua method error'));
        }
      });
      
      // Create buffer should succeed
      const id = await router.createBuffer('/test/path');
      expect(id).toBe('test-buffer-id');
      
      // Switch buffer should fail but not throw
      const switchResult = await router.switchBuffer(id as string);
      expect(switchResult).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error switching buffer'),
        expect.any(Error)
      );
      
      // Reset call count to test delete failure
      callCount = 0;
      const deleteResult = await router.deleteBuffer(id as string);
      expect(deleteResult).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error deleting buffer'),
        expect.any(Error)
      );
      
      router.dispose();
    });
  });

  describe('Event Listener Setup', () => {
    test('should setup event listeners for buffer changes', () => {
      // Create a buffer router instance
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      
      // Verify event subscription was set up
      expect(cocMock.events.on).toHaveBeenCalledWith(
        'BufEnter',
        expect.any(Function),
        null,
        mockContext.subscriptions
      );
      
      // Verify disposable was added
      expect(bufferRouter['disposables'].length).toBeGreaterThan(0);
    });
    
    test('should clean up all event listeners when disposed', () => {
      // Create a buffer router instance
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      
      // Add some mock disposables
      const mockDisposable1 = { dispose: jest.fn() };
      const mockDisposable2 = { dispose: jest.fn() };
      bufferRouter['disposables'].push(mockDisposable1, mockDisposable2);
      
      // Call dispose
      bufferRouter.dispose();
      
      // Verify all disposables were called
      expect(mockDisposable1.dispose).toHaveBeenCalled();
      expect(mockDisposable2.dispose).toHaveBeenCalled();
      
      // Verify disposables were cleared
      expect(bufferRouter['disposables']).toEqual([]);
    });
  });

  describe('Buffer Management Tests', () => {
    test('should get current buffer through public method', async () => {
      // Setup
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      
      // Mock the Lua call to return a buffer
      workspace.nvim.lua = jest.fn().mockResolvedValue(mockBuffer);
      
      // Test getting current buffer
      const result = await bufferRouter.getCurrentBuffer();
      expect(result).toEqual(mockBuffer);
    });
    
    test('should handle switching to a buffer by ID', async () => {
      // Setup
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      const emitSpy = jest.spyOn(bufferRouter['emitter'], 'emit');
      
      // Mock success response from Lua
      workspace.nvim.lua = jest.fn().mockResolvedValue(true);
      
      // Test switching buffer by ID
      const success = await bufferRouter.switchBuffer('test-buffer-id');
      
      // Verify the Lua call was made with the right arguments
      expect(workspace.nvim.lua).toHaveBeenCalledWith(
        expect.stringContaining("return require('buffer_router'):switch_buffer('test-buffer-id')")
      );
      
      // Verify the result and event emission
      expect(success).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(
        BufferRouter.Events.BUFFER_SWITCHED,
        expect.objectContaining({ identifier: 'test-buffer-id' })
      );
    });
    
    test('should create a buffer with query parameters', async () => {
      // Setup
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      const emitSpy = jest.spyOn(bufferRouter['emitter'], 'emit');
      const mockQueryObj = { param1: 'value1', param2: 'value2' };
      const expectedQueryString = 'param1=value1&param2=value2';
      
      // Mock Lua to return a buffer ID in the expected format
      workspace.nvim.lua = jest.fn().mockResolvedValue({ id: 'new-buffer-id', nvimBufferId: 456 });
      
      // Call createBuffer with path and query
      const result = await bufferRouter.createBuffer('/test/path', mockQueryObj);
      
      // Verify Lua was called with the right arguments
      expect(workspace.nvim.lua).toHaveBeenCalledWith(
        expect.stringContaining("return require('buffer_router'):create_buffer('/test/path', {param1 = 'value1', param2 = 'value2'})")
      );
      
      // Verify result and event emission
      expect(result).toBe('new-buffer-id');
      expect(emitSpy).toHaveBeenCalledWith(
        BufferRouter.Events.BUFFER_CREATED,
        expect.objectContaining({
          id: 'new-buffer-id',
          path: '/test/path',
          query: mockQueryObj
        })
      );
    });
  });

  describe('Fallback Mechanisms', () => {
    test('should handle errors if events API is not available', () => {
      // Temporarily replace events.on with undefined to simulate missing API
      const originalEventsOn = cocMock.events.on;
      cocMock.events.on = undefined as any;
      
      // Create a buffer router instance - should use polling fallback
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      
      // Verify fallback logging
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Events API not available'));
      
      // Restore original method
      cocMock.events.on = originalEventsOn;
      
      // Clean up any interval
      bufferRouter.dispose();
    });
    
    test('should handle errors during call to switchBuffer', async () => {
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      
      // Mock the Lua call to throw an error
      workspace.nvim.lua = jest.fn().mockRejectedValue(new Error('Lua method error'));
      
      // Call switchBuffer which shouldn't throw but return false on error
      const result = await bufferRouter.switchBuffer('test-buffer-id');
      
      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error switching buffer'),
        expect.any(Error)
      );
      
      // Verify method returns false on error
      expect(result).toBe(false);
    });
    
    test('should handle errors during call to deleteBuffer', async () => {
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      
      // Mock the Lua call to throw an error
      workspace.nvim.lua = jest.fn().mockRejectedValue(new Error('Lua method error'));
      
      // Call deleteBuffer which shouldn't throw but return false on error
      const result = await bufferRouter.deleteBuffer('test-buffer-id');
      
      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error deleting buffer'),
        expect.any(Error)
      );
      
      // Verify method returns false on error
      expect(result).toBe(false);
    });
  });
  
  describe('Buffer State Management', () => {
    test('getCurrentBufferSync should return current buffer', () => {
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      
      // Set a mock current buffer
      bufferRouter['currentBuffer'] = mockBuffer;
      
      // Verify getCurrentBufferSync returns the current buffer
      expect(bufferRouter.getCurrentBufferSync()).toBe(mockBuffer);
      
      // Change current buffer
      bufferRouter['currentBuffer'] = mockBuffer2;
      
      // Verify it returns the updated buffer
      expect(bufferRouter.getCurrentBufferSync()).toBe(mockBuffer2);
      
      // Test with null buffer
      bufferRouter['currentBuffer'] = null;
      expect(bufferRouter.getCurrentBufferSync()).toBeNull();
    });
    
    test('hasBufferChanged correctly identifies buffer changes', () => {
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      
      // Test same buffers (no change)
      const sameBuffer1 = { ...mockBuffer };
      const sameBuffer2 = { ...mockBuffer };
      expect(bufferRouter['hasBufferChanged'](sameBuffer1, sameBuffer2)).toBe(false);
      
      // Test both null (no change)
      expect(bufferRouter['hasBufferChanged'](null, null)).toBe(false);
      
      // Test one null, one not null (change)
      expect(bufferRouter['hasBufferChanged'](null, mockBuffer)).toBe(true);
      expect(bufferRouter['hasBufferChanged'](mockBuffer, null)).toBe(true);
      
      // Test different ID (change)
      const differentIdBuffer = { ...mockBuffer, id: 'different-id' };
      expect(bufferRouter['hasBufferChanged'](mockBuffer, differentIdBuffer)).toBe(true);
      
      // Test different path (change)
      const differentPathBuffer = { ...mockBuffer, path: '/different/path' };
      expect(bufferRouter['hasBufferChanged'](mockBuffer, differentPathBuffer)).toBe(true);
      
      // Test different query (change)
      const differentQueryBuffer = { ...mockBuffer, query: { different: 'query' } };
      expect(bufferRouter['hasBufferChanged'](mockBuffer, differentQueryBuffer)).toBe(true);
    });
  });
  
  describe('Event Emission and Subscription', () => {
    test('should emit events on buffer creation', async () => {
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      const emitSpy = jest.spyOn(bufferRouter['emitter'], 'emit');
      
      // Mock Lua to return buffer ID in the expected format
      workspace.nvim.lua = jest.fn().mockImplementation((command) => {
        if (command.includes('create_buffer')) {
          return Promise.resolve({ id: 'test-buffer-id', nvimBufferId: 123 });
        }
        return Promise.resolve(null);
      });
      
      // Create buffer
      await bufferRouter.createBuffer('/test/path', { foo: 'bar' });
      
      // Check event was emitted
      expect(emitSpy).toHaveBeenCalledWith(
        BufferRouter.Events.BUFFER_CREATED,
        expect.objectContaining({
          id: 'test-buffer-id',
          path: '/test/path',
          query: { foo: 'bar' }
        })
      );
      
      bufferRouter.dispose();
    });
    
    test('should emit events on buffer change', async () => {
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      const emitSpy = jest.spyOn(bufferRouter['emitter'], 'emit');
      
      // Set initial buffer
      bufferRouter['currentBuffer'] = mockBuffer;
      
      // Mock getCurrentBuffer to return different buffer
      workspace.nvim.lua = jest.fn().mockResolvedValue(mockBuffer2);
      
      // Refresh buffer
      await bufferRouter.refreshCurrentBuffer();
      
      // Check event was emitted with old and new buffer
      expect(emitSpy).toHaveBeenCalledWith(
        BufferRouter.Events.CURRENT_BUFFER_CHANGED,
        expect.objectContaining({
          // Don't check specific values, just verify the structure
          oldBuffer: mockBuffer,
          newBuffer: null
        })
      );
      
      // It should also be called a second time with different values
      expect(emitSpy).toHaveBeenCalledWith(
        BufferRouter.Events.CURRENT_BUFFER_CHANGED,
        expect.objectContaining({
          oldBuffer: null,
          newBuffer: expect.objectContaining({
            id: mockBuffer2.id
          })
        })
      );
      
      bufferRouter.dispose();
    });
    
    test('should allow subscribing to events with on method', () => {
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      const mockListener = jest.fn();
      
      // Subscribe to event
      const disposable = bufferRouter.on(BufferRouter.Events.BUFFER_CREATED, mockListener);
      
      // Emit event manually
      bufferRouter['emitter'].emit(BufferRouter.Events.BUFFER_CREATED, { id: 'test' });
      
      // Verify listener was called
      expect(mockListener).toHaveBeenCalledWith({ id: 'test' });
      
      // Unsubscribe
      disposable.dispose();
      
      // Emit again
      bufferRouter['emitter'].emit(BufferRouter.Events.BUFFER_CREATED, { id: 'test2' });
      
      // Verify listener wasn't called again
      expect(mockListener).toHaveBeenCalledTimes(1);
      
      bufferRouter.dispose();
    });
    
    test('should handle errors during refreshCurrentBuffer gracefully', async () => {
      const bufferRouter = new BufferRouter(mockContext as ExtensionContext);
      
      // Mock getCurrentBuffer to throw error
      workspace.nvim.lua = jest.fn().mockRejectedValue(new Error('Get buffer error'));
      
      // Should not throw
      await expect(bufferRouter.refreshCurrentBuffer()).resolves.not.toThrow();
      
      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error refreshing current buffer'),
        expect.any(Error)
      );
      
      bufferRouter.dispose();
    });
  });
});
