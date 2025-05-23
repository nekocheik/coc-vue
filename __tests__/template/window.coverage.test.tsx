/**
 * Window Component Coverage Tests
 * 
 * Testing Window component and subcomponents with type-safe approach
 */

import { createElement } from '../../template/tsxFactory';
import Window from '../../template/Window';

// Mock the MountRegistry
jest.mock('../../template/tsxFactory', () => {
  const actual = jest.requireActual('../../template/tsxFactory');
  return {
    ...actual,
    MountRegistry: {
      reset: jest.fn(),
      registerSlot: jest.fn(),
      registerBar: jest.fn(),
      getSlots: jest.fn().mockReturnValue({}),
      getBars: jest.fn().mockReturnValue({})
    }
  };
});

// Get the mocked MountRegistry
const { MountRegistry } = require('../../template/tsxFactory');

describe('Window Component Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Window Component', () => {
    it('should create a Window with default props', () => {
      const vnode = Window({});
      expect(vnode.type).toBe('Window');
      expect(MountRegistry.reset).toHaveBeenCalled();
    });

    it('should handle children as array', () => {
      const children = [
        { type: 'div', props: {}, children: [] },
        { type: 'span', props: {}, children: [] }
      ];
      const vnode = Window({ children });
      expect(vnode.children).toEqual(children);
    });

    it('should handle single child', () => {
      const child = { type: 'div', props: {}, children: [] };
      const vnode = Window({ children: child });
      expect(vnode.children).toEqual([child]);
    });

    it('should handle undefined children', () => {
      const vnode = Window({ children: undefined });
      expect(vnode.children).toEqual([]);
    });
  });

  describe('Slot Component', () => {
    it('should create a Slot with name prop', () => {
      const vnode = Window.Slot({ name: 'left' });
      expect(vnode.type).toBe('Slot');
      expect(vnode.props.name).toBe('left');
      expect(MountRegistry.registerSlot).toHaveBeenCalledWith('left', vnode);
    });

    it('should handle Slot with array children', () => {
      const children = [
        { type: 'div', props: {}, children: [] },
        { type: 'span', props: {}, children: [] }
      ];
      const vnode = Window.Slot({ name: 'center-top', children });
      expect(vnode.children).toEqual(children);
    });

    it('should handle Slot with single child', () => {
      const child = { type: 'div', props: {}, children: [] };
      const vnode = Window.Slot({ name: 'center-bottom', children: child });
      expect(vnode.children).toEqual([child]);
    });

    it('should handle Slot with undefined children', () => {
      const vnode = Window.Slot({ name: 'right', children: undefined });
      expect(vnode.children).toEqual([]);
    });

    it('should register all valid slot types', () => {
      const slotNames = ['left', 'center-top', 'center-bottom', 'right'];
      
      slotNames.forEach(name => {
        MountRegistry.registerSlot.mockClear();
        const vnode = Window.Slot({ name });
        expect(MountRegistry.registerSlot).toHaveBeenCalledWith(name, expect.anything());
      });
    });
  });

  describe('Bar Component', () => {
    it('should create a Bar with position prop', () => {
      const vnode = Window.Bar({ position: 'top' });
      expect(vnode.type).toBe('Bar');
      expect(vnode.props.position).toBe('top');
      expect(MountRegistry.registerBar).toHaveBeenCalledWith('top', vnode);
    });

    it('should handle Bar with array children', () => {
      const children = [
        { type: 'div', props: {}, children: [] },
        { type: 'span', props: {}, children: [] }
      ];
      const vnode = Window.Bar({ position: 'top', children });
      expect(vnode.children).toEqual(children);
    });

    it('should handle Bar with single child', () => {
      const child = { type: 'div', props: {}, children: [] };
      const vnode = Window.Bar({ position: 'bottom', children: child });
      expect(vnode.children).toEqual([child]);
    });

    it('should handle Bar with undefined children', () => {
      const vnode = Window.Bar({ position: 'bottom', children: undefined });
      expect(vnode.children).toEqual([]);
    });

    it('should register both bar positions', () => {
      const positions = ['top', 'bottom'];
      
      positions.forEach(position => {
        MountRegistry.registerBar.mockClear();
        const vnode = Window.Bar({ position });
        expect(MountRegistry.registerBar).toHaveBeenCalledWith(position, expect.anything());
      });
    });
  });

  describe('Tab Component', () => {
    it('should create a Tab with name prop', () => {
      const vnode = Window.Tab({ name: 'Tab 1' });
      expect(vnode.type).toBe('Tab');
      expect(vnode.props.name).toBe('Tab 1');
      expect(vnode.children).toEqual([]);
    });

    it('should create a Tab with active prop', () => {
      const vnode = Window.Tab({ name: 'Tab 2', active: true });
      expect(vnode.props.name).toBe('Tab 2');
      expect(vnode.props.active).toBe(true);
    });

    it('should create a Tab with additional props', () => {
      const vnode = Window.Tab({ 
        name: 'Tab 3', 
        className: 'custom-tab',
        id: 'tab-3'
      });
      expect(vnode.props.name).toBe('Tab 3');
      expect(vnode.props.className).toBe('custom-tab');
      expect(vnode.props.id).toBe('tab-3');
    });
  });

  describe('Tabs Component', () => {
    it('should create Tabs container with no children', () => {
      const vnode = Window.Tabs({});
      expect(vnode.type).toBe('Tabs');
      expect(vnode.children).toEqual([]);
    });

    it('should create Tabs with array children', () => {
      const children = [
        Window.Tab({ name: 'Tab 1' }),
        Window.Tab({ name: 'Tab 2', active: true })
      ];
      const vnode = Window.Tabs({ children });
      expect(vnode.children).toEqual(children);
    });

    it('should create Tabs with single child', () => {
      const child = Window.Tab({ name: 'Tab 1' });
      const vnode = Window.Tabs({ children: child });
      expect(vnode.children).toEqual([child]);
    });

    it('should create Tabs with undefined children', () => {
      const vnode = Window.Tabs({ children: undefined });
      expect(vnode.children).toEqual([]);
    });
  });

  describe('Status Component', () => {
    it('should create Status with no children', () => {
      const vnode = Window.Status({});
      expect(vnode.type).toBe('Status');
      expect(vnode.children).toEqual([]);
    });

    it('should create Status with array children', () => {
      const children = [
        { type: 'span', props: { className: 'status-icon' }, children: [] },
        { type: 'span', props: { className: 'status-text' }, children: [] }
      ];
      const vnode = Window.Status({ children });
      expect(vnode.children).toEqual(children);
    });

    it('should create Status with single child', () => {
      const child = { type: 'span', props: { className: 'status-text' }, children: [] };
      const vnode = Window.Status({ children: child });
      expect(vnode.children).toEqual([child]);
    });

    it('should create Status with undefined children', () => {
      const vnode = Window.Status({ children: undefined });
      expect(vnode.children).toEqual([]);
    });
  });

  describe('Integrated Component Usage', () => {
    it('should create a complete window layout', () => {
      // Reset tracking of MountRegistry calls
      jest.clearAllMocks();

      // Create window with all subcomponents
      const window = Window({
        title: 'Test Window',
        children: [
          Window.Bar({
            position: 'top',
            children: Window.Tabs({
              children: [
                Window.Tab({ name: 'Tab 1', active: true }),
                Window.Tab({ name: 'Tab 2' })
              ]
            })
          }),
          Window.Slot({ name: 'left' }),
          Window.Slot({ name: 'center-top' }),
          Window.Slot({ name: 'center-bottom' }),
          Window.Slot({ name: 'right' }),
          Window.Bar({
            position: 'bottom',
            children: Window.Status({
              children: { type: 'TEXT_NODE', props: { nodeValue: 'Ready' }, children: [] }
            })
          })
        ]
      });

      // Verify MountRegistry calls
      expect(MountRegistry.reset).toHaveBeenCalledTimes(1);
      expect(MountRegistry.registerSlot).toHaveBeenCalledTimes(4);
      expect(MountRegistry.registerBar).toHaveBeenCalledTimes(2);
      
      // Verify window structure
      expect(window.type).toBe('Window');
      expect(window.props.title).toBe('Test Window');
      expect(window.children).toHaveLength(6);
    });
  });
});
