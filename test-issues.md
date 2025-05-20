# Problèmes identifiés dans les tests du projet coc-vue

## Résumé

Après analyse des tests et de leur exécution, plusieurs problèmes ont été identifiés. Ce document les répertorie en deux catégories :
1. Problèmes de structure/configuration qui peuvent être corrigés rapidement
2. Problèmes de code qui nécessitent des modifications plus importantes

## Problèmes de structure/configuration

### 1. Configuration Jest incorrecte pour les mocks

**Problème** : Les tests échouent avec l'erreur `Cannot find module 'coc.nvim'` malgré l'existence d'un fichier mock.

**Cause** : La configuration de Jest dans `config/jest.config.js` ne mappe pas correctement le module `coc.nvim` vers son mock.

**Solution** : Corriger le mapping dans la configuration Jest. Il y a actuellement une duplication de la section `moduleNameMapper` qui pourrait causer des problèmes.

### 2. Scripts de test obsolètes

**Problème** : Le script `scripts/test/run-all-tests.sh` fait référence à des fichiers de configuration Jest qui n'existent pas (`jest.bridge.config.js`, `jest.renderer.config.js`).

**Cause** : La structure du projet a probablement évolué mais les scripts n'ont pas été mis à jour.

**Solution** : Mettre à jour les scripts pour utiliser la configuration Jest actuelle ou créer les fichiers de configuration manquants.

### 3. Problème de serveur Neovim pour les tests d'intégration

**Problème** : Le serveur Neovim utilisé pour les tests d'intégration échoue avec l'erreur `bad argument #1 to 'accept' (Expected uv_stream userdata)`.

**Cause** : Problème dans le script Lua qui initialise le serveur de test.

**Solution** : Examiner et corriger le script Lua dans `scripts/vim/ping_init.vim`.

### 4. Problèmes de timeout dans les tests d'intégration

**Problème** : Certains tests d'intégration échouent en raison de timeouts trop courts.

**Cause** : Les tests d'intégration tentent de se connecter à un serveur qui n'est pas correctement démarré ou qui n'est pas disponible.

**Solution** : Utiliser notre script avec timeout de 48 secondes pour s'assurer que les tests ont suffisamment de temps pour s'exécuter.

## Problèmes de code

### 1. Erreurs TypeScript dans les tests

**Problème** : Plusieurs erreurs TypeScript sont présentes dans les fichiers de test, notamment dans `__tests__/components/vim-component.test.ts`.

**Cause** : Utilisation incorrecte de `this` dans des fonctions anonymes.

**Solution** : Remplacer les fonctions anonymes par des fonctions fléchées pour préserver le contexte `this`.

### 2. Problèmes de connexion au serveur de test

**Problème** : Les tests d'intégration échouent avec l'erreur `Failed to connect to server: connect ECONNREFUSED 127.0.0.1:9999`.

**Cause** : Le serveur Neovim n'est pas correctement démarré ou n'écoute pas sur le port attendu.

**Solution** : Corriger les scripts de démarrage du serveur et s'assurer que le serveur est bien en écoute avant de lancer les tests.

### 3. Problèmes de nettoyage après les tests

**Problème** : Erreur `Cannot log after tests are done. Did you forget to wait for something async in your test?`.

**Cause** : Des opérations asynchrones ne sont pas correctement attendues avant la fin des tests.

**Solution** : S'assurer que toutes les opérations asynchrones sont correctement attendues avec `await` ou `Promise.all()`.

## Actions recommandées

1. **Priorité haute** : Corriger la configuration Jest pour les mocks
2. **Priorité haute** : Corriger le script Lua du serveur de test
3. **Priorité moyenne** : Mettre à jour les scripts de test obsolètes
4. **Priorité moyenne** : Corriger les erreurs TypeScript dans les tests
5. **Priorité basse** : Améliorer la gestion des opérations asynchrones dans les tests

## Tests qui fonctionnent actuellement

- Les tests unitaires du composant Select (`__tests__/components/select.test.ts`) fonctionnent correctement (10 tests passés)
