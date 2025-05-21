// __tests__/integration/select-integration.test.ts
import { NeovimTestClient } from '../utils/neovim-test-client';

/**
 * Real integration tests for the Select component
 * These tests communicate with a real Neovim instance running the Lua Select component
 */
describe('Select Component Real Integration', () => {
  let client: NeovimTestClient;
  let componentId: string;

  // Sample options for testing
  const sampleOptions = [
    { id: 'opt1', text: 'Option 1', value: 'value1' },
    { id: 'opt2', text: 'Option 2', value: 'value2' },
    { id: 'opt3', text: 'Option 3', value: 'value3' }
  ];

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

  describe('Component Lifecycle', () => {
    it('should create a Select component in Lua', async () => {
      // Load the real Lua Select component
      componentId = await client.loadComponent({
        id: 'test_select_lifecycle',
        title: 'Test Select Lifecycle',
        options: sampleOptions,
        style: 'default',
        placeholder: 'Select an option...',
        disabled: false,
        required: false,
        multi: false,
        maxVisibleOptions: 5
      });
      
      expect(componentId).toBeTruthy();
      
      // Get the component state
      const state = await client.getState(componentId);
      
      // Verify the component was created with the correct properties
      expect(state.title).toBe('Test Select Lifecycle');
      expect(state.options).toHaveLength(3);
      expect(state.is_open).toBe(false);
    });
  });

  describe('Component Interaction', () => {
    let selectComponentId: string;
    
    beforeEach(async () => {
      // Create a fresh component for each test
      selectComponentId = await client.loadComponent({
        id: 'test_select_interaction_' + Date.now(),
        title: 'Test Select Interaction',
        options: sampleOptions
      });
    });
    
    it('should open and close the select dropdown', async () => {
      // Initially closed
      let state = await client.getState(selectComponentId);
      expect(state.is_open).toBe(false);
      
      // Open the select
      await client.callMethod(selectComponentId, 'open');
      
      // Verify it's open
      state = await client.getState(selectComponentId);
      expect(state.is_open).toBe(true);
      
      // Close the select
      await client.callMethod(selectComponentId, 'close');
      
      // Verify it's closed
      state = await client.getState(selectComponentId);
      expect(state.is_open).toBe(false);
    });
    
    it('should select an option by index', async () => {
      // Open the select
      await client.callMethod(selectComponentId, 'open');
      
      // Select the second option (index 1)
      await client.callMethod(selectComponentId, 'select_option', 1);
      
      // Verify the selection
      const state = await client.getState(selectComponentId);
      expect(state.selected_index).toBe(1);
      expect(state.selected_value).toBe('value2');
      expect(state.selected_text).toBe('Option 2');
      
      // Verify the select was closed after selection (single-select mode)
      expect(state.is_open).toBe(false);
    });
    
    it('should focus options', async () => {
      // Open the select
      await client.callMethod(selectComponentId, 'open');
      
      // Focus the first option
      await client.callMethod(selectComponentId, 'focus_option', 0);
      
      // Verify the focus
      let state = await client.getState(selectComponentId);
      expect(state.focused_index).toBe(0);
      
      // Focus the next option
      await client.callMethod(selectComponentId, 'focus_next_option');
      
      // Verify the focus moved
      state = await client.getState(selectComponentId);
      expect(state.focused_index).toBe(1);
      
      // Focus the previous option
      await client.callMethod(selectComponentId, 'focus_prev_option');
      
      // Verify the focus moved back
      state = await client.getState(selectComponentId);
      expect(state.focused_index).toBe(0);
    });
    
    it('should select the currently focused option', async () => {
      // Open the select
      await client.callMethod(selectComponentId, 'open');
      
      // Focus the second option
      await client.callMethod(selectComponentId, 'focus_option', 1);
      
      // Select the focused option
      await client.callMethod(selectComponentId, 'select_focused_option');
      
      // Verify the selection
      const state = await client.getState(selectComponentId);
      expect(state.selected_index).toBe(1);
      expect(state.selected_value).toBe('value2');
    });
    
    it('should select an option by value', async () => {
      // Select by value
      await client.callMethod(selectComponentId, 'select_by_value', 'value3');
      
      // Verify the selection
      const state = await client.getState(selectComponentId);
      expect(state.selected_index).toBe(2);
      expect(state.selected_value).toBe('value3');
      expect(state.selected_text).toBe('Option 3');
    });
  });

  describe('Multi-Select Mode', () => {
    let multiSelectId: string;
    
    beforeEach(async () => {
      // Create a fresh multi-select component for each test
      multiSelectId = await client.loadComponent({
        id: 'test_multi_select_' + Date.now(),
        title: 'Test Multi-Select',
        options: sampleOptions,
        multi: true
      });
    });
    
    it('should select multiple options', async () => {
      // Open the select
      await client.callMethod(multiSelectId, 'open');
      
      // Select the first option
      await client.callMethod(multiSelectId, 'select_option', 0);
      
      // Verify the selection
      let state = await client.getState(multiSelectId);
      expect(state.selected_options).toHaveLength(1);
      expect(state.selected_options[0].value).toBe('value1');
      
      // The dropdown should still be open in multi-select mode
      expect(state.is_open).toBe(true);
      
      // Select another option
      await client.callMethod(multiSelectId, 'select_option', 2);
      
      // Verify both options are selected
      state = await client.getState(multiSelectId);
      expect(state.selected_options).toHaveLength(2);
      expect(state.selected_options[0].value).toBe('value1');
      expect(state.selected_options[1].value).toBe('value3');
    });
    
    it('should toggle selection when selecting the same option again', async () => {
      // Open the select
      await client.callMethod(multiSelectId, 'open');
      
      // Select the first option
      await client.callMethod(multiSelectId, 'select_option', 0);
      
      // Verify the selection
      let state = await client.getState(multiSelectId);
      expect(state.selected_options).toHaveLength(1);
      
      // Select the same option again to toggle it off
      await client.callMethod(multiSelectId, 'select_option', 0);
      
      // Verify the option was deselected
      state = await client.getState(multiSelectId);
      expect(state.selected_options).toHaveLength(0);
    });
  });

  describe('Component Updates', () => {
    let updateComponentId: string;
    
    beforeEach(async () => {
      // Create a fresh component for update tests
      updateComponentId = await client.loadComponent({
        id: 'test_select_updates_' + Date.now(),
        title: 'Test Select Updates',
        options: sampleOptions
      });
    });
    
    it('should update options', async () => {
      // Initial state
      let state = await client.getState(updateComponentId);
      expect(state.options).toHaveLength(3);
      
      // New options
      const newOptions = [
        { id: 'new1', text: 'New Option 1', value: 'new_value1' },
        { id: 'new2', text: 'New Option 2', value: 'new_value2' }
      ];
      
      // Update the options
      await client.callMethod(updateComponentId, 'update_options', newOptions);
      
      // Verify the options were updated
      state = await client.getState(updateComponentId);
      expect(state.options).toHaveLength(2);
      expect(state.options[0].id).toBe('new1');
      expect(state.options[1].id).toBe('new2');
    });
    
    it('should update disabled state', async () => {
      // Initial state
      let state = await client.getState(updateComponentId);
      expect(state.disabled).toBe(false);
      
      // Disable the component
      await client.callMethod(updateComponentId, 'set_disabled', true);
      
      // Verify the component is disabled
      state = await client.getState(updateComponentId);
      expect(state.disabled).toBe(true);
      
      // Try to open the disabled select (should fail)
      await client.callMethod(updateComponentId, 'open');
      
      // Verify it's still closed
      state = await client.getState(updateComponentId);
      expect(state.is_open).toBe(false);
    });
  });

  describe('Event Handling', () => {
    let eventComponentId: string;
    
    beforeEach(async () => {
      // Create a fresh component for event tests
      eventComponentId = await client.loadComponent({
        id: 'test_select_events_' + Date.now(),
        title: 'Test Select Events',
        options: sampleOptions
      });
      
      // Clear any existing events
      await client.getEvents();
    });
    
    it('should emit events when opened and closed', async () => {
      // Open the select
      await client.callMethod(eventComponentId, 'open');
      
      // Get events
      let events = await client.getEvents();
      
      // Find the open event
      const openEvent = events.find(e => e.type === 'select:opened' && e.id === eventComponentId);
      expect(openEvent).toBeTruthy();
      
      // Close the select
      await client.callMethod(eventComponentId, 'close');
      
      // Get events
      events = await client.getEvents();
      
      // Find the close event
      const closeEvent = events.find(e => e.type === 'select:closed' && e.id === eventComponentId);
      expect(closeEvent).toBeTruthy();
    });
    
    it('should emit events when an option is selected', async () => {
      // Open the select
      await client.callMethod(eventComponentId, 'open');
      
      // Clear events from opening
      await client.getEvents();
      
      // Select an option
      await client.callMethod(eventComponentId, 'select_option', 1);
      
      // Get events
      const events = await client.getEvents();
      
      // Find the selection event
      const selectEvent = events.find(e => e.type === 'select:option_selected' && e.id === eventComponentId);
      expect(selectEvent).toBeTruthy();
      expect(selectEvent.payload.index).toBe(1);
      expect(selectEvent.payload.value).toBe('value2');
    });
  });
});
