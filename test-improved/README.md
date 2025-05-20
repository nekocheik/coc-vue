# Structure de Tests Améliorée pour COC-Vue

Cette structure de tests a été conçue pour résoudre les problèmes de la structure précédente, notamment :
- Trop de logs qui nuisent à la lisibilité
- Tests lents et peu fiables
- Difficultés à maintenir les mocks
- Problèmes de connexion avec Neovim

## Organisation des Dossiers

```
test-improved/
├── integration/       # Tests d'intégration
├── jest.config.js     # Configuration Jest améliorée
├── mocks/             # Mocks améliorés
├── reports/           # Rapports de tests générés
├── scripts/           # Scripts d'exécution des tests
├── unit/              # Tests unitaires
└── utils/             # Utilitaires pour les tests
```

## Caractéristiques Principales

1. **Réduction des Logs**
   - Les logs sont filtrés pour n'afficher que les informations importantes
   - Option pour activer les logs verbeux si nécessaire

2. **Mocks Améliorés**
   - Implémentations plus propres et plus faciles à maintenir
   - Meilleure gestion des erreurs
   - Réinitialisation automatique entre les tests

3. **Client Neovim Robuste**
   - Gestion améliorée des connexions
   - Reconnexion automatique en cas d'échec
   - Timeout pour éviter les blocages

4. **Utilitaires de Test**
   - Fonctions d'aide pour réduire la duplication de code
   - Assertions simplifiées
   - Gestion automatique des ressources

5. **Scripts d'Exécution**
   - Scripts dédiés pour différents types de tests
   - Mode watch pour le développement
   - Rapports de couverture de code

## Comment Utiliser

### Exécuter les Tests Unitaires

```bash
./test-improved/scripts/run-unit-tests.sh
```

### Exécuter les Tests d'Intégration

```bash
./test-improved/scripts/run-integration-tests.sh
```

Pour voir les logs détaillés :

```bash
VERBOSE_LOGS=true ./test-improved/scripts/run-integration-tests.sh
```

### Exécuter Tous les Tests

```bash
./test-improved/scripts/run-all-tests.sh
```

### Mode Watch (Développement)

```bash
./test-improved/scripts/watch-tests.sh unit     # Pour les tests unitaires
./test-improved/scripts/watch-tests.sh integration  # Pour les tests d'intégration
```

## Écrire de Nouveaux Tests

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

## Conseils pour des Tests Efficaces

1. **Réduire la Duplication**
   - Utilisez les utilitaires fournis pour éviter de répéter du code
   - Créez des fonctions d'aide pour les opérations communes

2. **Tests Isolés**
   - Chaque test doit être indépendant des autres
   - Réinitialisez les mocks avant chaque test

3. **Tests Lisibles**
   - Utilisez des noms descriptifs pour les tests
   - Structurez les tests en phases: arrangement, action, assertion

4. **Éviter les Logs Inutiles**
   - N'ajoutez des logs que lorsque c'est nécessaire pour le débogage
   - Utilisez VERBOSE_LOGS pour les logs détaillés

5. **Gestion des Erreurs**
   - Testez les cas d'erreur, pas seulement les cas de succès
   - Utilisez try/catch pour capturer les erreurs attendues
