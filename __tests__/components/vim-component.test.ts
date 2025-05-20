// __tests__/components/vim-component.test.ts
import { VimComponent, ComponentOptions } from '../../src/components/vim-component';
import { mockNvim, mockWorkspace, resetAllMocks } from '../mocks/nvim';
import { bridgeCore, BridgeMessage, MessageType } from '../../src/bridge/core';


// Mock bridgeCore
jest.mock('../../src/bridge/core', () => {
  const original = jest.requireActual('../../src/bridge/core');
  return {
    ...original,
    bridgeCore: {
      sendMessage: jest.fn().mockResolvedValue({}),
      registerHandler: jest.fn(),
      unregisterHandler: jest.fn()
    }
  };
});

describe('VimComponent', () => {
  beforeEach(() => {
    resetAllMocks();
    
    // Set up buffer creation mock
    mockNvim.callResults.set('nvim_create_buf:[false,true]', 1);
    mockNvim.callResults.set('nvim_get_option:columns', 80);
    mockNvim.callResults.set('nvim_get_option:lines', 24);
    mockNvim.callResults.set('nvim_open_win:[1,false,{"relative":"editor","width":60,"height":10,"col":10,"row":7,"style":"minimal","border":"rounded"}]', 2);
    mockNvim.callResults.set('nvim_buf_set_lines:[1,0,-1,false,["Test Content"]]', null);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Lifecycle', () => {
    it('should call lifecycle hooks in the correct order', async () => {
      const hooks = {
        beforeMount: jest.fn(),
        onMounted: jest.fn(),
        onUpdated: jest.fn(),
        onBeforeDestroy: jest.fn(),
        onDestroyed: jest.fn()
      };
      
      const options: ComponentOptions = {
        id: 'test_component',
        type: 'test',
        state: { message: 'Hello World' },
        beforeMount: hooks.beforeMount,
        onMounted: hooks.onMounted,
        onUpdated: hooks.onUpdated,
        onBeforeDestroy: hooks.onBeforeDestroy,
        onDestroyed: hooks.onDestroyed,
        render: (state) => [`${state.message}`]
      };
      
      const component = new VimComponent(options);
      
      // Mount
      await component.mount();
      
      // Verify mount hooks
      expect(hooks.beforeMount).toHaveBeenCalledTimes(1);
      expect(hooks.onMounted).toHaveBeenCalledTimes(1);
      expect(hooks.onUpdated).toHaveBeenCalledTimes(1);
      expect(hooks.onBeforeDestroy).not.toHaveBeenCalled();
      expect(hooks.onDestroyed).not.toHaveBeenCalled();
      
      // Verify buffer creation
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_create_buf', [false, true]);
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Hello World']]);
      
      // Verify mounted event
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test_component',
        type: MessageType.EVENT,
        action: 'component:mounted'
      }));
      
      // Update state
      component.updateState({ message: 'Updated Message' });
      
      // Verify update hook
      expect(hooks.onUpdated).toHaveBeenCalledTimes(2);
      
      // Verify buffer update
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Updated Message']]);
      
      // Destroy
      await component.destroy();
      
      // Verify destroy hooks
      expect(hooks.onBeforeDestroy).toHaveBeenCalledTimes(1);
      expect(hooks.onDestroyed).toHaveBeenCalledTimes(1);
      
      // Verify window/buffer cleanup
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_win_close', [2, true]);
      expect(mockNvim.command).toHaveBeenCalledWith('silent! bdelete! 1');
      
      // Verify destroyed event
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test_component',
        type: MessageType.EVENT,
        action: 'component:destroyed'
      }));
    });
  });
  
  describe('Reactivity', () => {
    it('should update the buffer when state changes', async () => {
      const renderFn = jest.fn().mockImplementation(state => [`Count: ${state.count}`]);
      
      const options: ComponentOptions = {
        id: 'counter',
        type: 'counter',
        state: { count: 0 },
        render: renderFn
      };
      
      const component = new VimComponent(options);
      await component.mount();
      
      // Initial render
      expect(renderFn).toHaveBeenCalledTimes(1);
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Count: 0']]);
      
      // Update state
      component.updateState({ count: 1 });
      
      // Verify re-render
      expect(renderFn).toHaveBeenCalledTimes(2);
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Count: 1']]);
      
      // Update state again
      component.updateState({ count: 2 });
      
      // Verify another re-render
      expect(renderFn).toHaveBeenCalledTimes(3);
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Count: 2']]);
    });
    
    it('should support computed properties', async () => {
      const options: ComponentOptions = {
        id: 'computed_test',
        type: 'computed',
        state: { 
          firstName: 'John',
          lastName: 'Doe'
        },
        computed: {
          fullName: function() {
            return `${this.state.firstName} ${this.state.lastName}`;
          }
        },
        render: (state) => [`Full Name: ${state.fullName}`]
      };
      
      const component = new VimComponent(options);
      await component.mount();
      
      // Initial render
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Full Name: John Doe']]);
      
      // Update first name
      component.updateState({ firstName: 'Jane' });
      
      // Verify re-render with updated computed property
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Full Name: Jane Doe']]);
    });
    
    it('should support watchers', async () => {
      const watchCallback = jest.fn();
      
      const options: ComponentOptions = {
        id: 'watch_test',
        type: 'watch',
        state: { count: 0 },
        watch: {
          count: watchCallback
        },
        render: (state) => [`Count: ${state.count}`]
      };
      
      const component = new VimComponent(options);
      await component.mount();
      
      // Initial render (watcher not called yet)
      expect(watchCallback).not.toHaveBeenCalled();
      
      // Update state
      component.updateState({ count: 1 });
      
      // Verify watcher called
      expect(watchCallback).toHaveBeenCalledTimes(1);
      expect(watchCallback).toHaveBeenCalledWith(1, 0);
      
      // Update state again
      component.updateState({ count: 2 });
      
      // Verify watcher called again
      expect(watchCallback).toHaveBeenCalledTimes(2);
      expect(watchCallback).toHaveBeenCalledWith(2, 1);
    });
  });
  
  describe('Methods', () => {
    it('should support calling methods', async () => {
      const incrementMethod = jest.fn().mockImplementation(function() {
        this.updateState({ count: this.state.count + 1 });
        return this.state.count;
      });
      
      const options: ComponentOptions = {
        id: 'methods_test',
        type: 'methods',
        state: { count: 0 },
        methods: {
          increment: incrementMethod
        },
        render: (state) => [`Count: ${state.count}`]
      };
      
      const component = new VimComponent(options);
      await component.mount();
      
      // Initial render
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Count: 0']]);
      
      // Call method
      const result = await component.callMethod('increment');
      
      // Verify method was called and returned correct value
      expect(incrementMethod).toHaveBeenCalledTimes(1);
      expect(result).toBe(1);
      
      // Verify state was updated and buffer re-rendered
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Count: 1']]);
    });
    
    it('should handle method calls from bridge messages', async () => {
      const incrementMethod = jest.fn().mockImplementation(function(amount = 1) {
        this.updateState({ count: this.state.count + amount });
        return this.state.count;
      });
      
      const options: ComponentOptions = {
        id: 'bridge_methods_test',
        type: 'bridge_methods',
        state: { count: 0 },
        methods: {
          increment: incrementMethod
        },
        render: (state) => [`Count: ${state.count}`]
      };
      
      // Capture the handler function when it's registered
      let registeredHandler: (message: BridgeMessage) => Promise<void>;
      (bridgeCore.registerHandler as jest.Mock).mockImplementation((action, handler) => {
        if (action === 'component:bridge_methods_test') {
          registeredHandler = handler;
        }
      });
      
      const component = new VimComponent(options);
      await component.mount();
      
      // Simulate a method call message from the bridge
      const message: BridgeMessage = {
        id: 'bridge_methods_test',
        type: MessageType.ACTION,
        action: 'callMethod',
        payload: {
          method: 'increment',
          args: [5]
        },
        correlationId: 'test-correlation-id'
      };
      
      // Call the handler directly
      await registeredHandler!(message);
      
      // Verify method was called with correct arguments
      expect(incrementMethod).toHaveBeenCalledTimes(1);
      expect(incrementMethod).toHaveBeenCalledWith(5);
      
      // Verify state was updated and buffer re-rendered
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Count: 5']]);
      
      // Verify response was sent
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'bridge_methods_test',
        type: MessageType.RESPONSE,
        action: 'methodResult',
        payload: {
          method: 'increment',
          result: 5
        },
        correlationId: 'test-correlation-id'
      }));
    });
  });
});
