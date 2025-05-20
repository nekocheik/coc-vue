/**
 * Configuration pour les tests d'intégration
 * Ce fichier configure l'environnement pour les tests d'intégration
 */

// Désactiver les logs console par défaut sauf en cas d'erreur critique
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Variable pour contrôler le niveau de verbosité
global.VERBOSE_LOGS = process.env.VERBOSE_LOGS === 'true';

// Remplacer les fonctions de log pour réduire le bruit
console.log = function(...args) {
  if (global.VERBOSE_LOGS) {
    originalConsoleLog(...args);
  }
};

console.info = function(...args) {
  if (global.VERBOSE_LOGS) {
    originalConsoleInfo(...args);
  }
};

console.warn = function(...args) {
  if (global.VERBOSE_LOGS) {
    originalConsoleWarn(...args);
  }
};

// Garder les erreurs toujours visibles
console.error = function(...args) {
  // Filtrer certains messages d'erreur connus qui ne sont pas critiques
  const message = args[0]?.toString() || '';
  if (message.includes('Connection attempt failed, retrying')) {
    if (global.VERBOSE_LOGS) {
      originalConsoleError(...args);
    }
  } else {
    originalConsoleError(...args);
  }
};

// Augmenter les timeouts pour les tests d'intégration
jest.setTimeout(30000);

// Fonction utilitaire pour attendre qu'une condition soit remplie
global.waitForCondition = async function(condition, timeout = 5000, interval = 100) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`Condition non remplie après ${timeout}ms`);
};

// Restaurer les fonctions de console originales après tous les tests
afterAll(() => {
  console.log = originalConsoleLog;
  console.info = originalConsoleInfo;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});
