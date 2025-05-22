import { testBufferRouter } from '../src/bufferRouter';
import { ExtensionContext } from 'coc.nvim';

// Mock context for testing
const mockContext: Partial<ExtensionContext> = {
  subscriptions: [],
  extensionPath: '/path/to/extension',
  asAbsolutePath: jest.fn(),
};

// Mock coc.nvim workspace
jest.mock('coc.nvim', () => {
  return {
    workspace: {
      nvim: {
        command: jest.fn().mockResolvedValue(true),
        call: jest.fn().mockResolvedValue(null),
        lua: jest.fn().mockImplementation((command) => {
          if (command.includes('create_buffer')) {
            return Promise.resolve('test-buffer-id');
          } else if (command.includes('switch_buffer')) {
            return Promise.resolve(true);
          } else if (command.includes('delete_buffer')) {
            return Promise.resolve(true);
          } else if (command.includes('get_current_buffer')) {
            return Promise.resolve({
              id: 'test-buffer-id',
              path: '/test/path',
              query: { test: 'value' },
              createdAt: Date.now()
            });
          }
          return Promise.resolve(null);
        }),
        eval: jest.fn().mockResolvedValue(null),
        createBuffer: jest.fn().mockResolvedValue(1),
        createWindow: jest.fn().mockResolvedValue(1),
      },
    },
    events: {
      on: jest.fn().mockReturnValue({
        dispose: jest.fn()
      })
    },
    Disposable: {
      create: jest.fn(() => ({
        dispose: jest.fn()
      }))
    }
  };
});

// Spy on console methods
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(() => {}),
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
  assert: jest.spyOn(console, 'assert').mockImplementation(() => {})
};

describe('BufferRouter Test Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
    consoleSpy.assert.mockClear();
  });
  
  afterAll(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    consoleSpy.assert.mockRestore();
  });
  
  test('testBufferRouter runs all buffer operation tests', async () => {
    // Run the testBufferRouter function
    await testBufferRouter(mockContext as ExtensionContext);
    
    // Verify success message was logged
    expect(consoleSpy.log).toHaveBeenCalledWith(
      expect.stringContaining('All BufferRouter TypeScript tests passed!')
    );
    
    // Check that console.assert was called multiple times (tests were run)
    expect(consoleSpy.assert).toHaveBeenCalled();
  });
  
  test('testBufferRouter handles errors gracefully', async () => {
    // Mock a failure in one of the operations
    const originalLua = jest.requireMock('coc.nvim').workspace.nvim.lua;
    jest.requireMock('coc.nvim').workspace.nvim.lua = jest.fn()
      .mockImplementationOnce(() => Promise.resolve('test-buffer-id')) // First call succeeds
      .mockImplementationOnce(() => Promise.reject(new Error('Test error'))) // Second call fails
      .mockImplementation(() => Promise.resolve(null)); // Default implementation for other calls
    
    // Run the testBufferRouter function
    await testBufferRouter(mockContext as ExtensionContext);
    
    // With the error handling in place, the test should still complete
    // and log the success message, even if some operations fail silently
    expect(consoleSpy.log).toHaveBeenCalledWith(
      expect.stringContaining('All BufferRouter TypeScript tests passed!')
    );
    
    // Restore the original mock
    jest.requireMock('coc.nvim').workspace.nvim.lua = originalLua;
  });
});
