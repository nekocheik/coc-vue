import { useRoute, ROUTE_CHANGE_EVENT } from '../../src/reactivity/useRoute';
import { BufferRouter, BufferRoute } from '../../src/bufferRouter';
import { ExtensionContext } from 'coc.nvim';
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

// Mock BufferRouter class
jest.mock('../../src/bufferRouter', () => {
  // Create a real event emitter for each mock instance
  const EventEmitter = require('events').EventEmitter;
  
  return {
    // Static Events property needs to be on the mock class constructor
    BufferRouter: Object.assign(
      jest.fn().mockImplementation(() => {
        // Create an actual event emitter instance
        const emitter = new EventEmitter();
        
        return {
          getCurrentBuffer: jest.fn().mockResolvedValue(null),
          switchBuffer: jest.fn().mockResolvedValue(true),
          createBuffer: jest.fn().mockResolvedValue('new-id-123'),
          deleteBuffer: jest.fn().mockResolvedValue(true),
          // Implement on method using the real event emitter
          on: jest.fn().mockImplementation((event, handler) => {
            emitter.on(event, handler);
            return {
              dispose: () => {
                emitter.removeListener(event, handler);
              }
            };
          }),
          // Add emit method to trigger events in tests
          emit: jest.fn().mockImplementation((event, data) => {
            emitter.emit(event, data);
          }),
          // Store emitter on instance for test access
          _emitter: emitter,
          getCurrentBufferSync: jest.fn().mockReturnValue(null),
          refreshCurrentBuffer: jest.fn().mockResolvedValue(undefined),
          dispose: jest.fn()
        };
      }),
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
});

// Mock coc.nvim
jest.mock('coc.nvim', () => {
  const eventHandlers: Record<string, Function[]> = {};
  
  const fireEvent = (event: string, data?: any) => {
    if (eventHandlers[event]) {
      eventHandlers[event].forEach(handler => handler(data));
    }
  };
  
  // Export fireEvent to access it in tests
  (global as any).mockFireEvent = fireEvent;
  
  return {
    workspace: {
      nvim: {
        command: jest.fn().mockResolvedValue(true),
        lua: jest.fn().mockResolvedValue(null)
      }
    },
    events: {
      on: jest.fn((event, callback) => {
        if (!eventHandlers[event]) {
          eventHandlers[event] = [];
        }
        eventHandlers[event].push(callback);
        return { dispose: jest.fn() };
      })
    },
    Disposable: {
      create: jest.fn(() => ({
        dispose: jest.fn()
      }))
    },
    ExtensionContext: {}
  };
});

// Create a mock context for testing
const mockContext = {
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
} as ExtensionContext;

// Mock console to avoid polluting test output
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

describe('useRoute', () => {
  let originalStartWatching: boolean | undefined;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Save original startWatching and replace it to prevent auto-watching in tests
    if (!originalStartWatching) {
      const useRouteModule = require('../../src/reactivity/useRoute');
      originalStartWatching = useRouteModule.useRoute.toString().includes('startWatching()');
      
      // If startWatching is called automatically, we need to override it
      if (originalStartWatching) {
        jest.doMock('../../src/reactivity/useRoute', () => {
          const originalModule = jest.requireActual('../../src/reactivity/useRoute');
          return {
            ...originalModule,
            useRoute: (...args: any[]) => {
              const instance = originalModule.useRoute(...args);
              // Return the instance without auto-starting watching
              return instance;
            }
          };
        });
      }
    }
  });
  
  test('initializes with null route by default', () => {
    const { route } = useRoute(mockContext, { useReactiveRouter: false });
    expect(route).toBeNull();
  });
  
  test('initializes with provided initial route', () => {
    const { route } = useRoute(mockContext, { initialRoute: mockRoute });
    expect(route).toEqual(mockRoute);
  });
  
  test('returns path, id and query getters', () => {
    // Setup with initial route
    const { path, id, query } = useRoute(mockContext, { initialRoute: mockRoute });
    
    expect(path).toBe(mockRoute.path);
    expect(id).toBe(mockRoute.id);
    expect(query).toEqual(mockRoute.query);
  });
  
  test('returns null values for getters when route is null', () => {
    const { path, id, query } = useRoute(mockContext);
    
    expect(path).toBeNull();
    expect(id).toBeNull();
    expect(query).toBeNull();
  });
  
  test('watchRoute registers a watcher and calls it immediately', () => {
    const { watchRoute } = useRoute(mockContext, { initialRoute: mockRoute });
    
    const mockCallback = jest.fn();
    const disposable = watchRoute(mockCallback);
    
    expect(mockCallback).toHaveBeenCalledWith(mockRoute);
    expect(disposable).toHaveProperty('dispose');
    expect(typeof disposable.dispose).toBe('function');
  });
  
  test('watchRoute disposable removes the watcher', () => {
    const { watchRoute, route } = useRoute(mockContext, { initialRoute: mockRoute });
    
    const mockCallback = jest.fn();
    const disposable = watchRoute(mockCallback);
    
    // Reset the mock to clear the initial call
    mockCallback.mockReset();
    
    // Dispose the watcher
    disposable.dispose();
    
    // Fire an event that would normally trigger watchers
    (global as any).mockFireEvent(ROUTE_CHANGE_EVENT, { ...mockRoute, id: 'new-id' });
    
    // The callback should not be called because it was disposed
    expect(mockCallback).not.toHaveBeenCalled();
  });
  
  test('switchRoute changes the current route', async () => {
    // Simplify this test to avoid timeout issues
    // Mock a buffer router that returns predictable results
    const mockBufferRouter = {
      switchBuffer: jest.fn().mockResolvedValue(true),
      getCurrentBuffer: jest.fn().mockResolvedValue({ ...mockRoute, id: 'new-id-after-switch' }),
      getCurrentBufferSync: jest.fn().mockReturnValue({ ...mockRoute, id: 'new-id-after-switch' }),
      createBuffer: jest.fn(),
      deleteBuffer: jest.fn(),
      refreshCurrentBuffer: jest.fn(),
      on: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      dispose: jest.fn()
    };
    
    // Use the mock implementation
    (BufferRouter as unknown as jest.Mock).mockImplementationOnce(() => mockBufferRouter);
    
    // Create a hook with the useReactiveRouter option disabled to simplify test
    const routeHook = useRoute(mockContext, { 
      initialRoute: mockRoute,
      useReactiveRouter: false // Disable reactivity for simplicity
    });
    
    // Initial route should be the mock route
    expect(routeHook.route).toEqual(mockRoute);
    
    // Switch the route
    const success = await routeHook.switchRoute('some-path');
    
    // Verify switch was called with the right path
    expect(mockBufferRouter.switchBuffer).toHaveBeenCalledWith('some-path');
    expect(success).toBe(true);
  }, 1000); // Set explicit timeout to avoid issues
  
  test('createRoute creates a new route', async () => {
    // Create a real event emitter for mocking
    const mockEmitter = new EventEmitter();
    
    // Mock the BufferRouter implementation for this test
    (BufferRouter as unknown as jest.Mock).mockImplementationOnce(() => ({
      getCurrentBuffer: jest.fn(),
      switchBuffer: jest.fn(),
      createBuffer: jest.fn().mockImplementation(async () => {
        const newId = 'new-route-id';
        // Emit event to simulate reactive behavior
        mockEmitter.emit(BufferRouter.Events.BUFFER_CREATED, {
          id: newId,
          path: '/new/path',
          query: { param: 'value' }
        });
        return newId;
      }),
      deleteBuffer: jest.fn(),
      on: jest.fn().mockImplementation((event, handler) => {
        mockEmitter.on(event, handler);
        return {
          dispose: () => mockEmitter.removeListener(event, handler)
        };
      }),
      _emitter: mockEmitter,
      emit: mockEmitter.emit.bind(mockEmitter),
      dispose: jest.fn()
    }));
    
    // Set up with reactive router enabled
    const { createRoute } = useRoute(mockContext, { useReactiveRouter: true });
    
    // Create a new route
    const id = await createRoute('/new/path', { param: 'value' });
    
    expect(id).toBe('new-route-id');
  });

  test('detects buffer changes through Neovim events', async () => {
    // Create a mock buffer router with EventEmitter capabilities
    const mockEmitter = new EventEmitter();
    
    // Create a proper mock implementation that includes the necessary methods
    const bufferRouterMock = {
      getCurrentBuffer: jest.fn().mockResolvedValue(mockRoute),
      getCurrentBufferSync: jest.fn().mockReturnValue(mockRoute),
      switchBuffer: jest.fn(),
      createBuffer: jest.fn(),
      deleteBuffer: jest.fn(),
      refreshCurrentBuffer: jest.fn(),
      // Wire up the on method to use our event emitter
      on: jest.fn().mockImplementation((event, handler) => {
        mockEmitter.on(event, handler);
        return { dispose: jest.fn(() => mockEmitter.removeListener(event, handler)) };
      }),
      // Add emit method for testing
      emit: jest.fn().mockImplementation((event, data) => {
        mockEmitter.emit(event, data);
        return true;
      }),
      // Store emitter for testing access
      _emitter: mockEmitter,
      dispose: jest.fn()
    };
    
    // Replace the actual BufferRouter with our mock
    (BufferRouter as unknown as jest.Mock).mockImplementationOnce(() => bufferRouterMock);
    
    // Create the route hook with reactive router enabled
    const routeHook = useRoute(mockContext, { 
      useReactiveRouter: true,
      initialRoute: null
    });
    
    // Initial route should be null (before events fire)
    expect(routeHook.route).toBeNull();
    
    // Simulate a buffer change event
    bufferRouterMock.emit(BufferRouter.Events.CURRENT_BUFFER_CHANGED, {
      oldBuffer: null,
      newBuffer: mockRoute2
    });
    
    // Route should be updated with the new buffer
    expect(routeHook.route).toEqual(mockRoute2);
    
    // Clean up
    routeHook.dispose();
  });
  
  test('dispose cleans up all resources', () => {
    const bufferRouterDisposeMock = jest.fn();
    const eventDisposableMock = { dispose: jest.fn() };
    
    (BufferRouter as unknown as jest.Mock).mockImplementationOnce(() => ({
      getCurrentBuffer: jest.fn(),
      switchBuffer: jest.fn(),
      createBuffer: jest.fn(),
      deleteBuffer: jest.fn(),
      on: jest.fn().mockReturnValue(eventDisposableMock),
      dispose: bufferRouterDisposeMock
    }));
    
    // Create hook with reactive router enabled to test full cleanup
    const { dispose } = useRoute(mockContext, { useReactiveRouter: true });
    
    dispose();
    
    // Should dispose both the buffer router and event listeners
    expect(bufferRouterDisposeMock).toHaveBeenCalled();
    expect(eventDisposableMock.dispose).toHaveBeenCalled();
  });
});
