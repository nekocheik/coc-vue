/**
 * Tests for the component registry system
 * 
 * This module tests the component registry functionality that tracks
 * mounted components and emits events when they change.
 */

import { ComponentRegistry } from '../../template/registry';

describe('Component Registry', () => {
  let registry: ComponentRegistry;
  
  beforeEach(() => {
    // Create a new registry instance for each test
    registry = new ComponentRegistry();
  });
  
  describe('add', () => {
    it('should add a component to the registry', () => {
      // Create a mock component
      const component = {
        id: 'test-component',
        type: 'Button',
        props: { label: 'Click me' }
      };
      
      // Add to registry
      registry.add(component);
      
      // Component should be in the registry
      expect(registry.get('test-component')).toBe(component);
    });
    
    it('should emit an event when a component is added', () => {
      // Create a mock listener
      const listener = jest.fn();
      
      // Register listener
      registry.on('componentAdded', listener);
      
      // Create and add a component
      const component = { id: 'test-component', type: 'Button', props: {} };
      registry.add(component);
      
      // Listener should be called with the component
      expect(listener).toHaveBeenCalledWith(component);
    });
  });
  
  describe('get', () => {
    it('should return a component by id', () => {
      // Create and add components
      const component1 = { id: 'comp1', type: 'Button', props: {} };
      const component2 = { id: 'comp2', type: 'Input', props: {} };
      
      registry.add(component1);
      registry.add(component2);
      
      // Get each component
      expect(registry.get('comp1')).toBe(component1);
      expect(registry.get('comp2')).toBe(component2);
    });
    
    it('should return null for non-existent component', () => {
      expect(registry.get('non-existent')).toBeNull();
    });
  });
  
  describe('remove', () => {
    it('should remove a component from the registry', () => {
      // Create and add a component
      const component = { id: 'test-component', type: 'Button', props: {} };
      registry.add(component);
      
      // Verify it was added
      expect(registry.get('test-component')).toBe(component);
      
      // Remove it
      registry.remove('test-component');
      
      // Verify it was removed
      expect(registry.get('test-component')).toBeNull();
    });
    
    it('should emit an event when a component is removed', () => {
      // Create a mock listener
      const listener = jest.fn();
      
      // Register listener
      registry.on('componentRemoved', listener);
      
      // Create and add a component
      const component = { id: 'test-component', type: 'Button', props: {} };
      registry.add(component);
      
      // Remove the component
      registry.remove('test-component');
      
      // Listener should be called with the component id
      expect(listener).toHaveBeenCalledWith('test-component');
    });
    
    it('should do nothing when removing a non-existent component', () => {
      // Create a mock listener
      const listener = jest.fn();
      
      // Register listener
      registry.on('componentRemoved', listener);
      
      // Try to remove a non-existent component
      registry.remove('non-existent');
      
      // Listener should not be called
      expect(listener).not.toHaveBeenCalled();
    });
  });
  
  describe('update', () => {
    it('should update a component in the registry', () => {
      // Create and add a component
      const component = {
        id: 'test-component',
        type: 'Button',
        props: { label: 'Original' }
      };
      registry.add(component);
      
      // Update the component
      const updatedComponent = {
        id: 'test-component',
        type: 'Button',
        props: { label: 'Updated' }
      };
      registry.update(updatedComponent);
      
      // Verify it was updated
      expect(registry.get('test-component')).toBe(updatedComponent);
      expect(registry.get('test-component')?.props.label).toBe('Updated');
    });
    
    it('should emit an event when a component is updated', () => {
      // Create a mock listener
      const listener = jest.fn();
      
      // Register listener
      registry.on('componentUpdated', listener);
      
      // Create and add a component
      const component = {
        id: 'test-component',
        type: 'Button',
        props: { label: 'Original' }
      };
      registry.add(component);
      
      // Update the component
      const updatedComponent = {
        id: 'test-component',
        type: 'Button',
        props: { label: 'Updated' }
      };
      registry.update(updatedComponent);
      
      // Listener should be called with the old and new components
      expect(listener).toHaveBeenCalledWith(updatedComponent, component);
    });
  });
  
  describe('getByType', () => {
    it('should return all components of a specified type', () => {
      // Create and add components of different types
      const button1 = { id: 'btn1', type: 'Button', props: {} };
      const button2 = { id: 'btn2', type: 'Button', props: {} };
      const input = { id: 'input1', type: 'Input', props: {} };
      
      registry.add(button1);
      registry.add(button2);
      registry.add(input);
      
      // Get all buttons
      const buttons = registry.getByType('Button');
      
      // Should have both buttons
      expect(buttons).toHaveLength(2);
      expect(buttons).toContain(button1);
      expect(buttons).toContain(button2);
      
      // Should not have the input
      expect(buttons).not.toContain(input);
    });
  });
  
  describe('clear', () => {
    it('should remove all components from the registry', () => {
      // Add multiple components
      registry.add({ id: 'comp1', type: 'Button', props: {} });
      registry.add({ id: 'comp2', type: 'Input', props: {} });
      
      // Clear the registry
      registry.clear();
      
      // All components should be removed
      expect(registry.get('comp1')).toBeNull();
      expect(registry.get('comp2')).toBeNull();
    });
    
    it('should emit an event when the registry is cleared', () => {
      // Create a mock listener
      const listener = jest.fn();
      
      // Register listener
      registry.on('registryCleared', listener);
      
      // Add components and clear
      registry.add({ id: 'comp1', type: 'Button', props: {} });
      registry.add({ id: 'comp2', type: 'Input', props: {} });
      registry.clear();
      
      // Listener should be called
      expect(listener).toHaveBeenCalled();
    });
  });
});
