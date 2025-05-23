/**
 * Tests for the ComponentRegistry lifecycle hooks and event handling
 * 
 * This test file focuses on the more advanced aspects of the registry:
 * - Lifecycle hooks (mount, update, unmount)
 * - Component event handling
 * - Edge cases and error handling
 */

import { ComponentRegistry, RegistryEventType } from '../../template/registry';

// Mock console.error to prevent test output pollution
const originalConsoleError = console.error;
const mockConsoleError = jest.fn();
console.error = mockConsoleError;

describe('ComponentRegistry Lifecycle and Events', () => {
  let registry: ComponentRegistry;
  
  beforeEach(() => {
    // Create a new registry instance for each test
    registry = new ComponentRegistry();
    mockConsoleError.mockClear();
  });
  
  afterAll(() => {
    // Restore original console.error
    console.error = originalConsoleError;
  });
  
  describe('Lifecycle Hooks', () => {
    it('should register and trigger lifecycle hooks', () => {
      // Create mock hooks
      const onMount = jest.fn();
      const onUpdate = jest.fn();
      const onUnmount = jest.fn();
      
      // Register lifecycle hooks
      registry.registerLifecycle('test-component', {
        onMount,
        onUpdate,
        onUnmount
      });
      
      // Trigger mount
      registry.triggerLifecycle('mount', 'test-component');
      expect(onMount).toHaveBeenCalledTimes(1);
      
      // Trigger update
      const newVNode = { type: 'Button', props: { updated: true } };
      registry.triggerLifecycle('update', 'test-component', newVNode);
      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate).toHaveBeenCalledWith(newVNode, undefined);
      
      // Trigger another update to check lastVNode is passed
      const newerVNode = { type: 'Button', props: { updated: false } };
      registry.triggerLifecycle('update', 'test-component', newerVNode);
      expect(onUpdate).toHaveBeenCalledTimes(2);
      expect(onUpdate).toHaveBeenCalledWith(newerVNode, newVNode);
      
      // Trigger unmount
      registry.triggerLifecycle('unmount', 'test-component');
      expect(onUnmount).toHaveBeenCalledTimes(1);
    });
    
    it('should only trigger mount once if called multiple times', () => {
      const onMount = jest.fn();
      
      registry.registerLifecycle('test-component', { onMount });
      
      // Trigger mount multiple times
      registry.triggerLifecycle('mount', 'test-component');
      registry.triggerLifecycle('mount', 'test-component');
      registry.triggerLifecycle('mount', 'test-component');
      
      // Should only be called once
      expect(onMount).toHaveBeenCalledTimes(1);
    });
    
    it('should only trigger update if component is mounted and args are provided', () => {
      const onUpdate = jest.fn();
      
      registry.registerLifecycle('test-component', { onUpdate });
      
      // Update without mounting
      registry.triggerLifecycle('update', 'test-component', { props: {} });
      
      // Should not be called because not mounted
      expect(onUpdate).not.toHaveBeenCalled();
      
      // Mount first
      registry.triggerLifecycle('mount', 'test-component');
      
      // Now update - we need to explicitly set isMounted
      const lifecycle = registry['lifecycles'].get('test-component');
      if (lifecycle) {
        lifecycle.isMounted = true;
      }
      registry.triggerLifecycle('update', 'test-component', { props: {} });
      
      // Should be called now
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });
    
    it('should handle lifecycle for unmounted components', () => {
      const onUnmount = jest.fn();
      
      registry.registerLifecycle('test-component', { onUnmount });
      
      // Set component as mounted first (simulating real usage)
      const lifecycle = registry['lifecycles'].get('test-component');
      if (lifecycle) {
        lifecycle.isMounted = true;
      }
      
      // Trigger unmount
      registry.triggerLifecycle('unmount', 'test-component');
      
      // Unmount hook should be called
      expect(onUnmount).toHaveBeenCalledTimes(1);
    });
    
    it('should handle missing lifecycle hooks gracefully', () => {
      // Register with only one hook
      registry.registerLifecycle('test-component', { onMount: jest.fn() });
      
      // These should not throw
      expect(() => {
        registry.triggerLifecycle('update', 'test-component', {});
        registry.triggerLifecycle('unmount', 'test-component');
      }).not.toThrow();
    });
    
    it('should handle error in mount lifecycle hook', () => {
      // Create hook that throws error
      const onMount = jest.fn(() => { throw new Error('Mount error'); });
      
      registry.registerLifecycle('test-component', {
        onMount
      });
      
      // This should not throw
      expect(() => {
        registry.triggerLifecycle('mount', 'test-component');
      }).not.toThrow();
      
      // Error should be logged
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error in mount hook for component test-component:',
        expect.any(Error)
      );
    });
    
    it('should handle error in update lifecycle hook', () => {
      // Create hook that throws error
      const onUpdate = jest.fn(() => { throw new Error('Update error'); });
      
      registry.registerLifecycle('test-component', {
        onUpdate
      });
      
      // Set component as mounted first
      const lifecycle = registry['lifecycles'].get('test-component');
      if (lifecycle) {
        lifecycle.isMounted = true;
      }
      
      // This should not throw
      expect(() => {
        registry.triggerLifecycle('update', 'test-component', {});
      }).not.toThrow();
      
      // Error should be logged
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error in update hook for component test-component:',
        expect.any(Error)
      );
    });
    
    it('should handle error in unmount lifecycle hook', () => {
      // Create hook that throws error
      const onUnmount = jest.fn(() => { throw new Error('Unmount error'); });
      
      registry.registerLifecycle('test-component', {
        onUnmount
      });
      
      // Set component as mounted first
      const lifecycle = registry['lifecycles'].get('test-component');
      if (lifecycle) {
        lifecycle.isMounted = true;
      }
      
      // This should not throw
      expect(() => {
        registry.triggerLifecycle('unmount', 'test-component');
      }).not.toThrow();
      
      // Error should be logged
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error in unmount hook for component test-component:',
        expect.any(Error)
      );
    });
    
    it('should get lifecycle components', () => {
      // Register several lifecycle hooks
      registry.registerLifecycle('comp1', { onMount: jest.fn() });
      registry.registerLifecycle('comp2', { onUpdate: jest.fn() });
      registry.registerLifecycle('comp3', { onUnmount: jest.fn() });
      
      // Get all lifecycle components
      const components = registry.getLifecycleComponents();
      
      // Should contain all three
      expect(components).toHaveLength(3);
      expect(components).toContain('comp1');
      expect(components).toContain('comp2');
      expect(components).toContain('comp3');
    });
    
    it('should unmount all lifecycle components when clearing registry', () => {
      // Create mock unmount hooks
      const onUnmount1 = jest.fn();
      const onUnmount2 = jest.fn();
      
      // Register with registry
      registry.registerLifecycle('comp1', { onMount: jest.fn(), onUnmount: onUnmount1 });
      registry.registerLifecycle('comp2', { onMount: jest.fn(), onUnmount: onUnmount2 });
      
      // Mount components
      registry.triggerLifecycle('mount', 'comp1');
      registry.triggerLifecycle('mount', 'comp2');
      
      // Clear registry
      registry.clear();
      
      // Unmount hooks should be called
      expect(onUnmount1).toHaveBeenCalledTimes(1);
      expect(onUnmount2).toHaveBeenCalledTimes(1);
      
      // Lifecycle components should be empty
      expect(registry.getLifecycleComponents()).toHaveLength(0);
    });
    
    it('should unmount when removing a component with lifecycle', () => {
      const onUnmount = jest.fn();
      
      registry.registerLifecycle('test-component', { onUnmount });
      
      // Create and add a component
      const component = { id: 'test-component', type: 'Button', props: {} };
      registry.add(component);
      
      // Set component as mounted first (simulating real usage)
      const lifecycle = registry['lifecycles'].get('test-component');
      if (lifecycle) {
        lifecycle.isMounted = true;
      }
      
      // Remove component (should trigger unmount hook)
      registry.remove('test-component');
      
      // Unmount hook should be called
      expect(onUnmount).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Component Events', () => {
    it('should register and trigger component events', () => {
      // Create mock event handler
      const clickHandler = jest.fn();
      const hoverHandler = jest.fn();
      
      // Register lifecycle with events
      registry.registerLifecycle('test-component', {
        events: {
          click: clickHandler,
          hover: hoverHandler
        }
      });
      
      // Trigger events
      registry.triggerEvent('test-component', 'click', { x: 10, y: 20 });
      registry.triggerEvent('test-component', 'hover', { entered: true });
      
      // Handlers should be called with event data
      expect(clickHandler).toHaveBeenCalledWith({ x: 10, y: 20 });
      expect(hoverHandler).toHaveBeenCalledWith({ entered: true });
    });
    
    it('should handle missing event handlers gracefully', () => {
      // Register with only one event
      registry.registerLifecycle('test-component', {
        events: {
          click: jest.fn()
        }
      });
      
      // This should not throw
      expect(() => {
        registry.triggerEvent('test-component', 'hover', {});
      }).not.toThrow();
    });
    
    it('should handle errors in event handlers', () => {
      // Create handler that throws
      const errorHandler = jest.fn(() => { throw new Error('Event error'); });
      
      registry.registerLifecycle('test-component', {
        events: {
          error: errorHandler
        }
      });
      
      // This should not throw
      expect(() => {
        registry.triggerEvent('test-component', 'error', {});
      }).not.toThrow();
      
      // Error should be logged
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error in event handler error for component test-component:',
        expect.any(Error)
      );
    });
    
    it('should do nothing when triggering event on missing component', () => {
      // This should not throw
      expect(() => {
        registry.triggerEvent('non-existent', 'click', {});
      }).not.toThrow();
    });
  });
  
  describe('Event Listeners', () => {
    it('should remove event listener when unsubscribe function is called', () => {
      // Create mock listener
      const listener = jest.fn();
      
      // Register and get unsubscribe function
      const unsubscribe = registry.on(RegistryEventType.COMPONENT_ADDED, listener);
      
      // Add a component
      registry.add({ id: 'test', type: 'Button', props: {} });
      
      // Listener should be called
      expect(listener).toHaveBeenCalledTimes(1);
      
      // Unsubscribe
      unsubscribe();
      
      // Add another component
      registry.add({ id: 'test2', type: 'Button', props: {} });
      
      // Listener should not be called again
      expect(listener).toHaveBeenCalledTimes(1);
    });
    
    it('should handle removing non-existent listener', () => {
      // Create mock listener
      const listener = jest.fn();
      
      // Register and get unsubscribe function
      const unsubscribe = registry.on(RegistryEventType.COMPONENT_ADDED, listener);
      
      // Change the event listeners map to simulate missing listener
      const tempListeners = registry['eventListeners'];
      registry['eventListeners'] = new Map();
      
      // This should not throw
      expect(() => {
        unsubscribe();
      }).not.toThrow();
      
      // Restore listeners
      registry['eventListeners'] = tempListeners;
    });
    
    it('should update properly when component doesn\'t exist', () => {
      // Register update listener
      const updateListener = jest.fn();
      registry.on(RegistryEventType.COMPONENT_UPDATED, updateListener);
      
      // Register add listener to check component added event
      const addListener = jest.fn();
      registry.on(RegistryEventType.COMPONENT_ADDED, addListener);
      
      // Try to update non-existent component
      const component = { id: 'non-existent', type: 'Button', props: {} };
      registry.update(component);
      
      // Should add the component instead
      expect(updateListener).not.toHaveBeenCalled();
      expect(addListener).toHaveBeenCalledWith(component);
      
      // Verify it was added
      expect(registry.get('non-existent')).toBe(component);
    });
  });
});
