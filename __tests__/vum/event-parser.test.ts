/**
 * @jest-environment jsdom
 */

import { createElement } from '../../template/tsxFactory';

describe('TSX Event Parser', () => {
  test('extracts @click attribute from props', () => {
    // Setup
    const onClick = jest.fn();
    const props = { '@click': onClick, id: 'test-element' };
    
    // Create element with Vue-style event
    const vnode = createElement('div', props);
    
    // Validate props and event handling
    expect(vnode.props.id).toBe('test-element');
    expect(vnode.props['@click']).toBeUndefined();
    expect(vnode.props.events).toBeDefined();
    expect(typeof vnode.props.events?.click).toBe('function');
  });
  
  test('extracts @on:save namespaced event', () => {
    // Setup
    const onSave = jest.fn();
    const props = { '@on:save': onSave, id: 'form' };
    
    // Create element with namespaced event
    const vnode = createElement('form', props);
    
    // Validate props and event handling
    expect(vnode.props.id).toBe('form');
    expect(vnode.props['@on:save']).toBeUndefined();
    expect(vnode.props.events).toBeDefined();
    expect(typeof vnode.props.events?.['on:save']).toBe('function');
  });
  
  test('handles multiple events on the same element', () => {
    // Setup
    const onClick = jest.fn();
    const onHover = jest.fn();
    const onBlur = jest.fn();
    
    const props = { 
      '@click': onClick, 
      '@hover': onHover, 
      '@blur': onBlur, 
      className: 'interactive'
    };
    
    // Create element with multiple events
    const vnode = createElement('button', props);
    
    // Validate props and event handling
    expect(vnode.props.className).toBe('interactive');
    expect(vnode.props['@click']).toBeUndefined();
    expect(vnode.props['@hover']).toBeUndefined();
    expect(vnode.props['@blur']).toBeUndefined();
    
    expect(vnode.props.events).toBeDefined();
    expect(typeof vnode.props.events?.click).toBe('function');
    expect(typeof vnode.props.events?.hover).toBe('function');
    expect(typeof vnode.props.events?.blur).toBe('function');
  });
  
  test('supports event handler with emit function', () => {
    // Mock event bridge
    const mockEmit = jest.fn();
    (global as any).eventBridge = {
      emit: mockEmit
    };
    
    // No need to declare special types with our simplified mock
    
    // Setup
    const onSave = jest.fn((event) => {
      // Check if event has emit function
      expect(event.emit).toBeDefined();
      // Call emit
      event.emit('saved', { success: true });
    });
    
    const props = { '@on:save': onSave };
    
    // Create element with event
    const vnode = createElement('form', props);
    
    // Trigger the event
    const event = { type: 'save' };
    vnode.props.events?.['on:save'](event);
    
    // Validate
    expect(onSave).toHaveBeenCalledWith(event);
    expect(mockEmit).toHaveBeenCalledWith('saved', { success: true});
  });
  
  test('handles regular props without event syntax', () => {
    // Setup
    const regularOnClick = jest.fn();
    const props = { onClick: regularOnClick, id: 'regular-element' };
    
    // Create element with regular props
    const vnode = createElement('div', props);
    
    // Validate that regular props are untouched
    expect(vnode.props.id).toBe('regular-element');
    expect(vnode.props.onClick).toBe(regularOnClick);
    expect(vnode.props.events).toBeUndefined();
  });
});
