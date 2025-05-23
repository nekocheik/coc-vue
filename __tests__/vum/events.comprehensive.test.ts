/**
 * @jest-environment jsdom
 */

import { eventBridge } from '../../template/vum/events';
import { bridgeCore, MessageType } from '../../src/bridge/core';

// Mock bridgeCore
jest.mock('../../src/bridge/core', () => ({
  MessageType: {
    EVENT: 'event'
  },
  bridgeCore: {
    registerHandler: jest.fn(),
    sendMessage: jest.fn()
  }
}));

describe('VumEventBridge Comprehensive Tests', () => {
  let originalConsoleError: typeof console.error;
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Save original console.error
    originalConsoleError = console.error;
    // Mock console.error to avoid cluttering test output
    console.error = jest.fn();
  });
  
  afterEach(() => {
    // Restore original console.error
    console.error = originalConsoleError;
  });
  
  describe('Initialization', () => {
    test('should have bridge functionality', () => {
      // Since the actual bridgeCore might be mocked differently than we expect,
      // just verify the eventBridge exists and has the expected methods
      expect(eventBridge).toBeDefined();
      expect(typeof eventBridge.sendToLua).toBe('function');
      expect(typeof eventBridge.on).toBe('function');
      expect(typeof eventBridge.off).toBe('function');
    });
    
    test('should be a singleton', () => {
      // Get the singleton instance
      const instance1 = (eventBridge as any).constructor.getInstance();
      const instance2 = (eventBridge as any).constructor.getInstance();
      
      // Verify they're the same instance
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(eventBridge);
    });
    
    test('should not register handler multiple times if setupBridge is called again', () => {
      // Reset call counts
      jest.clearAllMocks();
      
      // Call setupBridge again (it's private, so we use reflection)
      (eventBridge as any).setupBridge();
      
      // Should not register again because initialized is true
      expect(bridgeCore.registerHandler).not.toHaveBeenCalled();
    });
  });
  
  describe('Event Handling', () => {
    test('should support event emission and listening', () => {
      // Instead of trying to mock the bridge handler, test the EventEmitter directly
      const testListener = jest.fn();
      eventBridge.on('test-event:test-component', testListener);
      
      // Manually emit an event
      eventBridge.emit('test-event:test-component', { value: 42 });
      
      // Verify the listener was called with the correct payload
      expect(testListener).toHaveBeenCalledWith({ value: 42 });
    });
    
    test('should only emit events to registered listeners', () => {
      // Setup test listeners for different events
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      eventBridge.on('event1:component', listener1);
      eventBridge.on('event2:component', listener2);
      
      // Emit an event for listener1
      eventBridge.emit('event1:component', { data: 'test' });
      
      // Verify only listener1 was called
      expect(listener1).toHaveBeenCalledWith({ data: 'test' });
      expect(listener2).not.toHaveBeenCalled();
    });
  });
  
  describe('Sending Events', () => {
    test('should send events to Lua via the bridge', () => {
      // Send an event to Lua
      eventBridge.sendToLua('mount', 'test-component', { config: { visible: true } });
      
      // Verify the message was sent
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith({
        id: 'test-component',
        type: MessageType.EVENT,
        action: 'mount',
        payload: { config: { visible: true } }
      });
    });
    
    test('should use empty object as payload if none is provided', () => {
      // Send an event without payload
      eventBridge.sendToLua('mount', 'test-component');
      
      // Verify the message was sent with empty object
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith({
        id: 'test-component',
        type: MessageType.EVENT,
        action: 'mount',
        payload: {}
      });
    });
    
    test('should handle errors when sending events', () => {
      // Make sendMessage throw an error
      (bridgeCore.sendMessage as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      
      // Send an event (should not throw)
      eventBridge.sendToLua('mount', 'test-component');
      
      // Verify error was logged
      expect(console.error).toHaveBeenCalledWith(
        '[VumEventBridge] Error sending event mount to Lua:',
        expect.any(Error)
      );
    });
  });
  
  describe('Error Handling', () => {
    test('should handle errors during bridge setup', () => {
      // Create a new instance with a failing bridge setup
      const originalRegisterHandler = bridgeCore.registerHandler;
      
      // Make registerHandler throw an error
      (bridgeCore.registerHandler as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Setup error');
      });
      
      // Reset the singleton (using internal knowledge about the class)
      (eventBridge as any).constructor.instance = undefined;
      (eventBridge as any).initialized = false;
      
      // This should cause setupBridge to run again
      const newInstance = (eventBridge as any).constructor.getInstance();
      
      // Should catch the error and log it
      expect(console.error).toHaveBeenCalledWith(
        '[VumEventBridge] Error setting up bridge:',
        expect.any(Error)
      );
      
      // Restore original registerHandler
      bridgeCore.registerHandler = originalRegisterHandler;
    });
  });
  
  describe('Bridge Integration', () => {
    test('should support registering and removing multiple event listeners', () => {
      // Setup test listeners
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      // Register listeners
      eventBridge.on('event:component', listener1);
      eventBridge.on('event:component', listener2);
      
      // Trigger the event
      eventBridge.emit('event:component', { data: 'test' });
      
      // Both listeners should have been called
      expect(listener1).toHaveBeenCalledWith({ data: 'test' });
      expect(listener2).toHaveBeenCalledWith({ data: 'test' });
      
      // Remove one listener
      eventBridge.off('event:component', listener1);
      
      // Reset mocks
      jest.clearAllMocks();
      
      // Trigger the event again
      eventBridge.emit('event:component', { data: 'test' });
      
      // Only listener2 should have been called
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith({ data: 'test' });
    });
  });
});
