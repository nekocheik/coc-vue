// __tests__/bridge/core.test.ts
import { BridgeCore, BridgeMessage, MessageType } from '../../src/bridge/core';
import { mockNvim, mockWorkspace, resetAllMocks } from '../mocks/nvim';


describe('BridgeCore', () => {
  let bridgeCore: BridgeCore;
  
  beforeEach(() => {
    resetAllMocks();
    bridgeCore = BridgeCore.getInstance();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('sendMessage', () => {
    it('should send a message to Lua', async () => {
      const message: BridgeMessage = {
        id: 'test_component_1',
        type: MessageType.ACTION,
        action: 'test_action',
        payload: { value: 'test_value' }
      };
      
      await bridgeCore.sendMessage(message);
      
      // Check if the command was called with the correct arguments
      expect(mockNvim.commandCalls.length).toBe(1);
      expect(mockNvim.commandCalls[0]).toContain('lua return require(\'vue-ui.core.bridge\').receiveMessage');
      expect(mockNvim.commandCalls[0]).toContain('test_component_1');
      expect(mockNvim.commandCalls[0]).toContain('test_action');
      expect(mockNvim.commandCalls[0]).toContain('test_value');
    });
    
    it('should handle errors when sending a message', async () => {
      const message: BridgeMessage = {
        id: 'test_component_1',
        type: MessageType.ACTION,
        action: 'test_action',
        payload: { value: 'test_value' }
      };
      
      // Set up the mock to throw an error
      mockNvim.command = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await expect(bridgeCore.sendMessage(message)).rejects.toThrow('Test error');
    });
  });
  
  describe('receiveMessage', () => {
    it('should process a received message and call the appropriate handlers', async () => {
      const message: BridgeMessage = {
        id: 'test_component_1',
        type: MessageType.EVENT,
        action: 'test_event',
        payload: { value: 'test_value' }
      };
      
      const serializedMessage = JSON.stringify(message);
      
      // Register a handler for the test_event action
      const handler = jest.fn();
      bridgeCore.registerHandler('test_event', handler);
      
      await bridgeCore.receiveMessage(serializedMessage);
      
      // Check if the handler was called with the correct message
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(message);
    });
    
    it('should call global handlers for all received messages', async () => {
      const message: BridgeMessage = {
        id: 'test_component_1',
        type: MessageType.EVENT,
        action: 'test_event',
        payload: { value: 'test_value' }
      };
      
      const serializedMessage = JSON.stringify(message);
      
      // Register a global handler
      const globalHandler = jest.fn();
      bridgeCore.registerGlobalHandler(globalHandler);
      
      await bridgeCore.receiveMessage(serializedMessage);
      
      // Check if the global handler was called with the correct message
      expect(globalHandler).toHaveBeenCalledTimes(1);
      expect(globalHandler).toHaveBeenCalledWith(message);
    });
    
    it('should handle invalid JSON in received messages', async () => {
      const invalidMessage = 'not valid json';
      
      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await bridgeCore.receiveMessage(invalidMessage);
      
      // Check if the error was logged
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('[BridgeCore] Error receiving message');
      
      consoleErrorSpy.mockRestore();
    });
  });
  
  describe('handler registration', () => {
    it('should register and unregister action handlers', async () => {
      const message: BridgeMessage = {
        id: 'test_component_1',
        type: MessageType.EVENT,
        action: 'test_event',
        payload: { value: 'test_value' }
      };
      
      const serializedMessage = JSON.stringify(message);
      
      // Register a handler
      const handler = jest.fn();
      bridgeCore.registerHandler('test_event', handler);
      
      // First call should trigger the handler
      await bridgeCore.receiveMessage(serializedMessage);
      expect(handler).toHaveBeenCalledTimes(1);
      
      // Unregister the handler
      bridgeCore.unregisterHandler('test_event', handler);
      
      // Reset the mock
      handler.mockReset();
      
      // Second call should not trigger the handler
      await bridgeCore.receiveMessage(serializedMessage);
      expect(handler).not.toHaveBeenCalled();
    });
    
    it('should register and unregister global handlers', async () => {
      const message: BridgeMessage = {
        id: 'test_component_1',
        type: MessageType.EVENT,
        action: 'test_event',
        payload: { value: 'test_value' }
      };
      
      const serializedMessage = JSON.stringify(message);
      
      // Register a global handler
      const globalHandler = jest.fn();
      bridgeCore.registerGlobalHandler(globalHandler);
      
      // First call should trigger the handler
      await bridgeCore.receiveMessage(serializedMessage);
      expect(globalHandler).toHaveBeenCalledTimes(1);
      
      // Unregister the handler
      bridgeCore.unregisterGlobalHandler(globalHandler);
      
      // Reset the mock
      globalHandler.mockReset();
      
      // Second call should not trigger the handler
      await bridgeCore.receiveMessage(serializedMessage);
      expect(globalHandler).not.toHaveBeenCalled();
    });
  });
});
