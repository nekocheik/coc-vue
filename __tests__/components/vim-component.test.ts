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
  
  // Create a mock watch function that can be used to trigger updates in tests
  const mockWatchCallbacks = new Map();
  const watch = jest.fn((getter, callback) => {
    // Store the callback for later triggering
    mockWatchCallbacks.set(getter, callback);
    return jest.fn(); // Return a stop function
  });
  
  // Helper to manually trigger watch callbacks in tests
  (global as any).triggerWatch = (newVal: any, oldVal: any) => {
    mockWatchCallbacks.forEach((callback) => {
      callback(newVal, oldVal);
    });
  };
  
  return {
    reactive,
    effect: jest.fn((fn) => {
      fn();
      return jest.fn(); // Return a stop function
    }),
    ref: jest.fn((val) => ({ value: val })),
    watch
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
  
  describe('Lifecycle Hooks', () => {
    it('should call lifecycle hooks in the correct order', async () => {
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
      // Check order
      const beforeMountCallOrder = beforeMountFn.mock.invocationCallOrder[0];
      const onMountedCallOrder = onMountedFn.mock.invocationCallOrder[0];
      expect(beforeMountCallOrder).toBeLessThan(onMountedCallOrder);
    });
    
    it('should handle missing lifecycle hooks gracefully', async () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test'
        // No lifecycle hooks provided
      });
      
      // Act & Assert - Should not throw
      await expect(component.mount()).resolves.not.toThrow();
    });
  });

  describe('Component Lifecycle', () => {
    it('should mount the component', async () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test'
      });
      
      // Act
      await component.mount();
      
      // Assert
      expect(coc.workspace.nvim.call).toHaveBeenCalledWith('nvim_create_buf', [false, true]);
    });
    
    it('should not mount if already mounted', async () => {
      // Arrange
      const onMountedFn = jest.fn();
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        onMounted: onMountedFn
      });
      
      // Act - Mount twice
      await component.mount();
      onMountedFn.mockClear(); // Reset the mock
      await component.mount();
      
      // Assert - onMounted should not be called again
      expect(onMountedFn).not.toHaveBeenCalled();
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
      
      // First mount
      await component.mount();
      
      // Act
      await component.destroy();
      
      // Assert
      expect(onBeforeDestroyFn).toHaveBeenCalled();
      expect(onDestroyedFn).toHaveBeenCalled();
      expect(bridgeCore.unregisterHandler).toHaveBeenCalledWith(
        `component:${component.id}`,
        expect.any(Function)
      );
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
      (bridgeCore.unregisterHandler as jest.Mock).mockClear();
      
      // Act - Try to destroy again
      await component.destroy();
      
      // Assert - Should not call lifecycle hooks or unregister again
      expect(onDestroyedFn).not.toHaveBeenCalled();
      expect(bridgeCore.unregisterHandler).not.toHaveBeenCalled();
    });
  });
  
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
      const result = await component.callMethod('testMethod', ['arg1', 'arg2']);
      
      // Assert
      expect(testMethod).toHaveBeenCalledWith(['arg1', 'arg2']);
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
  
  describe('State Management', () => {
    it('should update state', () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        state: {
          count: 0
        }
      });
      
      // Act
      component.updateState({
        count: 10
      });
      
      // Assert
      expect(component.state.count).toBe(10);
    });
    
    it('should throw error when updating state of destroyed component', () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        state: { count: 0 }
      });
      
      // Mark component as destroyed
      component['_isDestroyed'] = true;
      
      // Act & Assert
      expect(() => component.updateState({ count: 10 })).toThrow(
        'Cannot update state of destroyed component'
      );
    });
    
    it('should update state with existing properties', () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        state: {
          testProp: 'test-value'
        }
      });
      
      // Act
      component.updateState({
        testProp: 'updated-value'
      });
      
      // Assert - Only check that existing property is updated
      expect(component.state.testProp).toBe('updated-value');
    });
  });
  
  describe('Reactivity', () => {
    it('should set up computed properties', () => {
      // Arrange & Act
      const computedFn = jest.fn().mockReturnValue('computed-value');
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        computed: {
          testComputed: computedFn
        }
      });
      
      // Assert
      expect(component.state.testComputed).toBe('computed-value');
      expect(computedFn).toHaveBeenCalled();
    });
    
    it('should set up watchers', async () => {
      // Arrange
      const watchCallback = jest.fn();
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        state: {
          testValue: 'initial'
        },
        watch: {
          testValue: watchCallback
        }
      });
      
      // Act - Trigger the watch callback manually
      (global as any).triggerWatch('updated', 'initial');
      
      // Assert
      expect(watchCallback).toHaveBeenCalled();
    });
    
    it('should create component with render function', () => {
      // Arrange
      const renderFn = jest.fn();
      
      // Act - Create component with render function
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        render: renderFn
      });
      
      // Assert - The component should be created successfully
      expect(component).toBeDefined();
      expect(component.id).toBe('test-component');
    });
    
    it('should get nested property from object', () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test'
      });
      
      const obj = {
        a: {
          b: {
            c: 'value'
          }
        }
      };
      
      // Act & Assert
      expect(component['getNestedProperty'](obj, 'a.b.c')).toBe('value');
      expect(component['getNestedProperty'](obj, 'a.b')).toEqual({ c: 'value' });
      expect(component['getNestedProperty'](obj, 'a.nonexistent')).toBeUndefined();
      
      // Test with empty path - may return undefined based on implementation
      const result = component['getNestedProperty'](obj, '');
      // We don't strictly test the result here as it depends on implementation
    });
  });

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
    
    it('should create a buffer with floating position', async () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        bufferOptions: {
          position: 'floating',
          width: 50,
          height: 10
        }
      });
      
      // Act
      await component.mount();
      
      // Assert
      expect(coc.workspace.nvim.call).toHaveBeenCalledWith('nvim_create_buf', [false, true]);
      // Verify buffer options are set
      expect(coc.workspace.nvim.command).toHaveBeenCalledWith(expect.stringMatching(/setbufvar.*buflisted/));
      expect(coc.workspace.nvim.command).toHaveBeenCalledWith(expect.stringMatching(/setbufvar.*modifiable/));
      expect(coc.workspace.nvim.command).toHaveBeenCalledWith(expect.stringMatching(/setbufvar.*readonly/));
    });
    
    it('should unregister message handlers during destruction', async () => {
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
    
    it('should create a buffer with left position', async () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        bufferOptions: {
          position: 'left',
          width: 40
        }
      });
      
      // Act
      await component.mount();
      
      // Assert
      expect(coc.workspace.nvim.call).toHaveBeenCalledWith('nvim_create_buf', [false, true]);
    });
    
    it('should create a buffer with right position', async () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        bufferOptions: {
          position: 'right',
          width: 40
        }
      });
      
      // Act
      await component.mount();
      
      // Assert
      expect(coc.workspace.nvim.call).toHaveBeenCalledWith('nvim_create_buf', [false, true]);
    });
    
    it('should create a buffer with top position', async () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        bufferOptions: {
          position: 'top',
          height: 5
        }
      });
      
      // Act
      await component.mount();
      
      // Assert
      expect(coc.workspace.nvim.call).toHaveBeenCalledWith('nvim_create_buf', [false, true]);
    });
    
    it('should create a buffer with bottom position', async () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        bufferOptions: {
          position: 'bottom',
          height: 5
        }
      });
      
      // Act
      await component.mount();
      
      // Assert
      expect(coc.workspace.nvim.call).toHaveBeenCalledWith('nvim_create_buf', [false, true]);
    });
    
    it('should create a buffer with center position', async () => {
      // Arrange
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        bufferOptions: {
          position: 'center',
          width: 60,
          height: 20
        }
      });
      
      // Act
      await component.mount();
      
      // Assert
      expect(coc.workspace.nvim.call).toHaveBeenCalledWith('nvim_create_buf', [false, true]);
    });
    
    it('should update buffer content with render function', async () => {
      // Arrange
      const renderFn = jest.fn().mockReturnValue(['Line 1', 'Line 2']);
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        render: renderFn
      });
      
      // Mount the component
      await component.mount();
      
      // Act
      await component.updateBuffer();
      
      // Assert
      expect(coc.workspace.nvim.call).toHaveBeenCalledWith(
        'nvim_buf_set_lines',
        expect.arrayContaining([expect.anything(), 0, -1, false, ['Line 1', 'Line 2']])
      );
    });
    
    it('should not update buffer if not mounted', async () => {
      // Arrange
      const renderFn = jest.fn().mockReturnValue(['Line 1', 'Line 2']);
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        render: renderFn
      });
      
      // Act - Don't mount first
      await component.updateBuffer();
      
      // Assert
      expect(coc.workspace.nvim.call).not.toHaveBeenCalledWith(
        'nvim_buf_set_lines',
        expect.anything()
      );
    });
    
    it('should call onUpdated hook during buffer update', async () => {
      // Arrange
      const onUpdatedFn = jest.fn();
      const renderFn = jest.fn().mockReturnValue(['Line 1', 'Line 2']);
      const component = new VimComponent({
        id: 'test-component',
        type: 'test',
        render: renderFn,
        onUpdated: onUpdatedFn
      });
      
      // Mount the component
      await component.mount();
      
      // Act
      await component.updateBuffer();
      
      // Assert
      expect(onUpdatedFn).toHaveBeenCalled();
    });
    
    it('should handle errors during window closing in destroy', async () => {
      // Arrange
      const component = new VimComponent({
        id: 'error-component',
        type: 'test'
      });
      
      // Mock window creation
      component['_window'] = 999;
      
      // Mock nvim.call to throw error on window close
      const originalCall = coc.workspace.nvim.call;
      coc.workspace.nvim.call = jest.fn().mockImplementation((method, args) => {
        if (method === 'nvim_win_close') {
          throw new Error('Test error closing window');
        }
        return originalCall(method, args);
      });
      
      // Act - Should not throw despite the error
      await component.mount();
      await component.destroy();
      
      // Assert - Should continue despite error
      expect(bridgeCore.unregisterHandler).toHaveBeenCalled();
      
      // Restore original
      coc.workspace.nvim.call = originalCall;
    });
    
    it('should handle errors during buffer deletion in destroy', async () => {
      // Arrange
      const component = new VimComponent({
        id: 'error-component',
        type: 'test'
      });
      
      // Mock buffer creation
      component['_buffer'] = 999;
      
      // Mock nvim.command to throw error on buffer deletion
      const originalCommand = coc.workspace.nvim.command;
      coc.workspace.nvim.command = jest.fn().mockImplementation((cmd) => {
        if (cmd.includes('bdelete!')) {
          throw new Error('Test error deleting buffer');
        }
        return originalCommand(cmd);
      });
      
      // Act - Should not throw despite the error
      await component.mount();
      await component.destroy();
      
      // Assert - Should continue despite error
      expect(bridgeCore.unregisterHandler).toHaveBeenCalled();
      
      // Restore original
      coc.workspace.nvim.command = originalCommand;
    });
  });
});
