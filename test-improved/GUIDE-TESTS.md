# Guide d'Utilisation de la Nouvelle Structure de Tests COC-Vue

## Problèmes Résolus

La nouvelle structure de tests résout plusieurs problèmes majeurs de l'ancienne structure :

1. **Logs Excessifs** : Les logs sont maintenant filtrés et contrôlés, ce qui améliore considérablement la lisibilité.
2. **Tests Lents** : Les tests sont plus rapides grâce à une meilleure gestion des connexions et des mocks.
3. **Tests Instables** : Les tests sont plus fiables grâce à une meilleure gestion des erreurs et des timeouts.
4. **Mocks Complexes** : Les mocks sont plus simples et plus faciles à maintenir.
5. **Dépendances Externes** : La dépendance à Neovim est mieux gérée pour les tests d'intégration.

## Comparaison Avant/Après

### Avant

```typescript
// Ancien test avec beaucoup de logs et de code dupliqué
it('should handle method calls from bridge messages', async () => {
  const incrementMethod = jest.fn().mockImplementation(function(this: VimComponent, amount = 1) {
    this.updateState({ count: this.state.count + amount });
    return this.state.count;
  });
  
  const options: ComponentOptions = {
    id: 'bridge_methods_test',
    type: 'bridge_methods',
    state: { count: 0 },
    methods: {
      increment: incrementMethod
    },
    render: (state) => [`Count: ${state.count}`]
  };
  
  const component = new VimComponent(options);
  await component.mount();
  
  // Mock bridgeCore.registerHandler to capture the handler
  const registerHandlerSpy = jest.spyOn(bridgeCore, 'registerHandler');
  
  // Register the component with the bridge
  // This would normally be done in the component's constructor
  const registeredHandler = registerHandlerSpy.mock.calls[0]?.[1];
  
  // Create a bridge message
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
  
  // Call the handler directly
  await registeredHandler!(message);
  
  // Verify method was called with correct arguments
  expect(incrementMethod).toHaveBeenCalledTimes(1);
  expect(incrementMethod).toHaveBeenCalledWith(5);
  
  // Verify state was updated and buffer re-rendered
  expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Count: 5']]);
  
  // Verify response was sent
  expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
    type: MessageType.RESPONSE,
    correlationId: 'test-correlation-id',
    payload: { result: 5 }
  }));
});
```

### Après

```typescript
// Nouveau test avec moins de code et plus de clarté
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
```

## Comment Exécuter les Tests

### Tests Unitaires

Les tests unitaires sont rapides et ne nécessitent pas de serveur Neovim :

```bash
./test-improved/scripts/run-unit-tests.sh
```

### Tests d'Intégration

Les tests d'intégration nécessitent un serveur Neovim, qui est automatiquement démarré et arrêté :

```bash
./test-improved/scripts/run-integration-tests.sh
```

Pour voir les logs détaillés (en cas de problème) :

```bash
VERBOSE_LOGS=true ./test-improved/scripts/run-integration-tests.sh
```

### Tous les Tests

Pour exécuter tous les tests et générer un rapport de couverture :

```bash
./test-improved/scripts/run-all-tests.sh
```

### Mode Watch (Développement)

Pour exécuter les tests en mode watch (utile pendant le développement) :

```bash
./test-improved/scripts/watch-tests.sh unit     # Pour les tests unitaires
./test-improved/scripts/watch-tests.sh integration  # Pour les tests d'intégration
```

## Comment Écrire de Nouveaux Tests

### Tests Unitaires

```typescript
// test-improved/unit/mon-composant.test.ts
import { MonComposant } from '../mocks/mon-composant';
import { mockNvim, resetAllMocks } from '../mocks/coc';

describe('MonComposant', () => {
  beforeEach(() => {
    resetAllMocks();
  });
  
  it('devrait faire quelque chose', async () => {
    const composant = new MonComposant({ id: 'test' });
    await composant.mount();
    
    // Assertions...
    expect(mockNvim.call).toHaveBeenCalledWith(/* ... */);
  });
});
```

### Tests d'Intégration

```typescript
// test-improved/integration/mon-composant.test.ts
import { withComponent, expectState } from '../utils/test-helpers';

describe('MonComposant Integration', () => {
  it('devrait faire quelque chose', async () => {
    await withComponent('monComposant', async (helper) => {
      // Actions...
      await helper.callMethod('maMethode');
      
      // Assertions...
      const state = await helper.getState();
      expectState(state, { propriete: 'valeur' });
    });
  });
});
```

## Bonnes Pratiques

1. **Utilisez les utilitaires fournis**
   - `withComponent` pour les tests d'intégration
   - `expectState` pour les assertions d'état
   - `resetAllMocks` pour réinitialiser les mocks

2. **Limitez les logs**
   - N'ajoutez des logs que lorsque c'est nécessaire
   - Utilisez `VERBOSE_LOGS=true` pour le débogage

3. **Tests isolés**
   - Chaque test doit être indépendant
   - Réinitialisez les mocks avant chaque test

4. **Nommez clairement vos tests**
   - Utilisez des noms descriptifs
   - Suivez le format "devrait faire quelque chose"

5. **Testez les cas d'erreur**
   - Ne testez pas seulement les cas de succès
   - Utilisez try/catch pour les erreurs attendues

## Maintenance des Mocks

Les mocks sont maintenant plus faciles à maintenir :

1. **Mocks de coc.nvim**
   - Centralisés dans `test-improved/mocks/coc.ts`
   - Réinitialisés automatiquement entre les tests

2. **Mocks de bridge-core**
   - Centralisés dans `test-improved/mocks/bridge-core.ts`
   - Gestion améliorée des messages

3. **Mocks de VimComponent**
   - Centralisés dans `test-improved/mocks/vim-component.ts`
   - Implémentation plus proche du comportement réel

## Conclusion

Cette nouvelle structure de tests résout les problèmes majeurs de l'ancienne structure, notamment :
- Réduction drastique des logs
- Tests plus rapides et plus fiables
- Mocks plus simples et plus faciles à maintenir
- Meilleure gestion des dépendances externes

Elle offre également une meilleure expérience de développement grâce au mode watch et aux rapports de couverture.
