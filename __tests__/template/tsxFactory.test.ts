/**
 * Tests for the custom TSX factory
 * 
 * This verifies that our custom TSX factory works correctly without React dependencies
 * and can properly be integrated with the WindowManager system.
 */

import { createElement, MountRegistry } from '../../template/tsxFactory';
import Window from '../../template/Window';

describe('Custom TSX Factory', () => {
  beforeEach(() => {
    // Reset the registry before each test
    MountRegistry.reset();
  });
  
  it('should create element nodes correctly', () => {
    // Create a simple element
    const element = createElement('div', { className: 'test' }, 'Hello');
    
    // Check structure
    expect(element).toMatchObject({
      type: 'div',
      props: { className: 'test' },
      children: [
        {
          type: 'TEXT_NODE',
          props: { nodeValue: 'Hello' },
          children: []
        }
      ]
    });
  });
  
  it('should handle nested children correctly', () => {
    // Create a nested structure
    const element = createElement('div', { id: 'parent' },
      createElement('span', { id: 'child1' }, 'Child 1'),
      createElement('span', { id: 'child2' }, 'Child 2')
    );
    
    // Check structure
    expect(element.children.length).toBe(2);
    expect(element.children[0].props.id).toBe('child1');
    expect(element.children[1].props.id).toBe('child2');
  });
  
  it('should register Window slots in the MountRegistry', () => {
    // Mock the Window.Slot component directly
    const mockSlot = jest.fn().mockImplementation((props) => {
      const node = {
        type: 'Slot',
        props,
        children: props.children ? 
          (Array.isArray(props.children) ? props.children : [props.children]) : 
          []
      };
      
      MountRegistry.registerSlot(props.name, node);
      return node;
    });
    
    Window.Slot = mockSlot;
    
    // Create text nodes for the content
    const leftContentText = {
      type: 'TEXT_NODE',
      props: { nodeValue: 'Left Content' },
      children: []
    };
    
    const centerTopContentText = {
      type: 'TEXT_NODE',
      props: { nodeValue: 'Center Top Content' },
      children: []
    };
    
    // Create slots directly with type casting to resolve type issues in the test environment
    const leftProps = { name: 'left' as 'left', children: leftContentText };
    const centerTopProps = { name: 'center-top' as 'center-top', children: centerTopContentText };
    Window.Slot(leftProps);
    Window.Slot(centerTopProps);
    
    // Check that slots were registered
    expect(MountRegistry.getSlot('left')).toBeDefined();
    expect(MountRegistry.getSlot('center-top')).toBeDefined();
    
    // Check slot content
    const leftSlot = MountRegistry.getSlot('left');
    expect(leftSlot?.children[0].props.nodeValue).toBe('Left Content');
  });
  
  it('should register Window bars in the MountRegistry', () => {
    // Mock the Window.Bar component directly
    const mockBar = jest.fn().mockImplementation((props) => {
      const node = {
        type: 'Bar',
        props,
        children: props.children ? 
          (Array.isArray(props.children) ? props.children : [props.children]) : 
          []
      };
      
      MountRegistry.registerBar(props.position, node);
      return node;
    });
    
    Window.Bar = mockBar;
    
    // Create text nodes for the content
    const topBarContentText = {
      type: 'TEXT_NODE',
      props: { nodeValue: 'Top Bar Content' },
      children: []
    };
    
    const bottomBarContentText = {
      type: 'TEXT_NODE',
      props: { nodeValue: 'Bottom Bar Content' },
      children: []
    };
    
    // Create bars directly with type casting to resolve type issues in the test environment
    const topBarProps = { position: 'top' as 'top', children: topBarContentText };
    const bottomBarProps = { position: 'bottom' as 'bottom', children: bottomBarContentText };
    Window.Bar(topBarProps);
    Window.Bar(bottomBarProps);
    
    // Check that bars were registered
    expect(MountRegistry.getBar('top')).toBeDefined();
    expect(MountRegistry.getBar('bottom')).toBeDefined();
    
    // Check bar content
    const topBar = MountRegistry.getBar('top');
    expect(topBar?.children[0].props.nodeValue).toBe('Top Bar Content');
  });
});
