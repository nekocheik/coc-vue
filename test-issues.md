# Problèmes identifiés dans les tests du projet coc-vue

## Résumé

Après analyse des tests et de leur exécution, plusieurs problèmes ont été identifiés. Ce document les répertorie en deux catégories :
1. Problèmes de structure/configuration qui ont été corrigés
2. Problèmes de code qui nécessitent des modifications plus importantes

## Problèmes de structure/configuration corrigés

### 1. Configuration Jest incorrecte pour les mocks

**Problème** : Les tests échouaient avec l'erreur `Cannot find module 'coc.nvim'` malgré l'existence d'un fichier mock.

**Cause** : La configuration de Jest dans `config/jest.config.js` ne mappait pas correctement le module `coc.nvim` vers son mock. Il y avait une duplication de la section `moduleNameMapper` qui causait des problèmes.

**Solution appliquée** : 
- Suppression de la duplication de la section `moduleNameMapper` dans `config/jest.config.js`
- Ajout de mappings spécifiques pour les modules problématiques :
  ```javascript
  moduleNameMapper: {
    '^coc.nvim$': '<rootDir>/../__tests__/mocks/coc.ts',
    '^@/(.*)$': '<rootDir>/../src/$1',
    '^../bridge/core$': '<rootDir>/../__tests__/mocks/bridge-core.ts',
    '^../../src/bridge/core$': '<rootDir>/../__tests__/mocks/bridge-core.ts',
    '^../components/vim-component$': '<rootDir>/../__tests__/mocks/vim-component.ts',
    '^../../src/components/vim-component$': '<rootDir>/../__tests__/mocks/vim-component.ts'
  }
  ```

### 2. Mock incomplet pour coc.nvim

**Problème** : Même après avoir corrigé le mapping, les tests échouaient avec l'erreur `Cannot read properties of undefined (reading 'nvim')`.

**Cause** : Le mock pour `coc.nvim` était trop simpliste et ne fournissait pas toutes les propriétés nécessaires.

**Solution appliquée** : 
- Amélioration du mock `__tests__/mocks/coc.ts` pour fournir une implémentation plus complète de l'API coc.nvim, notamment :
  - Ajout de méthodes mockées pour `workspace.nvim`
  - Ajout de retours appropriés pour les fonctions mockées
  - Ajout d'autres propriétés manquantes comme `commands` et `languages`

### 3. Erreurs TypeScript dans les tests

**Problème** : Plusieurs erreurs TypeScript étaient présentes dans les fichiers de test, notamment dans `__tests__/components/vim-component.test.ts`.

**Cause** : Utilisation incorrecte de `this` dans des fonctions anonymes.

**Solution appliquée** : 
- Ajout d'annotations de type explicites pour préserver le contexte `this` dans les fonctions anonymes :
  ```typescript
  function(this: VimComponent) {
    // Code utilisant this
  }
  ```

### 4. Script de timeout pour les tests

**Problème** : Les tests d'intégration échouaient parfois en raison de timeouts trop courts.

**Cause** : Les tests d'intégration tentent de se connecter à un serveur qui n'est pas correctement démarré ou qui n'est pas disponible.

**Solution appliquée** : 
- Création d'un script `scripts/run-tests-with-timeout.sh` qui exécute les tests avec un timeout de 48 secondes
- Implémentation d'une solution compatible avec macOS qui utilise `perl` pour gérer le timeout

## Problèmes de code restants

### 1. Problèmes avec les tests du composant VimComponent

**Problème** : Les tests du composant VimComponent échouent avec des erreurs comme :
```
expect(jest.fn()).toHaveBeenCalledTimes(expected)
Expected number of calls: 1
Received number of calls: 0
```

**Cause** : Bien que les erreurs de configuration aient été corrigées, il y a des problèmes dans la logique des tests ou dans l'implémentation du mock pour VimComponent.

**Solution** : Revoir l'implémentation du mock VimComponent pour s'assurer que les méthodes comme `mount()`, `unmount()`, et `updateState()` appellent correctement les hooks et déclenchent les rendus attendus.

### 2. Problèmes de serveur Neovim pour les tests d'intégration

**Problème** : Le serveur Neovim utilisé pour les tests d'intégration échoue avec l'erreur `bad argument #1 to 'accept' (Expected uv_stream userdata)`.

**Cause** : Problème dans le script Lua qui initialise le serveur de test.

**Solution** : Examiner et corriger le script Lua dans `scripts/vim/ping_init.vim`. Le problème semble être lié à l'API socket de Lua dans Neovim.

### 3. Problèmes de connexion au serveur de test

**Problème** : Les tests d'intégration échouent avec l'erreur `Failed to connect to server: connect ECONNREFUSED 127.0.0.1:9999`.

**Cause** : Le serveur Neovim n'est pas correctement démarré ou n'écoute pas sur le port attendu.

**Solution** : Corriger les scripts de démarrage du serveur et s'assurer que le serveur est bien en écoute avant de lancer les tests.

### 4. Scripts de test obsolètes

**Problème** : Le script `scripts/test/run-all-tests.sh` fait référence à des fichiers de configuration Jest qui n'existent pas (`jest.bridge.config.js`, `jest.renderer.config.js`).

**Cause** : La structure du projet a probablement évolué mais les scripts n'ont pas été mis à jour.

**Solution** : Mettre à jour les scripts pour utiliser la configuration Jest actuelle ou créer les fichiers de configuration manquants.

### 5. Problèmes de nettoyage après les tests

**Problème** : Erreur `Cannot log after tests are done. Did you forget to wait for something async in your test?`.

**Cause** : Des opérations asynchrones ne sont pas correctement attendues avant la fin des tests.

**Solution** : S'assurer que toutes les opérations asynchrones sont correctement attendues avec `await` ou `Promise.all()`.

## Résumé des corrections effectuées

1. ✅ Configuration Jest corrigée pour utiliser correctement les mocks
2. ✅ Mock de `coc.nvim` amélioré pour fournir toutes les propriétés nécessaires
3. ✅ Erreurs TypeScript corrigées dans les tests avec des annotations de type appropriées
4. ✅ Script de timeout créé pour exécuter les tests avec une limite de temps de 48 secondes

## Tests qui fonctionnent actuellement

- Les tests unitaires du composant Select (`__tests__/components/select.test.ts`) fonctionnent correctement (10 tests passés)
