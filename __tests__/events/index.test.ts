/**
 * Tests for Events Module
 * 
 * This file contains tests for the events module that provides
 * event handling functionality for coc-vue.
 */

// Mock dependencies - must be before any imports that use them
jest.mock('coc.nvim', () => ({
  workspace: {
    nvim: {
      call: jest.fn(),
      command: jest.fn(),
      eval: jest.fn(),
      createBuffer: jest.fn(),
      createWindow: jest.fn(),
      lua: jest.fn(),
    },
    onDidOpenTextDocument: jest.fn(),
    onDidChangeTextDocument: jest.fn(),
    onDidCloseTextDocument: jest.fn(),
    registerKeymap: jest.fn(),
    registerAutocmd: jest.fn(),
    createOutputChannel: jest.fn(() => ({
      show: jest.fn(),
      append: jest.fn(),
      appendLine: jest.fn(),
      clear: jest.fn(),
      dispose: jest.fn(),
    })),
  },
  window: {
    showMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    createStatusBarItem: jest.fn(() => ({
      text: '',
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    })),
    createTerminal: jest.fn(),
    showQuickpick: jest.fn(),
    showInputBox: jest.fn(),
    showNotification: jest.fn(),
  },
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn(),
    getCommands: jest.fn(() => []),
  },
}));

// Import test utilities after mocks
import { resetAllMocks } from '../../helper-test/utils/test-utils';

// Import the module to test after mocks
import { EventEmitter, EventType, EventData, EventPayload } from '../../src/events/index';

// Get the mocked coc module
const coc = jest.requireMock('coc.nvim');

describe('Events Module', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Event Registration', () => {
    it('should register event listeners', () => {
      // Arrange
      const emitter = new EventEmitter<{
        'test:event': (data: any) => void
      }>();
      const handler = jest.fn();
      const eventName = 'test:event';
      
      // Act
      emitter.on(eventName, handler);
      
      // Assert
      expect(emitter['listeners'][eventName]).toContain(handler);
    });

    it('should register and trigger event listeners', () => {
      // Arrange
      const emitter = new EventEmitter<{
        'test:event': (data: any) => void
      }>();
      const handler = jest.fn();
      const eventName = 'test:event';
      const eventData = { data: 'test' };
      
      // Act
      emitter.on(eventName, handler);
      emitter.emit(eventName, eventData);
      
      // Assert
      expect(handler).toHaveBeenCalledWith(eventData);
    });

    it('should remove event listeners', () => {
      // Arrange
      const emitter = new EventEmitter<{
        'test:event': (data: any) => void
      }>();
      const handler = jest.fn();
      const eventName = 'test:event';
      emitter.on(eventName, handler);
      
      // Act
      emitter.off(eventName, handler);
      
      // Assert
      expect(emitter['listeners'][eventName]).not.toContain(handler);
    });

    it('should handle removing a listener from a non-existent event', () => {
      // Arrange
      const emitter = new EventEmitter<{
        'test:event': (data: any) => void
      }>();
      const handler = jest.fn();
      const nonExistentEventName = 'non:existent:event' as any;
      
      // Act & Assert - should not throw an error
      expect(() => {
        emitter.off(nonExistentEventName, handler);
      }).not.toThrow();
      
      // Verify the listeners object remains unchanged
      expect(emitter['listeners'][nonExistentEventName]).toBeUndefined();
    });

    it('should emit events to multiple listeners', () => {
      // Arrange
      const emitter = new EventEmitter<{
        'test:event': (data: any) => void
      }>();
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const eventName = 'test:event';
      const eventData = { data: 'test' };
      emitter.on(eventName, handler1);
      emitter.on(eventName, handler2);
      
      // Act
      emitter.emit(eventName, eventData);
      
      // Assert
      expect(handler1).toHaveBeenCalledWith(eventData);
      expect(handler2).toHaveBeenCalledWith(eventData);
    });

    it('should handle multiple event types', () => {
      // Arrange
      const emitter = new EventEmitter<{
        'test:event1': (data: any) => void,
        'test:event2': (data: any) => void
      }>();
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const eventData1 = { data: 'test1' };
      const eventData2 = { data: 'test2' };
      emitter.on('test:event1', handler1);
      emitter.on('test:event2', handler2);
      
      // Act
      emitter.emit('test:event1', eventData1);
      emitter.emit('test:event2', eventData2);
      
      // Assert
      expect(handler1).toHaveBeenCalledWith(eventData1);
      expect(handler2).toHaveBeenCalledWith(eventData2);
    });
  });

  describe('Event Types', () => {
    it('should have defined event types', () => {
      // Assert
      expect(EventType.COMPONENT_CREATED).toBeDefined();
      expect(EventType.COMPONENT_UPDATED).toBeDefined();
      expect(EventType.COMPONENT_DESTROYED).toBeDefined();
      expect(EventType.SELECT_OPEN).toBeDefined();
      expect(EventType.SELECT_CLOSE).toBeDefined();
    });

    it('should create valid event payloads', () => {
      // Arrange
      const eventData: EventData = {
        componentId: 'test-component',
        componentType: 'select',
        value: 'test-value'
      };
      
      const eventPayload: EventPayload = {
        type: EventType.COMPONENT_CREATED,
        data: eventData
      };
      
      // Assert
      expect(eventPayload.type).toBe(EventType.COMPONENT_CREATED);
      expect(eventPayload.data.componentId).toBe('test-component');
      expect(eventPayload.data.componentType).toBe('select');
    });

    it('should support complex event data', () => {
      // Arrange
      const eventData: EventData = {
        componentId: 'test-component',
        componentType: 'select',
        options: [
          { id: 'option1', text: 'Option 1', value: 'value1' },
          { id: 'option2', text: 'Option 2', value: 'value2' }
        ],
        selectedOption: { id: 'option1', text: 'Option 1', value: 'value1' }
      };
      
      const eventPayload: EventPayload = {
        type: EventType.SELECT_CHANGE,
        data: eventData
      };
      
      // Assert
      expect(eventPayload.data.options).toHaveLength(2);
      expect(eventPayload.data.selectedOption.id).toBe('option1');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in event listeners', () => {
      // Arrange
      const emitter = new EventEmitter<{
        'test:event': (data: any) => void
      }>();
      const handler = jest.fn().mockImplementation(() => {
        throw new Error('Event handler error');
      });
      const eventName = 'test:event';
      const eventData = { data: 'test' };
      emitter.on(eventName, handler);
      
      // Act & Assert - EventEmitter should swallow errors from handlers
      // and continue execution without throwing
      emitter.emit(eventName, eventData);
      
      // Verify the handler was called despite throwing an error
      expect(handler).toHaveBeenCalled();
    });

    it('should handle emitting an event with no listeners', () => {
      // Arrange
      const emitter = new EventEmitter<{
        'test:event': (data: any) => void
      }>();
      const eventName = 'test:event';
      const eventData = { data: 'test' };
      
      // Act & Assert - should not throw an error
      expect(() => {
        emitter.emit(eventName, eventData);
      }).not.toThrow();
    });
  });
});
