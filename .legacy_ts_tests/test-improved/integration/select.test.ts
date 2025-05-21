/**
 * Enhanced integration tests for Select component
 * Tests component lifecycle, interactions, and state management
 */
import { withComponent, expectState, ComponentTestHelper } from '../utils/test-helpers';

describe('Select Component Integration', () => {
  // Component lifecycle tests
  describe('Lifecycle', () => {
    it('should create a Select component', async () => {
      await withComponent('select', async (helper) => {
        const state = await helper.getState();
        expectState(state, {
          title: 'Test Select',
          is_open: false
        });
        expect(state.options).toHaveLength(3);
      });
    });
  });

  // Component interaction tests
  describe('Component Interactions', () => {
    let helper: ComponentTestHelper;
    let component: any;

    beforeEach(async () => {
      await withComponent('select', async (helper) => {
        // Check initial state
        let state = await helper.getState();
        expect(state.is_open).toBe(false);
      });
    });

    it('should handle selection', async () => {
      await withComponent('select', async (helper) => {
        // Open menu
        await helper.callMethod('open');
        
        // Select second option (index 1)
        await helper.callMethod('select_option', 1);
        
        // Verify selection
        const state = await helper.getState();
        expectState(state, {
          selected_index: 1,
          selected_value: 'value2',
          selected_text: 'Option 2',
          is_open: false // Menu should close after selection
        });
      });
    });

    it('should handle multi-selection', async () => {
      await withComponent('select', async (helper) => {
        // Create component in multi-selection mode
        await helper.createComponent({ multi: true });
        
        // Open menu
        await helper.callMethod('open');
        
        // Select first option
        await helper.callMethod('select_option', 0);
        let state = await helper.getState();
        expect(state.selected_options).toHaveLength(1);
        expect(state.selected_options[0].value).toBe('value1');
        
        // Menu should stay open in multi-selection mode
        expect(state.is_open).toBe(true);
        
        // Select another option
        await helper.callMethod('select_option', 2);
        state = await helper.getState();
        expect(state.selected_options).toHaveLength(2);
        expect(state.selected_options[0].value).toBe('value1');
        expect(state.selected_options[1].value).toBe('value3');
      });
    });

    it('should handle navigational focus', async () => {
      await withComponent('select', async (helper) => {
        // Open menu
        await helper.callMethod('open');
        
        // Focus first option
        await helper.callMethod('focus_option', 0);
        let state = await helper.getState();
        expect(state.focused_index).toBe(0);
        
        // Move to next option
        await helper.callMethod('focus_next_option');
        state = await helper.getState();
        expect(state.focused_index).toBe(1);
        
        // Move to next option
        await helper.callMethod('focus_next_option');
        state = await helper.getState();
        expect(state.focused_index).toBe(2);
        
        // Go back to previous option
        await helper.callMethod('focus_prev_option');
        state = await helper.getState();
        expect(state.focused_index).toBe(1);
      });
    });
  });

  // Component update tests
  describe('Component Updates', () => {
    it('should update options', async () => {
      await withComponent('select', async (helper) => {
        // Initial state
        let state = await helper.getState();
        expect(state.options).toHaveLength(3);
        
        // New options
        const newOptions = [
          { id: 'new1', text: 'New Option 1', value: 'new_value1' },
          { id: 'new2', text: 'New Option 2', value: 'new_value2' }
        ];
        
        // Update options
        await helper.callMethod('update_options', newOptions);
        
        // Verify update
        state = await helper.getState();
        expect(state.options).toHaveLength(2);
        expect(state.options[0].id).toBe('new1');
        expect(state.options[1].id).toBe('new2');
      });
    });

    it('should update disabled state', async () => {
      await withComponent('select', async (helper) => {
        // Initial state
        let state = await helper.getState();
        expect(state.disabled).toBe(false);
        
        // Disable component
        await helper.callMethod('set_disabled', true);
        
        // Verify component is disabled
        state = await helper.getState();
        expect(state.disabled).toBe(true);
        
        // Try to open disabled menu (should fail)
        await helper.callMethod('open');
        
        // Verify it stays closed
        state = await helper.getState();
        expect(state.is_open).toBe(false);
      });
    });
  });

  // Event handling tests
  describe('Events', () => {
    it('should emit events on open and close', async () => {
      await withComponent('select', async (helper) => {
        // Clear existing events
        await helper.getEvents();
        
        // Open menu
        await helper.callMethod('open');
        
        // Verify open event
        const events = await helper.getEvents();
        const openEvent = events.find(e => e.type === 'select:opened');
        expect(openEvent).toBeTruthy();
        
        // Close menu
        await helper.callMethod('close');
        
        // Verify close event
        const newEvents = await helper.getEvents();
        const closeEvent = newEvents.find(e => e.type === 'select:closed');
        expect(closeEvent).toBeTruthy();
      });
    });

    it('should emit event when selecting an option', async () => {
      await withComponent('select', async (helper) => {
        // Clear open events
        await helper.getEvents();
        
        // Open menu
        await helper.callMethod('open');
        
        // Select an option
        await helper.callMethod('select_option', 1);
        
        // Verify selection event
        const events = await helper.getEvents();
        const selectEvent = events.find(e => e.type === 'select:option_selected');
        expect(selectEvent).toBeTruthy();
        expect(selectEvent.payload.index).toBe(1);
        expect(selectEvent.payload.value).toBe('value2');
      });
    });
  });
});
