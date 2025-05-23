import { createElement } from '../../template/tsxFactory';
import { componentRegistry } from '../../template/registry';
import { mockLuaRender } from '../helpers/vumTestKit';

// Reset registry between tests
beforeEach(() => {
  componentRegistry.clear();
  jest.clearAllMocks();
});

describe('Component Registry Lifecycle', () => {
  it('registers and retrieves components', () => {
    // Create a simple component mock
    const id = 'test-component-1';
    const componentMock = { id, type: 'div', props: { id: 'test' }, children: [] };
    
    // Register the component
    componentRegistry.add(componentMock);
    
    // Retrieve the component
    const retrieved = componentRegistry.get(id);
    
    // Verify the component was registered and can be retrieved
    expect(retrieved).toBeDefined();
    expect(retrieved).toEqual(componentMock);
  });
  
  it('updates existing components', () => {
    // Create initial component mock
    const id = 'test-component-2';
    const initialComponent = { id, type: 'div', props: { id: 'test', value: 'initial' }, children: [] };
    
    // Register the initial component
    componentRegistry.add(initialComponent);
    
    // Create updated component mock
    const updatedComponent = { id, type: 'div', props: { id: 'test', value: 'updated' }, children: [] };
    
    // Update the component
    componentRegistry.update(updatedComponent);
    
    // Retrieve the updated component
    const retrieved = componentRegistry.get(id);
    
    // Verify the component was updated
    expect(retrieved).not.toBeNull();
    // Use non-null assertion since we've verified it's not null
    expect(retrieved!.props.value).toBe('updated');
  });
  
  it('unregisters components', () => {
    // Create a simple component mock
    const id = 'test-component-3';
    const componentMock = { id, type: 'div', props: { id: 'test' }, children: [] };
    
    // Register the component
    componentRegistry.add(componentMock);
    
    // Verify component is registered
    expect(componentRegistry.get(id)).toBeDefined();
    
    // Unregister the component
    componentRegistry.remove(id);
    
    // Verify component is no longer registered
    expect(componentRegistry.get(id)).toBeNull();
  });
  
  it('clears all registered components', () => {
    // Register multiple components
    componentRegistry.add({ id: 'id1', type: 'div', props: {}, children: [] });
    componentRegistry.add({ id: 'id2', type: 'span', props: {}, children: [] });
    componentRegistry.add({ id: 'id3', type: 'p', props: {}, children: [] });
    
    // Verify components are registered
    expect(componentRegistry.get('id1')).toBeDefined();
    expect(componentRegistry.get('id2')).toBeDefined();
    expect(componentRegistry.get('id3')).toBeDefined();
    
    // Clear the registry
    componentRegistry.clear();
    
    // Verify all components are removed
    expect(componentRegistry.get('id1')).toBeNull();
    expect(componentRegistry.get('id2')).toBeNull();
    expect(componentRegistry.get('id3')).toBeNull();
  });
  
  it('handles updates for non-existent components', () => {
    // Set up a non-existent component ID
    const nonExistentId = 'non-existent-component';
    
    // Verify component doesn't exist initially
    expect(componentRegistry.get(nonExistentId)).toBeNull();
    
    // Create a new component without the expected ID
    const newComponent = { id: 'different-id', type: 'div', props: {}, children: [] };
    
    // Update the component (this should create a new entry)
    componentRegistry.update(newComponent);
    
    // Verify the component with nonExistentId is still not registered
    expect(componentRegistry.get(nonExistentId)).toBeNull();
    
    // But the new component should be registered with its own ID
    expect(componentRegistry.get('different-id')).toBeDefined();
  });
  
  it('handles unregistering non-existent components', () => {
    // Set up a non-existent component ID
    const nonExistentId = 'non-existent-component';
    
    // Unregister the non-existent component
    componentRegistry.remove(nonExistentId);
    
    // No assertion needed as long as no error is thrown
  });
  
  it('maintains separate components with different IDs', () => {
    // Create two component mocks
    const component1 = { id: 'id1', type: 'div', props: { value: 'first' }, children: [] };
    const component2 = { id: 'id2', type: 'div', props: { value: 'second' }, children: [] };
    
    componentRegistry.add(component1);
    componentRegistry.add(component2);
    
    // Verify each component maintains its own state
    expect(componentRegistry.get('id1')).toEqual(component1);
    expect(componentRegistry.get('id2')).toEqual(component2);
    
    // Update one component
    componentRegistry.update({ ...component1, props: { value: 'updated' } });
    
    // Verify only the target component was updated
    const updatedComp1 = componentRegistry.get('id1');
    const updatedComp2 = componentRegistry.get('id2');
    
    // Use non-null assertion since we've verified they exist earlier
    expect(updatedComp1).not.toBeNull();
    expect(updatedComp2).not.toBeNull();
    expect(updatedComp1!.props.value).toBe('updated');
    expect(updatedComp2!.props.value).toBe('second');
  });
});
