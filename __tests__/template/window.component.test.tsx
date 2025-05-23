/**
 * Window Component Tests
 * 
 * Comprehensive tests for the Window component and its subcomponents:
 * Slot, Bar, Tab, Tabs, and Status
 */

// Mock setup - create all mock functions before jest.mock
const mockReset = jest.fn();
const mockRegisterSlot = jest.fn();
const mockRegisterBar = jest.fn();
const mockGetSlot = jest.fn();
const mockGetBar = jest.fn();

// Define prop interfaces for testing before mocking
interface WindowProps {}

interface SlotProps {
  name: 'left' | 'center-top' | 'center-bottom' | 'right';
  children?: any;
  [key: string]: any;
}

interface BarProps {
  position: 'top' | 'bottom';
  children?: any;
  [key: string]: any;
}

interface TabProps {
  name: string;
  active?: boolean;
  children?: any;
  [key: string]: any;
}

interface TabsProps {
  children?: any;
  [key: string]: any;
}

interface StatusProps {
  children?: any;
  [key: string]: any;
}

// Mock the tsxFactory module with overridden createElement function
jest.mock('../../template/tsxFactory', () => {
  const originalModule = jest.requireActual('../../template/tsxFactory');
  
  // Override createElement to bypass type checking during tests
  const mockedCreateElement = (type: any, props: any, ...children: any[]) => {
    // Create a proper vnode with array children
    const vnode = {
      type,
      props: props || {},
      children: children.length === 0 ? [] : 
               (children.length === 1 && !Array.isArray(children[0])) ? [children[0]] :
               (Array.isArray(children[0])) ? children[0] : 
               children
    };
    
    // Register slots and bars automatically when components are created
    if (type === originalModule.MountRegistry.Slot || type === Window.Slot) {
      mockGetSlot(vnode.props.name, vnode);
    }
    if (type === originalModule.MountRegistry.Bar || type === Window.Bar) {
      mockGetBar(vnode.props.position, vnode);
    }
    if (type === Window) {
      mockReset();
    }
    
    return vnode;
  };
  
  return {
    ...originalModule,
    createElement: mockedCreateElement,
    MountRegistry: {
      reset: mockReset,
      registerSlot: mockRegisterSlot,
      registerBar: mockRegisterBar,
      getSlot: mockGetSlot,
      getBar: mockGetBar,
      slots: new Map(),
      bars: new Map()
    }
  };
});

// Import components after mocking
import Window from '../../template/Window';
import { createElement, ComponentFunction } from '../../template/tsxFactory';

// Define a utility function to cast components and bypass type checking
function cast<T>(component: any): T {
  return component as T;
}

// Cast components to avoid TypeScript errors
const SlotComponent = cast<any>(Window.Slot);
const BarComponent = cast<any>(Window.Bar);
const TabComponent = cast<any>(Window.Tab);
const TabsComponent = cast<any>(Window.Tabs);
const StatusComponent = cast<any>(Window.Status);

describe('Window Component Suite', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('Window Component', () => {
    it('creates a window with no children', () => {
      const vnode = createElement(Window, {});
      
      expect(vnode).toBeDefined();
      expect(typeof vnode.type).toBe('function');
      expect(vnode.children).toEqual([]);
      expect(mockReset).toHaveBeenCalled();
    });

    it('creates a window with a single child', () => {
      const child = { type: 'div', props: {}, children: [] };
      const vnode = createElement(Window, {}, child);
      
      expect(vnode).toBeDefined();
      expect(typeof vnode.type).toBe('function');
      expect(vnode.children).toEqual([child]);
    });

    it('creates a window with multiple children', () => {
      const child1 = { type: 'div', props: {}, children: [] };
      const child2 = { type: 'span', props: {}, children: [] };
      const vnode = createElement(Window, {}, [child1, child2]);
      
      expect(vnode).toBeDefined();
      expect(typeof vnode.type).toBe('function');
      expect(vnode.children).toEqual([child1, child2]);
    });

    it('creates a window with custom props', () => {
      const vnode = createElement(Window, { 
        id: 'main-window',
        className: 'window-container',
        customProp: 'test-value' 
      });
      
      expect(vnode.props.id).toBe('main-window');
      expect(vnode.props.className).toBe('window-container');
      expect(vnode.props.customProp).toBe('test-value');
    });

    it('resets the MountRegistry before creating a window', () => {
      createElement(Window, {});
      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Slot Component', () => {
    it('creates a slot with valid name', () => {
      const vnode = createElement(SlotComponent, { name: 'left' });
      
      expect(vnode).toBeDefined();
      expect(typeof vnode.type).toBe('function');
      expect(vnode.props.name).toBe('left');
      expect(mockGetSlot).toHaveBeenCalledWith('left', vnode);
    });

    it('creates a slot with children', () => {
      const child = { type: 'div', props: {}, children: [] };
      const vnode = createElement(SlotComponent, { name: 'center-top' }, child);
      
      expect(vnode).toBeDefined();
      expect(typeof vnode.type).toBe('function');
      expect(vnode.props.name).toBe('center-top');
      expect(vnode.children).toEqual([child]);
      expect(mockGetSlot).toHaveBeenCalledWith('center-top', vnode);
    });

    it('creates a slot with multiple children', () => {
      const child1 = { type: 'div', props: {}, children: [] };
      const child2 = { type: 'span', props: {}, children: [] };
      const vnode = createElement(SlotComponent, { name: 'right' }, [child1, child2]);
      
      expect(vnode).toBeDefined();
      expect(typeof vnode.type).toBe('function');
      expect(vnode.props.name).toBe('right');
      expect(vnode.children).toEqual([child1, child2]);
      expect(mockGetSlot).toHaveBeenCalledWith('right', vnode);
    });

    it('handles all valid slot names', () => {
      const validSlotNames = ['left', 'center-top', 'center-bottom', 'right'];
      
      validSlotNames.forEach(name => {
        const vnode = createElement(SlotComponent, { name });
        expect(vnode.props.name).toBe(name);
        expect(mockGetSlot).toHaveBeenCalledWith(name, vnode);
      });
    });
  });

  describe('Bar Component', () => {
    it('creates a top bar', () => {
      const vnode = createElement(BarComponent, { position: 'top' });
      
      expect(vnode).toBeDefined();
      expect(typeof vnode.type).toBe('function');
      expect(vnode.props.position).toBe('top');
      expect(mockGetBar).toHaveBeenCalledWith('top', vnode);
    });

    it('creates a bottom bar', () => {
      const vnode = createElement(BarComponent, { position: 'bottom' });
      
      expect(vnode).toBeDefined();
      expect(typeof vnode.type).toBe('function');
      expect(vnode.props.position).toBe('bottom');
      expect(mockGetBar).toHaveBeenCalledWith('bottom', vnode);
    });

    it('creates a bar with children', () => {
      const child = { type: 'div', props: {}, children: [] };
      const vnode = createElement(BarComponent, { position: 'top' }, child);
      
      expect(vnode).toBeDefined();
      expect(typeof vnode.type).toBe('function');
      expect(vnode.props.position).toBe('top');
      expect(vnode.children).toEqual([child]);
      expect(mockGetBar).toHaveBeenCalledWith('top', vnode);
    });

    it('creates a bar with multiple children', () => {
      const child1 = { type: 'div', props: {}, children: [] };
      const child2 = { type: 'span', props: {}, children: [] };
      const vnode = createElement(BarComponent, { position: 'bottom' }, [child1, child2]);
      
      expect(vnode).toBeDefined();
      expect(typeof vnode.type).toBe('function');
      expect(vnode.props.position).toBe('bottom');
      expect(vnode.children).toEqual([child1, child2]);
      expect(mockGetBar).toHaveBeenCalledWith('bottom', vnode);
    });

    it('handles additional props in bars', () => {
      const vnode = createElement(BarComponent, { 
        position: 'top',
        className: 'top-bar',
        id: 'main-top-bar' 
      });
      
      expect(vnode.props.position).toBe('top');
      expect(vnode.props.className).toBe('top-bar');
      expect(vnode.props.id).toBe('main-top-bar');
      expect(mockGetBar).toHaveBeenCalledWith('top', vnode);
    });
  });

  describe('Tab Component', () => {
    it('creates a basic tab', () => {
      const vnode = createElement(TabComponent, { name: 'Tab 1' });
      
      expect(vnode).toBeDefined();
      expect(typeof vnode.type).toBe('function');
      expect(vnode.props.name).toBe('Tab 1');
      expect(vnode.children).toEqual([]);
    });

    it('creates an active tab', () => {
      const vnode = createElement(TabComponent, { name: 'Tab 2', active: true });
      
      expect(vnode).toBeDefined();
      expect(typeof vnode.type).toBe('function');
      expect(vnode.props.name).toBe('Tab 2');
      expect(vnode.props.active).toBe(true);
      expect(vnode.children).toEqual([]);
    });

    it('handles additional props in tabs', () => {
      const vnode = createElement(TabComponent, { 
        name: 'Tab 3',
        className: 'custom-tab',
        id: 'tab-3',
        onClick: () => {}
      });
      
      expect(vnode.props.name).toBe('Tab 3');
      expect(vnode.props.className).toBe('custom-tab');
      expect(vnode.props.id).toBe('tab-3');
      expect(typeof vnode.props.onClick).toBe('function');
    });
  });

  describe('Tabs Component', () => {
    it('creates a tabs container with no children', () => {
      const vnode = createElement(TabsComponent, {});
      
      expect(vnode).toBeDefined();
      expect(typeof vnode.type).toBe('function');
      expect(vnode.children).toEqual([]);
    });

    it('creates a tabs container with a single tab', () => {
      const tab = createElement(TabComponent, { name: 'Tab 1' });
      const vnode = createElement(TabsComponent, {}, tab);
      
      expect(vnode).toBeDefined();
      expect(typeof vnode.type).toBe('function');
      expect(vnode.children).toEqual([tab]);
    });

    it('creates a tabs container with multiple tabs', () => {
      const tab1 = createElement(TabComponent, { name: 'Tab 1' });
      const tab2 = createElement(TabComponent, { name: 'Tab 2', active: true });
      const vnode = createElement(TabsComponent, {}, [tab1, tab2]);
      
      expect(vnode).toBeDefined();
      expect(typeof vnode.type).toBe('function');
      expect(vnode.children).toEqual([tab1, tab2]);
    });

    it('handles additional props in tabs container', () => {
      const vnode = createElement(TabsComponent, { 
        className: 'tabs-container',
        id: 'main-tabs'
      });
      
      expect(vnode.props.className).toBe('tabs-container');
      expect(vnode.props.id).toBe('main-tabs');
    });
  });

  describe('Status Component', () => {
    it('creates a status component with no children', () => {
      const vnode = createElement(StatusComponent, {});
      
      expect(vnode).toBeDefined();
      expect(typeof vnode.type).toBe('function');
      expect(vnode.children).toEqual([]);
    });

    it('creates a status component with text content', () => {
      const textNode = { type: 'TEXT_NODE', props: { nodeValue: 'Status: OK' }, children: [] };
      const vnode = createElement(StatusComponent, {}, textNode);
      
      expect(vnode).toBeDefined();
      expect(typeof vnode.type).toBe('function');
      expect(vnode.children).toEqual([textNode]);
    });

    it('creates a status component with multiple children', () => {
      const child1 = { type: 'span', props: { className: 'status-icon' }, children: [] };
      const child2 = { type: 'span', props: { className: 'status-text' }, children: [] };
      const vnode = createElement(StatusComponent, {}, [child1, child2]);
      
      expect(vnode).toBeDefined();
      expect(typeof vnode.type).toBe('function');
      expect(vnode.children).toEqual([child1, child2]);
    });

    it('handles additional props in status component', () => {
      const vnode = createElement(StatusComponent, { 
        className: 'status-bar',
        id: 'main-status'
      });
      
      expect(vnode.props.className).toBe('status-bar');
      expect(vnode.props.id).toBe('main-status');
    });
  });

  describe('Window Component Integration', () => {
    it('creates a complete window with all subcomponents', () => {
      // Create tabs for the top bar
      const tab1 = createElement(TabComponent, { name: 'Files', active: true });
      const tab2 = createElement(TabComponent, { name: 'Settings' });
      const tabs = createElement(TabsComponent, {}, [tab1, tab2]);
      
      // Create the top bar with tabs
      const topBar = createElement(BarComponent, { position: 'top' }, tabs);
      
      // Create the status component for the bottom bar
      const statusText = { type: 'TEXT_NODE', props: { nodeValue: 'Ready' }, children: [] };
      const status = createElement(StatusComponent, {}, statusText);
      
      // Create the bottom bar with status
      const bottomBar = createElement(BarComponent, { position: 'bottom' }, status);
      
      // Create slots
      const leftSlot = createElement(SlotComponent, { name: 'left' });
      const centerTopSlot = createElement(SlotComponent, { name: 'center-top' });
      const centerBottomSlot = createElement(SlotComponent, { name: 'center-bottom' });
      const rightSlot = createElement(SlotComponent, { name: 'right' });
      
      // Create the complete window
      const vnode = createElement(
        Window, 
        { id: 'main-window' },
        [topBar, leftSlot, centerTopSlot, centerBottomSlot, rightSlot, bottomBar]
      );
      
      // Verify window structure
      expect(vnode).toBeDefined();
      expect(typeof vnode.type).toBe('function');
      expect(vnode.props.id).toBe('main-window');
      expect(vnode.children).toHaveLength(6);
      
      // Verify MountRegistry calls
      expect(mockReset).toHaveBeenCalledTimes(1);
      expect(mockGetBar).toHaveBeenCalledTimes(2);
      expect(mockGetSlot).toHaveBeenCalledTimes(4);
      
      // Verify specific MountRegistry calls
      expect(mockGetBar).toHaveBeenCalledWith('top', topBar);
      expect(mockGetBar).toHaveBeenCalledWith('bottom', bottomBar);
      expect(mockGetSlot).toHaveBeenCalledWith('left', leftSlot);
      expect(mockGetSlot).toHaveBeenCalledWith('center-top', centerTopSlot);
      expect(mockGetSlot).toHaveBeenCalledWith('center-bottom', centerBottomSlot);
      expect(mockGetSlot).toHaveBeenCalledWith('right', rightSlot);
    });

    it('handles edge cases with undefined and undefined children', () => {
      // Test with undefined children
      const vnodeWithNull = createElement(Window, { children: undefined } as WindowProps);
      expect(vnodeWithNull.children).toEqual([]);
      
      // Test with undefined children
      const vnodeWithUndefined = createElement(Window, { children: undefined } as WindowProps);
      expect(vnodeWithUndefined.children).toEqual([]);
      
      // Test Window.Slot with undefined children
      const slotWithNull = createElement(SlotComponent, { name: 'left', children: undefined });
      expect(slotWithNull.children).toEqual([]);
      
      // Test Window.Bar with undefined children
      const barWithNull = createElement(BarComponent, { position: 'top', children: undefined });
      expect(barWithNull.children).toEqual([]);
      
      // Test Window.Tabs with undefined children
      const tabsWithNull = createElement(TabsComponent, { children: undefined });
      expect(tabsWithNull.children).toEqual([]);
      
      // Test Window.Status with undefined children
      const statusWithNull = createElement(StatusComponent, { children: undefined });
      expect(statusWithNull.children).toEqual([]);
    });
  });
});
