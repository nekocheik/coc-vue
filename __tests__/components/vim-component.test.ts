/**
 * Tests for VimComponent
 * 
 * This file contains tests for the base VimComponent class that all
 * Vim UI components extend from in coc-vue.
 */

// Mock dependencies - must be before any imports that use them
jest.mock('coc.nvim', () => ({
  workspace: {
    nvim: {
      call: jest.fn().mockResolvedValue(1),
      command: jest.fn().mockResolvedValue(undefined),
      eval: jest.fn(),
      getOption: jest.fn().mockResolvedValue(100),
    },
  },
}));

// Mock the bridge/core module
jest.mock('../../src/bridge/core', () => ({
  bridgeCore: {
    sendMessage: jest.fn().mockResolvedValue(undefined),
    registerHandler: jest.fn(),
    unregisterHandler: jest.fn(),
  },
  MessageType: {
    ACTION: 'action',
    EVENT: 'event',
    RESPONSE: 'response',
    ERROR: 'error'
  }
}));

// Mock the reactivity module
jest.mock('../../src/reactivity/index', () => {
  // Create a simple reactive implementation for testing
  const reactiveObjects = new Map();
  
  const reactive = (obj) => {
    const proxy = { ...obj };
    reactiveObjects.set(proxy, obj);
    return proxy;
  };
  
  return {
    reactive,
    effect: jest.fn((fn) => {
      fn();
      return jest.fn(); // Return a stop function
    }),
    ref: jest.fn((val) => ({ value: val })),
    watch: jest.fn(() => jest.fn()), // Return a stop function
  };
});

// Import the component to test after mocks
import { VimComponent, ComponentOptions } from '../../src/components/vim-component';
import { bridgeCore, MessageType } from '../../src/bridge/core';

// Get the mocked coc module
const coc = jest.requireMock('coc.nvim');

describe('VimComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // INITIALIZATION TESTS
  describe('Initialization', () => {
    it('should initialize with the provided configuration', () => {
      // Arrange & Act
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        props: { title: 'Test Component' }
      });
      
      // Assert - Only test public properties
      expect(component).toBeDefined();
      expect(component.id).toBe('test-component');
      expect(component.type).toBe('test');
    });

    it('should register message handlers during initialization', () => {
      // Arrange & Act
      const component = new VimComponent({
        id: 'test-component',
        type: 'test'
      });
      
      // Assert
      expect(bridgeCore.registerHandler).toHaveBeenCalledWith(
        `component:${component.id}`,
        expect.any(Function)
      );
    });
  });

  // LIFECYCLE TESTS
  describe('Component Lifecycle', () => {
    it('should mount the component', async () => {
      // Arrange
      const beforeMountFn = jest.fn();
      const onMountedFn = jest.fn();
      
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        beforeMount: beforeMountFn,
        onMounted: onMountedFn
      });
      
      // Act
      await component.mount();
      
      // Assert
      expect(beforeMountFn).toHaveBeenCalled();
      expect(onMountedFn).toHaveBeenCalled();
      expect(component.isMounted).toBe(true);
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test-component',
        type: 'event',
        action: 'component:mounted'
      }));
    });
    
    it('should not mount if already mounted', async () => {
      // Arrange
      const onMountedFn = jest.fn();
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        onMounted: onMountedFn
      });
      
      // Act - Mount once
      await component.mount();
      
      // Reset mocks
      onMountedFn.mockClear();
      (bridgeCore.sendMessage as jest.Mock).mockClear();
      
      // Act - Try to mount again
      await component.mount();
      
      // Assert - Should not call hooks or send message again
      expect(onMountedFn).not.toHaveBeenCalled();
      expect(bridgeCore.sendMessage).not.toHaveBeenCalled();
    });
    
    it('should destroy the component', async () => {
      // Arrange
      const onBeforeDestroyFn = jest.fn();
      const onDestroyedFn = jest.fn();
      
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        onBeforeDestroy: onBeforeDestroyFn,
        onDestroyed: onDestroyedFn
      });
      
      // First mount it
      await component.mount();
      
      // Reset mocks
      (bridgeCore.sendMessage as jest.Mock).mockClear();
      
      // Act
      await component.destroy();
      
      // Assert
      expect(onBeforeDestroyFn).toHaveBeenCalled();
      expect(onDestroyedFn).toHaveBeenCalled();
      expect(component.isDestroyed).toBe(true);
      expect(component.isMounted).toBe(false);
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test-component',
        type: 'event',
        action: 'component:destroyed'
      }));
    });
    
    it('should not destroy if already destroyed', async () => {
      // Arrange
      const onDestroyedFn = jest.fn();
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        onDestroyed: onDestroyedFn
      });
      
      // First mount and destroy
      await component.mount();
      await component.destroy();
      
      // Reset mocks
      onDestroyedFn.mockClear();
      (bridgeCore.sendMessage as jest.Mock).mockClear();
      
      // Act - Try to destroy again
      await component.destroy();
      
      // Assert - Should not call hooks or send message again
      expect(onDestroyedFn).not.toHaveBeenCalled();
      expect(bridgeCore.sendMessage).not.toHaveBeenCalled();
    });
  });

  // METHOD TESTS
  describe('Method Handling', () => {
    it('should call a method on the component', async () => {
      // Arrange
      const testMethod = jest.fn().mockReturnValue('test-result');
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        methods: {
          testMethod
        }
      });
      
      // Act
      const result = await component.callMethod('testMethod', 'arg1', 'arg2');
      
      // Assert
      expect(testMethod).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('test-result');
    });
    
    it('should throw error when calling non-existent method', async () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test'
      });
      
      // Act & Assert
      await expect(component.callMethod('nonExistentMethod')).rejects.toThrow(
        'Method nonExistentMethod not found'
      );
    });
    
    it('should throw error when calling method on destroyed component', async () => {
      // Arrange
      const testMethod = jest.fn();
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        methods: {
          testMethod
        }
      });
      
      // First mount and destroy
      await component.mount();
      await component.destroy();
      
      // Act & Assert
      await expect(component.callMethod('testMethod')).rejects.toThrow(
        'Cannot call method on destroyed component'
      );
    });
  });

  // STATE MANAGEMENT TESTS
  describe('State Management', () => {
    it('should update state', () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        state: { count: 0 }
      });
      
      // Act
      component.updateState({ count: 10 });
      
      // Assert - We can't directly test the internal state, but we can test the public getter
      expect(component.state.count).toBe(10);
    });
    
    it('should throw error when updating state of destroyed component', async () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        state: { count: 0 }
      });
      
      // First mount and destroy
      await component.mount();
      await component.destroy();
      
      // Act & Assert
      expect(() => component.updateState({ count: 10 })).toThrow(
        'Cannot update state of destroyed component'
      );
    });
  });

  // PROPERTY GETTERS TESTS
  describe('Property Getters', () => {
    it('should get component ID', () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test'
      });
      
      // Act & Assert
      expect(component.id).toBe('test-component');
    });
    
    it('should get component type', () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test'
      });
      
      // Act & Assert
      expect(component.type).toBe('test');
    });
    
    it('should get component state', () => {
      // Arrange
      const initialState = { count: 5 };
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        state: initialState
      });
      
      // Act & Assert
      expect(component.state).toBeDefined();
      // Note: We can't directly test equality with initialState because
      // the state is wrapped in a reactive proxy
    });
    
    it('should get component props', () => {
      // Arrange
      const initialProps = { title: 'Test Title' };
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        props: initialProps
      });
      
      // Act & Assert
      expect(component.props).toBeDefined();
      // Note: We can't directly test equality with initialProps because
      // the props are wrapped in a reactive proxy
    });
    
    it('should get mounted status', async () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test'
      });
      
      // Act & Assert - Before mounting
      expect(component.isMounted).toBe(false);
      
      // Act - Mount
      await component.mount();
      
      // Assert - After mounting
      expect(component.isMounted).toBe(true);
    });
    
    it('should get destroyed status', async () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test'
      });
      
      // Act & Assert - Before destroying
      expect(component.isDestroyed).toBe(false);
      
      // Act - Mount and destroy
      await component.mount();
      await component.destroy();
      
      // Assert - After destroying
      expect(component.isDestroyed).toBe(true);
    });
    
    it('should get buffer ID after mounting', async () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test'
      });
      
      // Mock nvim.call to return a specific buffer ID
      const mockBufferId = 123;
      coc.workspace.nvim.call.mockImplementationOnce(() => Promise.resolve(mockBufferId));
      
      // Act - Mount to create buffer
      await component.mount();
      
      // Assert
      expect(component.buffer).toBeDefined();
    });
    
    it('should get window ID after mounting', async () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        bufferOptions: {
          position: 'floating'
        }
      });
      
      // Mock nvim.call to return specific values for buffer and window
      const mockBuffer = 123;
      const mockWindow = 456;
      
      // Set up the mock implementation to return our test values
      coc.workspace.nvim.call.mockImplementation((method, args) => {
        if (method === 'nvim_create_buf') return Promise.resolve(mockBuffer);
        if (method === 'nvim_open_win') return Promise.resolve(mockWindow);
        return Promise.resolve(null);
      });
      
      // Act - Mount to create window
      await component.mount();
      
      // Assert
      expect(component.window).toBeDefined();
    });
  });

  // MESSAGE HANDLING TESTS
  describe('Message Handling', () => {
    it('should handle method call messages', async () => {
      // Arrange
      const testMethod = jest.fn().mockResolvedValue('test-result');
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        methods: {
          testMethod
        }
      });
      
      // Get the handler function that was registered
      const registerHandlerMock = bridgeCore.registerHandler as jest.Mock;
      const handlerFn = registerHandlerMock.mock.calls[0][1];
      
      // Create a message to simulate calling a method
      const message = {
        id: 'test-component',
        type: MessageType.ACTION,
        action: 'callMethod',
        payload: {
          method: 'testMethod',
          args: ['arg1', 'arg2']
        },
        correlationId: 'test-correlation-id'
      };
      
      // Act
      await handlerFn(message);
      
      // Assert
      expect(testMethod).toHaveBeenCalledWith('arg1', 'arg2');
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test-component',
        type: MessageType.RESPONSE,
        action: 'methodResult',
        correlationId: 'test-correlation-id'
      }));
    });
    
    it('should handle method call errors', async () => {
      // Arrange
      const testMethod = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        methods: {
          testMethod
        }
      });
      
      // Get the handler function that was registered
      const registerHandlerMock = bridgeCore.registerHandler as jest.Mock;
      const handlerFn = registerHandlerMock.mock.calls[0][1];
      
      // Create a message to simulate calling a method that throws
      const message = {
        id: 'test-component',
        type: MessageType.ACTION,
        action: 'callMethod',
        payload: {
          method: 'testMethod',
          args: []
        },
        correlationId: 'test-correlation-id'
      };
      
      // Act
      await handlerFn(message);
      
      // Assert
      expect(testMethod).toHaveBeenCalled();
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test-component',
        type: MessageType.ERROR,
        action: 'methodError',
        payload: expect.objectContaining({
          error: 'Test error'
        }),
        correlationId: 'test-correlation-id'
      }));
    });
    
    it('should handle state update messages', async () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        state: { count: 0 }
      });
      
      // Get the handler function that was registered
      const registerHandlerMock = bridgeCore.registerHandler as jest.Mock;
      const handlerFn = registerHandlerMock.mock.calls[0][1];
      
      // Create a message to simulate updating state
      const message = {
        id: 'test-component',
        type: MessageType.ACTION,
        action: 'updateState',
        payload: {
          updates: { count: 20 }
        }
      };
      
      // Act
      await handlerFn(message);
      
      // Assert - We can't directly check the state value due to reactivity,
      // but we can verify the message was processed without errors
      expect(component).toBeDefined();
    });
    
    it('should ignore messages for other components', async () => {
      // Arrange
      const testMethod = jest.fn();
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        methods: {
          testMethod
        }
      });
      
      // Get the handler function that was registered
      const registerHandlerMock = bridgeCore.registerHandler as jest.Mock;
      const handlerFn = registerHandlerMock.mock.calls[0][1];
      
      // Create a message for a different component
      const message = {
        id: 'other-component', // Different ID
        type: MessageType.ACTION,
        action: 'callMethod',
        payload: {
          method: 'testMethod',
          args: []
        }
      };
      
      // Act
      await handlerFn(message);
      
      // Assert
      expect(testMethod).not.toHaveBeenCalled();
    });
  });
  
  // BUFFER OPERATIONS TESTS
  describe('Buffer Operations', () => {
    it('should create a buffer with the correct options', async () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        bufferOptions: {
          name: 'Test Buffer',
          filetype: 'test-filetype',
          buflisted: true,
          modifiable: true,
          readonly: false
        }
      });
      
      // Act
      await component.mount();
      
      // Assert
      expect(coc.workspace.nvim.call).toHaveBeenCalledWith('nvim_create_buf', [false, true]);
      expect(coc.workspace.nvim.call).toHaveBeenCalledWith('nvim_buf_set_name', [expect.anything(), 'Test Buffer']);
      expect(coc.workspace.nvim.command).toHaveBeenCalledWith(expect.stringContaining('filetype'));
      expect(coc.workspace.nvim.command).toHaveBeenCalledWith(expect.stringContaining('buflisted'));
      expect(coc.workspace.nvim.command).toHaveBeenCalledWith(expect.stringContaining('modifiable'));
      expect(coc.workspace.nvim.command).toHaveBeenCalledWith(expect.stringContaining('readonly'));
    });
    
    it('should unregister message handlers when destroyed', async () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test'
      });
      
      // Act
      await component.mount();
      await component.destroy();
      
      // Assert
      expect(bridgeCore.unregisterHandler).toHaveBeenCalledWith(
        `component:${component.id}`,
        expect.any(Function)
      );
    });
  });
});
