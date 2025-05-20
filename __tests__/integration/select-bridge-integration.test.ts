// __tests__/integration/select-bridge-integration.test.ts
import getNeovimClient from '../utils/neovim-client-factory';
import { Select } from '../../src/components/select';
import { MessageType } from '../../src/bridge/core';

// Utiliser la factory pour obtenir le client approprié (mock ou réel)
const client = getNeovimClient();
type NeovimTestClientType = typeof client;

/**
 * Bridge integration tests for the Select component
 * These tests verify that the TypeScript Select component properly communicates
 * with the real Lua Select component through the bridge
 */
describe('Select Bridge Integration', () => {
  let client: NeovimTestClient;
  let bridgeMessageHandler: (message: any) => Promise<void>;
  let lastBridgeMessage: any = null;
  let lastLuaEvent: any = null;

  // Sample options for testing
  const sampleOptions = [
    { id: 'opt1', text: 'Option 1', value: 'value1' },
    { id: 'opt2', text: 'Option 2', value: 'value2' },
    { id: 'opt3', text: 'Option 3', value: 'value3' }
  ];

  // Mock the bridgeCore to intercept messages
  jest.mock('../../src/bridge/core', () => {
    const original = jest.requireActual('../../src/bridge/core');
    return {
      ...original,
      bridgeCore: {
        sendMessage: jest.fn(async (message: any) => {
          lastBridgeMessage = message;
          
          // Forward the message to the Neovim test server
          if (client) {
            try {
              // Convert TypeScript bridge message to Lua format
              const luaMessage = {
                type: 'call_method',
                id: message.id,
                method: message.action.split(':')[1],
                args: message.payload ? [message.payload] : []
              };
              
              // Send to Lua and get the result
              const result = await client.sendCommand(luaMessage);
              
              // Check for events
              const events = await client.sendCommand({ type: 'get_events' });
              if (events && events.events && events.events.length > 0) {
                // Process events from Lua
                for (const event of events.events) {
                  lastLuaEvent = event;
                  if (bridgeMessageHandler) {
                    // Convert Lua event to TypeScript format
                    const tsEvent = {
                      id: event.id,
                      type: MessageType.EVENT,
                      action: event.type,
                      payload: event.payload || {}
                    };
                    await bridgeMessageHandler(tsEvent);
                  }
                }
              }
              
              return result;
            } catch (err) {
              console.error('Error forwarding message to Neovim:', err);
              return { success: false, error: err.message };
            }
          }
          
          return {};
        }),
        registerHandler: jest.fn((id, handler) => {
          bridgeMessageHandler = handler;
        }),
        unregisterHandler: jest.fn(),
        receiveMessage: jest.fn()
      }
    };
  });

  beforeAll(async () => {
    // Connect to the Neovim server
    client = new NeovimTestClient();
    try {
      await client.connect();
      
      // Verify connection with a ping
      const isAlive = await client.ping();
      if (!isAlive) {
        throw new Error('Failed to connect to Neovim server - ping failed');
      }
      
      console.log('Successfully connected to Neovim test server');
    } catch (err) {
      console.error('Failed to connect to Neovim server:', err);
      throw err;
    }
  }, 10000); // Increase timeout for connection

  afterAll(() => {
    if (client) {
      client.disconnect();
      console.log('Disconnected from Neovim test server');
    }
  });

  beforeEach(() => {
    lastBridgeMessage = null;
    lastLuaEvent = null;
    jest.clearAllMocks();
  });

  describe('TypeScript to Lua Communication', () => {
    it('should create a Select component and send initialization to Lua', async () => {
      // Create a TypeScript Select component
      const select = new Select({
        id: 'ts_to_lua_test',
        title: 'TS to Lua Test',
        options: sampleOptions
      });
      
      // Mount the component (this should send a message to Lua)
      await select.mount();
      
      // Verify the message was sent to Lua
      expect(lastBridgeMessage).toBeTruthy();
      expect(lastBridgeMessage.id).toBe('ts_to_lua_test');
      expect(lastBridgeMessage.action).toBe('select:create');
      expect(lastBridgeMessage.payload.options).toEqual(sampleOptions);
      
      // Open the select
      await select.open();
      
      // Verify the open message was sent to Lua
      expect(lastBridgeMessage.action).toBe('select:open');
      
      // Select an option
      await select.selectOption(1);
      
      // Verify the select message was sent to Lua
      expect(lastBridgeMessage.action).toBe('select:selectOption');
      expect(lastBridgeMessage.payload.index).toBe(1);
      
      // Update options
      const newOptions = [...sampleOptions, { id: 'opt4', text: 'Option 4', value: 'value4' }];
      await select.updateOptions(newOptions);
      
      // Verify the update options message was sent to Lua
      expect(lastBridgeMessage.action).toBe('select:updateOptions');
      expect(lastBridgeMessage.payload.options).toEqual(newOptions);
      
      // Destroy the component
      await select.destroy();
      
      // Verify the destroy message was sent to Lua
      expect(lastBridgeMessage.action).toBe('select:destroy');
    });
  });

  describe('Lua to TypeScript Communication', () => {
    it('should update TypeScript component state when Lua component changes', async () => {
      // Create a TypeScript Select component
      const select = new Select({
        id: 'lua_to_ts_test',
        title: 'Lua to TS Test',
        options: sampleOptions
      });
      
      // Mount the component
      await select.mount();
      
      // Verify initial state
      expect(select.isOpen()).toBe(false);
      
      // Open the select from TypeScript
      await select.open();
      
      // Verify the state was updated
      expect(select.isOpen()).toBe(true);
      
      // Select an option from TypeScript
      await select.selectOption(2);
      
      // Verify the state was updated
      expect(select.selectedOptionIndex).toBe(2);
      expect(select.selectedValue).toBe('value3');
      expect(select.selectedText).toBe('Option 3');
      
      // Create a new select component for event testing
      const eventSelect = new Select({
        id: 'event_test',
        title: 'Event Test',
        options: sampleOptions
      });
      
      // Mount the component
      await eventSelect.mount();
      
      // Set up event spies
      const openSpy = jest.fn();
      const selectSpy = jest.fn();
      const closeSpy = jest.fn();
      
      // Create custom event handlers
      const originalUpdateState = eventSelect.updateState;
      eventSelect.updateState = function(newState: any) {
        // Call original method
        originalUpdateState.call(this, newState);
        
        // Emit events based on state changes
        if (newState.isOpen === true) {
          openSpy();
        } else if (newState.isOpen === false) {
          closeSpy();
        }
        
        if (newState.selectedOptionIndex !== undefined) {
          const option = this.options[newState.selectedOptionIndex];
          if (option) {
            selectSpy({
              index: newState.selectedOptionIndex,
              value: option.value,
              text: option.text
            });
          }
        }
      };
      
      // Open the select
      await eventSelect.open();
      
      // Verify the open event was emitted
      expect(openSpy).toHaveBeenCalled();
      
      // Select an option
      await eventSelect.selectOption(1);
      
      // Verify the select event was emitted
      expect(selectSpy).toHaveBeenCalledWith(expect.objectContaining({
        index: 1,
        value: 'value2',
        text: 'Option 2'
      }));
      
      // Verify the close event was emitted (single-select mode closes after selection)
      expect(closeSpy).toHaveBeenCalled();
    });
    
    it('should handle multi-select mode correctly', async () => {
      // Create a TypeScript multi-select component
      const multiSelect = new Select({
        id: 'multi_select_test',
        title: 'Multi-Select Test',
        options: sampleOptions,
        multi: true
      });
      
      // Mount the component
      await multiSelect.mount();
      
      // Open the select
      await multiSelect.open();
      
      // Select the first option
      await multiSelect.selectOption(0);
      
      // Verify the selection
      const selectedOptions = multiSelect.getSelectedOptions();
      expect(selectedOptions).toHaveLength(1);
      expect(selectedOptions[0].value).toBe('value1');
      
      // The dropdown should still be open in multi-select mode
      expect(multiSelect.isOpen()).toBe(true);
      
      // Select another option
      await multiSelect.selectOption(2);
      
      // Verify both options are selected
      const bothSelectedOptions = multiSelect.getSelectedOptions();
      expect(bothSelectedOptions).toHaveLength(2);
      expect(bothSelectedOptions[0].value).toBe('value1');
      expect(bothSelectedOptions[1].value).toBe('value3');
      
      // Toggle the first option off
      await multiSelect.selectOption(0);
      
      // Verify the option was deselected
      const finalSelectedOptions = multiSelect.getSelectedOptions();
      expect(finalSelectedOptions).toHaveLength(1);
      expect(finalSelectedOptions[0].value).toBe('value3');
    });
  });
});
