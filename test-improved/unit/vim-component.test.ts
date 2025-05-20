/**
 * Tests unitaires améliorés pour le composant VimComponent
 * Ces tests utilisent la nouvelle structure et les mocks améliorés
 * pour réduire les logs et améliorer la lisibilité
 */
import { VimComponent, ComponentOptions } from '../mocks/vim-component';
import { mockNvim, mockWorkspace, resetAllMocks } from '../mocks/coc';
import { bridgeCore, MessageType, BridgeMessage } from '../mocks/bridge-core';

describe('VimComponent', () => {
  // Réinitialiser les mocks avant chaque test
  beforeEach(() => {
    resetAllMocks();
    bridgeCore.resetMocks();
    
    // Configurer les mocks pour les appels courants
    mockNvim.call.mockImplementation((method, args) => {
      if (method === 'nvim_create_buf') return Promise.resolve(1);
      if (method === 'nvim_open_win') return Promise.resolve(2);
      if (method === 'nvim_buf_set_lines') return Promise.resolve(null);
      return Promise.resolve(null);
    });
  });
  
  describe('Cycle de vie', () => {
    it('devrait appeler les hooks du cycle de vie dans le bon ordre', async () => {
      // Créer des mocks pour les hooks
      const hooks = {
        beforeMount: jest.fn(),
        onMounted: jest.fn(),
        onUpdated: jest.fn(),
        onBeforeDestroy: jest.fn(),
        onDestroyed: jest.fn()
      };
      
      // Créer les options du composant
      const options: ComponentOptions = {
        id: 'test_lifecycle',
        type: 'test',
        state: { message: 'Hello World' },
        hooks: {
          beforeMount: hooks.beforeMount,
          onMounted: hooks.onMounted,
          onUpdated: hooks.onUpdated,
          onBeforeDestroy: hooks.onBeforeDestroy,
          onDestroyed: hooks.onDestroyed
        },
        render: (state) => [`${state.message}`]
      };
      
      // Créer le composant
      const component = new VimComponent(options);
      
      // Monter le composant
      await component.mount();
      
      // Vérifier l'ordre des hooks de montage
      expect(hooks.beforeMount).toHaveBeenCalledTimes(1);
      expect(hooks.onMounted).toHaveBeenCalledTimes(1);
      expect(hooks.onUpdated).toHaveBeenCalledTimes(1);
      expect(hooks.onBeforeDestroy).not.toHaveBeenCalled();
      expect(hooks.onDestroyed).not.toHaveBeenCalled();
      
      // Vérifier la création du buffer
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_create_buf', [false, true]);
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Hello World']]);
      
      // Vérifier l'événement de montage
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test_lifecycle',
        type: MessageType.EVENT,
        action: 'component:mounted'
      }));
      
      // Mettre à jour l'état
      await component.updateState({ message: 'Updated Message' });
      
      // Vérifier le hook de mise à jour
      expect(hooks.onUpdated).toHaveBeenCalledTimes(2);
      
      // Vérifier la mise à jour du buffer
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Updated Message']]);
      
      // Détruire le composant
      await component.destroy();
      
      // Vérifier les hooks de destruction
      expect(hooks.onBeforeDestroy).toHaveBeenCalledTimes(1);
      expect(hooks.onDestroyed).toHaveBeenCalledTimes(1);
      
      // Vérifier le nettoyage de la fenêtre/buffer
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_win_close', [2, true]);
      expect(mockNvim.command).toHaveBeenCalledWith('silent! bdelete! 1');
      
      // Vérifier l'événement de destruction
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test_lifecycle',
        type: MessageType.EVENT,
        action: 'component:destroyed'
      }));
    });
  });
  
  describe('Réactivité', () => {
    it('devrait mettre à jour le buffer quand l\'état change', async () => {
      // Créer une fonction de rendu mock
      const renderFn = jest.fn().mockImplementation(state => [`Count: ${state.count}`]);
      
      // Créer les options du composant
      const options: ComponentOptions = {
        id: 'counter',
        type: 'counter',
        state: { count: 0 },
        render: renderFn
      };
      
      // Créer le composant
      const component = new VimComponent(options);
      await component.mount();
      
      // Vérifier le rendu initial
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Count: 0']]);
      
      // Mettre à jour l'état
      await component.updateState({ count: 1 });
      
      // Vérifier le re-rendu
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Count: 1']]);
      
      // Vérifier que la fonction de rendu a été appelée deux fois
      expect(renderFn).toHaveBeenCalledTimes(2);
    });
    
    it('devrait prendre en charge les propriétés calculées', async () => {
      // Créer les options du composant avec une propriété calculée
      const options: ComponentOptions = {
        id: 'computed_test',
        type: 'computed',
        state: { 
          firstName: 'John',
          lastName: 'Doe'
        },
        computed: {
          fullName: function(this: VimComponent) {
            return `${this.state.firstName} ${this.state.lastName}`;
          }
        },
        render: (state) => [`Full Name: ${state.fullName}`]
      };
      
      // Créer le composant
      const component = new VimComponent(options);
      await component.mount();
      
      // Vérifier le rendu initial avec la propriété calculée
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Full Name: John Doe']]);
      
      // Mettre à jour le prénom
      await component.updateState({ firstName: 'Jane' });
      
      // Vérifier le re-rendu avec la propriété calculée mise à jour
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Full Name: Jane Doe']]);
    });
    
    it('devrait prendre en charge les watchers', async () => {
      // Créer un mock pour le watcher
      const watchCallback = jest.fn();
      
      // Créer les options du composant avec un watcher
      const options: ComponentOptions = {
        id: 'watch_test',
        type: 'watch',
        state: { count: 0 },
        watch: {
          count: watchCallback
        },
        render: (state) => [`Count: ${state.count}`]
      };
      
      // Créer le composant
      const component = new VimComponent(options);
      await component.mount();
      
      // Le watcher ne devrait pas être appelé lors du rendu initial
      expect(watchCallback).not.toHaveBeenCalled();
      
      // Mettre à jour l'état
      await component.updateState({ count: 1 });
      
      // Vérifier que le watcher a été appelé
      expect(watchCallback).toHaveBeenCalledTimes(1);
      expect(watchCallback).toHaveBeenCalledWith(1, 0);
      
      // Mettre à jour l'état à nouveau
      await component.updateState({ count: 2 });
      
      // Vérifier que le watcher a été appelé à nouveau
      expect(watchCallback).toHaveBeenCalledTimes(2);
      expect(watchCallback).toHaveBeenCalledWith(2, 1);
    });
  });
  
  describe('Méthodes', () => {
    it('devrait prendre en charge l\'appel de méthodes', async () => {
      // Créer un mock pour la méthode
      const incrementMethod = jest.fn().mockImplementation(function(this: VimComponent) {
        this.updateState({ count: this.state.count + 1 });
        return this.state.count;
      });
      
      // Créer les options du composant avec une méthode
      const options: ComponentOptions = {
        id: 'methods_test',
        type: 'methods',
        state: { count: 0 },
        methods: {
          increment: incrementMethod
        },
        render: (state) => [`Count: ${state.count}`]
      };
      
      // Créer le composant
      const component = new VimComponent(options);
      await component.mount();
      
      // Vérifier le rendu initial
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Count: 0']]);
      
      // Appeler la méthode
      const result = await component.callMethod('increment');
      
      // Vérifier que la méthode a été appelée et a retourné la bonne valeur
      expect(incrementMethod).toHaveBeenCalledTimes(1);
      expect(result).toBe(1);
      
      // Vérifier que l'état a été mis à jour et le buffer re-rendu
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Count: 1']]);
    });
    
    it('devrait gérer les appels de méthode depuis les messages du bridge', async () => {
      // Réinitialiser les mocks
      jest.clearAllMocks();
      
      // Créer un mock pour la méthode
      const incrementMethod = jest.fn().mockImplementation(function(this: VimComponent, amount = 1) {
        this.updateState({ count: this.state.count + amount });
        return this.state.count;
      });
      
      // Créer les options du composant avec une méthode
      const options: ComponentOptions = {
        id: 'bridge_methods_test',
        type: 'bridge_methods',
        state: { count: 0 },
        methods: {
          increment: incrementMethod
        },
        render: (state) => [`Count: ${state.count}`]
      };
      
      // Créer le composant
      const component = new VimComponent(options);
      await component.mount();
      
      // Créer un message bridge
      const message: BridgeMessage = {
        id: 'bridge_methods_test',
        type: MessageType.ACTION,
        action: 'callMethod',
        payload: {
          method: 'increment',
          args: [5]
        },
        correlationId: 'test-correlation-id'
      };
      
      // Simuler la réception du message
      await bridgeCore.receiveMessage(message);
      
      // Vérifier que la méthode a été appelée avec les bons arguments
      expect(incrementMethod).toHaveBeenCalledTimes(1);
      expect(incrementMethod).toHaveBeenCalledWith(5);
      
      // Vérifier que l'état a été mis à jour et le buffer re-rendu
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Count: 5']]);
      
      // Vérifier que la réponse a été envoyée
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        type: MessageType.RESPONSE,
        action: 'methodResult',
        correlationId: 'test-correlation-id',
        payload: expect.objectContaining({ result: 5 })
      }));
    });
  });
});
