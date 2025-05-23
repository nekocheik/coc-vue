/**
 * @jest-environment jsdom
 */

import Col from '../../template/vum/components/Col';
import Row from '../../template/vum/components/Row';
import Text from '../../template/vum/components/Text';
import { eventBridge } from '../../template/vum/events';

// Mock the eventBridge
jest.mock('../../template/vum/events', () => ({
  eventBridge: {
    sendToLua: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn()
  }
}));

// Define interface for mocked components
interface MockComponentInterface {
  id: string;
  props: any;
  render(): { lines: string[] };
}

describe('VUM Layout Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Col Component', () => {
    test('should initialize with props', () => {
      const col = new Col({
        className: 'test-col',
        children: []
      });

      // Verify Col was initialized with correct props
      expect(col.props).toEqual({
        className: 'test-col',
        children: []
      });
    });

    test('should send mount event to Lua', () => {
      const col = new Col({
        id: 'test-col',
        className: 'col-class'
      });

      // Verify sendToLua was called with mount event
      expect(eventBridge.sendToLua).toHaveBeenCalledWith(
        'mount',
        expect.any(String),
        expect.objectContaining({
          component_type: 'col',
          module: 'vue-ui.components.col',
          id: 'test-col',
          className: 'col-class'
        })
      );
    });

    test('should render fallback content', () => {
      const col = new Col({ children: [] }) as unknown as MockComponentInterface;
      const output = col.render();

      // Verify fallback rendering
      expect(output.lines).toEqual(['[Col component]']);
    });
    
    test('should have __isVum marker for renderer', () => {
      expect((Col as any).__isVum).toBe(true);
    });
  });

  describe('Row Component', () => {
    test('should initialize with props', () => {
      const row = new Row({
        className: 'test-row',
        children: []
      });

      // Verify Row was initialized with correct props
      expect(row.props).toEqual({
        className: 'test-row',
        children: []
      });
    });

    test('should send mount event to Lua', () => {
      const row = new Row({
        id: 'test-row',
        className: 'row-class'
      });

      // Verify sendToLua was called with mount event
      expect(eventBridge.sendToLua).toHaveBeenCalledWith(
        'mount',
        expect.any(String),
        expect.objectContaining({
          component_type: 'row',
          module: 'vue-ui.components.row',
          id: 'test-row',
          className: 'row-class'
        })
      );
    });

    test('should render fallback content', () => {
      const row = new Row({ children: [] }) as unknown as MockComponentInterface;
      const output = row.render();

      // Verify fallback rendering
      expect(output.lines).toEqual(['[Vum.Row fallback]']);
    });
    
    test('should have __isVum marker for renderer', () => {
      expect((Row as any).__isVum).toBe(true);
    });
  });

  describe('Text Component', () => {
    test('should initialize with props', () => {
      const text = new Text({
        value: 'Hello World',
        className: 'text-class'
      });

      // Verify Text was initialized with correct props
      expect(text.props).toEqual({
        value: 'Hello World',
        className: 'text-class'
      });
    });

    test('should send mount event to Lua', () => {
      const text = new Text({
        value: 'Hello World',
        id: 'test-text'
      });

      // Verify sendToLua was called with mount event
      expect(eventBridge.sendToLua).toHaveBeenCalledWith(
        'mount',
        expect.any(String),
        expect.objectContaining({
          component_type: 'text',
          module: 'vue-ui.components.text',
          value: 'Hello World',
          id: 'test-text'
        })
      );
    });

    test('should render fallback content with value', () => {
      const text = new Text({ value: 'Hello World' }) as unknown as MockComponentInterface;
      const output = text.render();

      // Verify fallback rendering includes the value
      expect(output.lines).toEqual(['[Text: Hello World]']);
    });
    
    test('should have __isVum marker for renderer', () => {
      expect((Text as any).__isVum).toBe(true);
    });
  });

  describe('Component lifecycle', () => {
    test('should send unmount event to Lua', () => {
      // Create component
      const component = new Text({ value: 'Test' });
      
      // Clear calls from initialization
      jest.clearAllMocks();
      
      // Call onUnmount (normally called by dispose)
      (component as any).onUnmount();
      
      // Verify unmount event sent to Lua
      expect(eventBridge.sendToLua).toHaveBeenCalledWith(
        'unmount',
        expect.any(String),
        expect.objectContaining({
          module: 'vue-ui.components.text'
        })
      );
    });
    
    test('should send Lua events on mount and unmount', () => {
      // Create component
      const component = new Col({
        children: []
      });
      
      // Clear calls from initialization
      jest.clearAllMocks();
      
      // Call onUnmount (normally called by dispose)
      (component as any).onUnmount();
      
      // Verify unmount event sent to Lua
      expect(eventBridge.sendToLua).toHaveBeenCalledWith(
        'unmount',
        expect.any(String),
        expect.objectContaining({
          module: 'vue-ui.components.col'
        })
      );
    });
  });
});
