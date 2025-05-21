// __tests__/bridge/select-bridge.test.ts
import { bridgeCore, BridgeMessage, MessageType } from '../../src/bridge/core';
import { Select } from '../../src/components/select';
import { mockNvim, mockWorkspace, mockWindow, resetAllMocks } from '../mocks/nvim';


// Mock bridgeCore
jest.mock('../../src/bridge/core', () => {
  const original = jest.requireActual('../../src/bridge/core');
  return {
    ...original,
    bridgeCore: {
      sendMessage: jest.fn().mockResolvedValue({}),
      registerHandler: jest.fn(),
      unregisterHandler: jest.fn(),
      receiveMessage: jest.fn()
    }
  };
});

describe('Select Bridge Integration', () => {
  // Sample options for testing
  const sampleOptions = [
    { id: 'opt1', text: 'Option 1', value: 'value1' },
    { id: 'opt2', text: 'Option 2', value: 'value2' },
    { id: 'opt3', text: 'Option 3', value: 'value3' }
  ];
  
  beforeEach(() => {
    resetAllMocks();
    
    // Set up buffer creation mock
    mockNvim.callResults.set('nvim_create_buf:[false,true]', 1);
    mockNvim.callResults.set('nvim_get_option:columns', 80);
    mockNvim.callResults.set('nvim_get_option:lines', 24);
    mockNvim.callResults.set('nvim_open_win:[1,false,{"relative":"editor","width":40,"height":10,"col":20,"row":7,"style":"minimal","border":"rounded"}]', 2);
    
    // Mock console.log to track calls
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    (console.log as jest.Mock).mockRestore();
    (console.error as jest.Mock).mockRestore();
  });
  
  describe('TypeScript to Lua Communication', () => {
    it('should send properly formatted messages from TypeScript to Lua', async () => {
      // Create select component
      const select = new Select({
        id: 'bridge_test',
        title: 'Bridge Test',
        options: sampleOptions
      });
      
      // Mount the component
      await select.mount();
      
      // Verify initialization message
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'bridge_test',
        type: MessageType.ACTION,
        action: 'select:create',
        payload: expect.objectContaining({
          id: 'bridge_test',
          title: 'Bridge Test',
          options: sampleOptions
        })
      }));
      
      // Reset mock to clear mount message
      (bridgeCore.sendMessage as jest.Mock).mockClear();
      
      // Open the select
      await select.open();
      
      // Verify open message
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'bridge_test',
        type: MessageType.ACTION,
        action: 'select:open',
        payload: expect.any(Object)
      }));
      
      // Reset mock
      (bridgeCore.sendMessage as jest.Mock).mockClear();
      
      // Select an option
      await select.selectOption(1);
      
      // Verify select message
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'bridge_test',
        type: MessageType.ACTION,
        action: 'select:selectOption',
        payload: { index: 1 }
      }));
      
      // Reset mock
      (bridgeCore.sendMessage as jest.Mock).mockClear();
      
      // Update options
      const newOptions = [...sampleOptions, { id: 'opt4', text: 'Option 4', value: 'value4' }];
      await select.updateOptions(newOptions);
      
      // Verify update options message
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'bridge_test',
        type: MessageType.ACTION,
        action: 'select:updateOptions',
        payload: { options: newOptions }
      }));
      
      // Reset mock
      (bridgeCore.sendMessage as jest.Mock).mockClear();
      
      // Destroy the component
      await select.destroy();
      
      // Verify destroy message
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'bridge_test',
        type: MessageType.ACTION,
        action: 'select:destroy',
        payload: expect.any(Object)
      }));
    });
  });
  
  describe('Lua to TypeScript Communication', () => {
    it('should handle messages from Lua and update component state', async () => {
      // Create select component
      const select = new Select({
        id: 'lua_to_ts_test',
        title: 'Lua to TS Test',
        options: sampleOptions
      });
      
      // Mount the component
      await select.mount();
      
      // Capture the handler registration
      const handlerRegistration = (bridgeCore.registerHandler as jest.Mock).mock.calls.find(
        call => call[0] === `select:${select.id}`
      );
      
      expect(handlerRegistration).toBeTruthy();
      
      // Get the handler function
      const handler = handlerRegistration[1];
      
      // Simulate a message from Lua: select opened
      await handler({
        id: 'lua_to_ts_test',
        type: MessageType.EVENT,
        action: 'select:opened',
        payload: {}
      });
      
      // Verify component state was updated
      expect(select.isOpen()).toBe(true);
      
      // Simulate a message from Lua: option selected
      await handler({
        id: 'lua_to_ts_test',
        type: MessageType.EVENT,
        action: 'select:optionSelected',
        payload: { index: 2 }
      });
      
      // Verify component state was updated
      expect(select.selectedOptionIndex).toBe(2);
      expect(select.selectedValue).toBe('value3');
      expect(select.selectedText).toBe('Option 3');
      
      // Simulate a message from Lua: select closed
      await handler({
        id: 'lua_to_ts_test',
        type: MessageType.EVENT,
        action: 'select:closed',
        payload: {}
      });
      
      // Verify component state was updated
      expect(select.isOpen()).toBe(false);
    });
    
    it('should handle multi-select messages from Lua', async () => {
      // Create multi-select component
      const select = new Select({
        id: 'multi_select_test',
        title: 'Multi-Select Test',
        options: sampleOptions,
        multi: true
      });
      
      // Mount the component
      await select.mount();
      
      // Capture the handler registration
      const handlerRegistration = (bridgeCore.registerHandler as jest.Mock).mock.calls.find(
        call => call[0] === `select:${select.id}`
      );
      
      // Get the handler function
      const handler = handlerRegistration[1];
      
      // Simulate a message from Lua: select opened
      await handler({
        id: 'multi_select_test',
        type: MessageType.EVENT,
        action: 'select:opened',
        payload: {}
      });
      
      // Simulate a message from Lua: first option selected
      await handler({
        id: 'multi_select_test',
        type: MessageType.EVENT,
        action: 'select:optionSelected',
        payload: { index: 0 }
      });
      
      // Verify first option was selected
      expect(select.getSelectedOptions().length).toBe(1);
      expect(select.getSelectedOptions()[0].id).toBe('opt1');
      
      // Simulate a message from Lua: second option selected
      await handler({
        id: 'multi_select_test',
        type: MessageType.EVENT,
        action: 'select:optionSelected',
        payload: { index: 1 }
      });
      
      // Verify both options are selected
      expect(select.getSelectedOptions().length).toBe(2);
      expect(select.getSelectedOptions()[0].id).toBe('opt1');
      expect(select.getSelectedOptions()[1].id).toBe('opt2');
      
      // Simulate a message from Lua: first option deselected
      await handler({
        id: 'multi_select_test',
        type: MessageType.EVENT,
        action: 'select:optionSelected',
        payload: { index: 0 }
      });
      
      // Verify only second option remains selected
      expect(select.getSelectedOptions().length).toBe(1);
      expect(select.getSelectedOptions()[0].id).toBe('opt2');
    });
  });
  
  describe('End-to-End Bridge Flow', () => {
    it('should demonstrate a complete interaction flow', async () => {
      // Create select component
      const select = new Select({
        id: 'e2e_test',
        title: 'E2E Test',
        options: sampleOptions
      });
      
      // Mount the component
      await select.mount();
      
      // Capture the handler registration
      const handlerRegistration = (bridgeCore.registerHandler as jest.Mock).mock.calls.find(
        call => call[0] === `select:${select.id}`
      );
      
      // Get the handler function
      const handler = handlerRegistration[1];
      
      // Step 1: TypeScript sends open command to Lua
      (bridgeCore.sendMessage as jest.Mock).mockClear();
      await select.open();
      
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'e2e_test',
        action: 'select:open'
      }));
      
      // Step 2: Lua responds that select was opened
      await handler({
        id: 'e2e_test',
        type: MessageType.EVENT,
        action: 'select:opened',
        payload: {}
      });
      
      expect(select.isOpen()).toBe(true);
      
      // Step 3: TypeScript sends focus command to Lua
      (bridgeCore.sendMessage as jest.Mock).mockClear();
      await select.focusOption(1);
      
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'e2e_test',
        action: 'select:focusOption',
        payload: { index: 1 }
      }));
      
      // Step 4: Lua responds with focus changed event
      await handler({
        id: 'e2e_test',
        type: MessageType.EVENT,
        action: 'select:optionFocused',
        payload: { index: 1 }
      });
      
      // Step 5: TypeScript sends select command to Lua
      (bridgeCore.sendMessage as jest.Mock).mockClear();
      await select.selectOption(1);
      
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'e2e_test',
        action: 'select:selectOption',
        payload: { index: 1 }
      }));
      
      // Step 6: Lua responds with option selected event
      await handler({
        id: 'e2e_test',
        type: MessageType.EVENT,
        action: 'select:optionSelected',
        payload: { index: 1 }
      });
      
      expect(select.selectedValue).toBe('value2');
      
      // Step 7: Lua sends close event
      await handler({
        id: 'e2e_test',
        type: MessageType.EVENT,
        action: 'select:closed',
        payload: {}
      });
      
      expect(select.isOpen()).toBe(false);
      
      // Step 8: TypeScript destroys the component
      (bridgeCore.sendMessage as jest.Mock).mockClear();
      await select.destroy();
      
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'e2e_test',
        action: 'select:destroy'
      }));
    });
  });
});
