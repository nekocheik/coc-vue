/**
 * Configuration globale pour Jest
 * Ce fichier est exécuté avant chaque test
 */

// Augmenter le timeout par défaut pour tous les tests
jest.setTimeout(30000);

// Supprimer les avertissements inutiles de Jest
const originalConsoleWarn = console.warn;
console.warn = function(message) {
  // Ignorer certains avertissements spécifiques
  if (message.includes('vue-jest') || message.includes('ts-jest')) {
    return;
  }
  originalConsoleWarn.apply(console, arguments);
};

// Supprimer les logs de debug pendant les tests sauf si VERBOSE_LOGS est activé
if (!process.env.VERBOSE_LOGS || process.env.VERBOSE_LOGS !== 'true') {
  const originalConsoleLog = console.log;
  console.log = function(message) {
    // Garder uniquement les logs importants
    if (typeof message === 'string' && 
        (message.includes('ERROR') || 
         message.includes('FATAL') || 
         message.includes('CRITICAL'))) {
      originalConsoleLog.apply(console, arguments);
    }
  };
}

// Fonction utilitaire pour attendre une condition
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
