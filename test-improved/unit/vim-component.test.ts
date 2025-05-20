/**
 * Enhanced unit tests for VimComponent
 * These tests use the new structure and improved mocks
 * to reduce logs and improve readability
 */
import { VimComponent, ComponentOptions } from '../mocks/vim-component';
import { mockNvim, mockWorkspace, resetAllMocks } from '../mocks/coc';
import { bridgeCore, MessageType, BridgeMessage } from '../mocks/bridge-core';

describe('VimComponent', () => {
  // Reset mocks before each test
  beforeEach(() => {
    resetAllMocks();
    bridgeCore.resetMocks();
    
    // Configure mocks for common calls
    mockNvim.call.mockImplementation((method, args) => {
      if (method === 'nvim_create_buf') return Promise.resolve(1);
      if (method === 'nvim_open_win') return Promise.resolve(2);
      if (method === 'nvim_buf_set_lines') return Promise.resolve(null);
      return Promise.resolve(null);
    });
  });
  
  describe('Cycle de vie', () => {
    it('should call lifecycle hooks in the correct order', async () => {
      // Create mocks for hooks
      const hooks = {
        beforeMount: jest.fn(),
        onMounted: jest.fn(),
        onUpdated: jest.fn(),
        onBeforeDestroy: jest.fn(),
        onDestroyed: jest.fn()
      };
      
      // Create component options
      const options: ComponentOptions = {
        id: 'test_lifecycle',
        type: 'test',
        state: { message: 'Hello World' },
        hooks: {
          beforeMount: hooks.beforeMount,
          onMounted: hooks.onMounted,
          onUpdated: hooks.onUpdated,
          onBeforeDestroy: hooks.onBeforeDestroy,
          onDestroyed: hooks.onDestroyed
        },
        render: (state) => [`${state.message}`]
      };
      
      // Create component
      const component = new VimComponent(options);
      
      // Monter le composant
      await component.mount();
      
      // Verify mounting hooks order
      expect(hooks.beforeMount).toHaveBeenCalledTimes(1);
      expect(hooks.onMounted).toHaveBeenCalledTimes(1);
      expect(hooks.onUpdated).toHaveBeenCalledTimes(1);
      expect(hooks.onBeforeDestroy).not.toHaveBeenCalled();
      expect(hooks.onDestroyed).not.toHaveBeenCalled();
      
      // Verify buffer creation
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_create_buf', [false, true]);
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Hello World']]);
      
      // Verify mount event
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test_lifecycle',
        type: MessageType.EVENT,
        action: 'component:mounted'
      }));
      
      // Mettre à jour l'état
      await component.updateState({ message: 'Updated Message' });
      
      // Verify update hook
      expect(hooks.onUpdated).toHaveBeenCalledTimes(2);
      
      // Verify buffer update
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Updated Message']]);
      
      // Détruire le composant
      await component.destroy();
      
      // Verify destruction hooks
      expect(hooks.onBeforeDestroy).toHaveBeenCalledTimes(1);
      expect(hooks.onDestroyed).toHaveBeenCalledTimes(1);
      
      // Verify window/buffer cleanup
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_win_close', [2, true]);
      expect(mockNvim.command).toHaveBeenCalledWith('silent! bdelete! 1');
      
      // Verify destroy event
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test_lifecycle',
        type: MessageType.EVENT,
        action: 'component:destroyed'
      }));
    });
  });
  
  describe('Réactivité', () => {
    it('should update buffer when state changes', async () => {
      // Create mock render function
      const renderFn = jest.fn().mockImplementation(state => [`Count: ${state.count}`]);
      
      // Create component options
      const options: ComponentOptions = {
        id: 'counter',
        type: 'counter',
        state: { count: 0 },
        render: renderFn
      };
      
      // Create component
      const component = new VimComponent(options);
      await component.mount();
      
      // Verify initial render
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Count: 0']]);
      
      // Mettre à jour l'état
      await component.updateState({ count: 1 });
      
      // Verify re-render
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Count: 1']]);
      
      // Verify render function was called twice
      expect(renderFn).toHaveBeenCalledTimes(2);
    });
    
    it('should handle computed properties', async () => {
      // Create component options with computed property
      const options: ComponentOptions = {
        id: 'computed_test',
        type: 'computed',
        state: { 
          firstName: 'John',
          lastName: 'Doe'
        },
        computed: {
          fullName: function(this: VimComponent) {
            return `${this.state.firstName} ${this.state.lastName}`;
          }
        },
        render: (state) => [`Full Name: ${state.fullName}`]
      };
      
      // Create component
      const component = new VimComponent(options);
      await component.mount();
      
      // Verify initial render with computed property
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Full Name: John Doe']]);
      
      // Mettre à jour le prénom
      await component.updateState({ firstName: 'Jane' });
      
      // Verify re-render with updated computed property
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Full Name: Jane Doe']]);
    });
    
    it('should handle watchers', async () => {
      // Create mock for watcher
      const watchCallback = jest.fn();
      
      // Create component options with watcher
      const options: ComponentOptions = {
        id: 'watch_test',
        type: 'watch',
        state: { count: 0 },
        watch: {
          count: watchCallback
        },
        render: (state) => [`Count: ${state.count}`]
      };
      
      // Create component
      const component = new VimComponent(options);
      await component.mount();
      
      // Watcher should not be called on initial render
      expect(watchCallback).not.toHaveBeenCalled();
      
      // Mettre à jour l'état
      await component.updateState({ count: 1 });
      
      // Verify watcher was called
      expect(watchCallback).toHaveBeenCalledTimes(1);
      expect(watchCallback).toHaveBeenCalledWith(1, 0);
      
      // Mettre à jour l'état à nouveau
      await component.updateState({ count: 2 });
      
      // Verify watcher was called again
      expect(watchCallback).toHaveBeenCalledTimes(2);
      expect(watchCallback).toHaveBeenCalledWith(2, 1);
    });
  });
  
  describe('Méthodes', () => {
    it('should handle method calls', async () => {
      // Create mock for method
      const incrementMethod = jest.fn().mockImplementation(function(this: VimComponent) {
        this.updateState({ count: this.state.count + 1 });
        return this.state.count;
      });
      
      // Create component options with method
      const options: ComponentOptions = {
        id: 'methods_test',
        type: 'methods',
        state: { count: 0 },
        methods: {
          increment: incrementMethod
        },
        render: (state) => [`Count: ${state.count}`]
      };
      
      // Create component
      const component = new VimComponent(options);
      await component.mount();
      
      // Verify initial render
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Count: 0']]);
      
      // Appeler la méthode
      const result = await component.callMethod('increment');
      
      // Verify that the method was called and returned the correct value
      expect(incrementMethod).toHaveBeenCalledTimes(1);
      expect(result).toBe(1);
      
      // Verify that the state was updated and the buffer re-rendered
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Count: 1']]);
    });
    
    it('should handle method calls from bridge messages', async () => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Create mock for method
      const incrementMethod = jest.fn().mockImplementation(function(this: VimComponent, amount = 1) {
        this.updateState({ count: this.state.count + amount });
        return this.state.count;
      });
      
      // Create component options with method
      const options: ComponentOptions = {
        id: 'bridge_methods_test',
        type: 'bridge_methods',
        state: { count: 0 },
        methods: {
          increment: incrementMethod
        },
        render: (state) => [`Count: ${state.count}`]
      };
      
      // Create component
      const component = new VimComponent(options);
      await component.mount();
      
      // Create bridge message
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
      
      // Simulate message reception
      await bridgeCore.receiveMessage(message);
      
      // Verify that the method was called with the correct arguments
      expect(incrementMethod).toHaveBeenCalledTimes(1);
      expect(incrementMethod).toHaveBeenCalledWith(5);
      
      // Verify that the state was updated and the buffer re-rendered
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Count: 5']]);
      
      // Verify that the response was sent
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        type: MessageType.RESPONSE,
        action: 'methodResult',
        correlationId: 'test-correlation-id',
        payload: expect.objectContaining({ result: 5 })
      }));
    });
  });
});
