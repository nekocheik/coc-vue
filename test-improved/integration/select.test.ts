/**
 * Enhanced integration tests for Select component
 * Tests component lifecycle, interactions, and state management
 */
import { withComponent, expectState, ComponentTestHelper } from '../utils/test-helpers';

describe('Select Component Integration', () => {
  // Test du cycle de vie du composant
  describe('Cycle de vie', () => {
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

  // Tests d'interaction avec le composant
  describe('Component Interactions', () => {
    let helper: ComponentTestHelper;
    let component: any;

    beforeEach(async () => {
      // Check initial state
      await withComponent('select', async (helper) => {
        // Vérifier l'état initial
        let state = await helper.getState();
        expect(state.is_open).toBe(false);
      });
    });

    it('should handle selection', async () => {
      await withComponent('select', async (helper) => {
        // Ouvrir le menu
        await helper.callMethod('open');
        
        // Sélectionner la deuxième option (index 1)
        await helper.callMethod('select_option', 1);
        
        // Vérifier la sélection
        const state = await helper.getState();
        expectState(state, {
          selected_index: 1,
          selected_value: 'value2',
          selected_text: 'Option 2',
          is_open: false // Le menu devrait se fermer après la sélection
        });
      });
    });

    it('should handle multi-selection', async () => {
      await withComponent('select', async (helper) => {
        // Créer un composant en mode multi-sélection
        await helper.createComponent({ multi: true });
        
        // Ouvrir le menu
        await helper.callMethod('open');
        
        // Sélectionner la première option
        await helper.callMethod('select_option', 0);
        let state = await helper.getState();
        expect(state.selected_options).toHaveLength(1);
        expect(state.selected_options[0].value).toBe('value1');
        
        // Le menu devrait rester ouvert en mode multi-sélection
        expect(state.is_open).toBe(true);
        
        // Sélectionner une autre option
        await helper.callMethod('select_option', 2);
        state = await helper.getState();
        expect(state.selected_options).toHaveLength(2);
        expect(state.selected_options[0].value).toBe('value1');
        expect(state.selected_options[1].value).toBe('value3');
      });
    });

    it('should handle navigational focus', async () => {
      await withComponent('select', async (helper) => {
        // Ouvrir le menu
        await helper.callMethod('open');
        
        // Focus sur la première option
        await helper.callMethod('focus_option', 0);
        let state = await helper.getState();
        expect(state.focused_index).toBe(0);
        
        // Passer à l'option suivante
        await helper.callMethod('focus_next_option');
        state = await helper.getState();
        expect(state.focused_index).toBe(1);
        
        // Passer à l'option suivante
        await helper.callMethod('focus_next_option');
        state = await helper.getState();
        expect(state.focused_index).toBe(2);
        
        // Revenir à l'option précédente
        await helper.callMethod('focus_prev_option');
        state = await helper.getState();
        expect(state.focused_index).toBe(1);
      });
    });
  });

  // Tests de mise à jour du composant
  describe('Component Updates', () => {
    it('should update options', async () => {
      await withComponent('select', async (helper) => {
        // État initial
        let state = await helper.getState();
        expect(state.options).toHaveLength(3);
        
        // Nouvelles options
        const newOptions = [
          { id: 'new1', text: 'Nouvelle Option 1', value: 'new_value1' },
          { id: 'new2', text: 'Nouvelle Option 2', value: 'new_value2' }
        ];
        
        // Mettre à jour les options
        await helper.callMethod('update_options', newOptions);
        
        // Vérifier la mise à jour
        state = await helper.getState();
        expect(state.options).toHaveLength(2);
        expect(state.options[0].id).toBe('new1');
        expect(state.options[1].id).toBe('new2');
      });
    });

    it('should update disabled state', async () => {
      await withComponent('select', async (helper) => {
        // État initial
        let state = await helper.getState();
        expect(state.disabled).toBe(false);
        
        // Désactiver le composant
        await helper.callMethod('set_disabled', true);
        
        // Vérifier que le composant est désactivé
        state = await helper.getState();
        expect(state.disabled).toBe(true);
        
        // Essayer d'ouvrir le menu désactivé (devrait échouer)
        await helper.callMethod('open');
        
        // Vérifier qu'il reste fermé
        state = await helper.getState();
        expect(state.is_open).toBe(false);
      });
    });
  });

  // Tests de gestion des événements
  describe('Événements', () => {
    it('devrait émettre des événements lors de l\'ouverture et de la fermeture', async () => {
      await withComponent('select', async (helper) => {
        // Effacer les événements existants
        await helper.getEvents();
        
        // Ouvrir le menu
        await helper.callMethod('open');
        
        // Vérifier l'événement d'ouverture
        const events = await helper.getEvents();
        const openEvent = events.find(e => e.type === 'select:opened');
        expect(openEvent).toBeTruthy();
        
        // Fermer le menu
        await helper.callMethod('close');
        
        // Vérifier l'événement de fermeture
        const newEvents = await helper.getEvents();
        const closeEvent = newEvents.find(e => e.type === 'select:closed');
        expect(closeEvent).toBeTruthy();
      });
    });

    it('devrait émettre un événement lors de la sélection d\'une option', async () => {
      await withComponent('select', async (helper) => {
        // Ouvrir le menu
        await helper.callMethod('open');
        
        // Effacer les événements d'ouverture
        await helper.getEvents();
        
        // Sélectionner une option
        await helper.callMethod('select_option', 1);
        
        // Vérifier l'événement de sélection
        const events = await helper.getEvents();
        const selectEvent = events.find(e => e.type === 'select:option_selected');
        expect(selectEvent).toBeTruthy();
        expect(selectEvent.payload.index).toBe(1);
        expect(selectEvent.payload.value).toBe('value2');
      });
    });
  });
});
