/**
 * Configuration globale pour Jest
 * Ce fichier est exécuté avant chaque test
 */

// Augmenter le timeout par défaut pour tous les tests
jest.setTimeout(30000);

// Supprimer les avertissements inutiles de Jest
const originalConsoleWarn = console.warn;
console.warn = function(...args) {
  // Filtrer certains avertissements connus
  const message = args[0]?.toString() || '';
  if (
    message.includes('jest-environment-jsdom') ||
    message.includes('ExperimentalWarning') ||
    message.includes('deprecated')
  ) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Ajouter des matchers Jest personnalisés
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toHaveBeenCalledWithMatch(received, ...expected) {
    const pass = received.mock.calls.some(call => {
      return expected.every((arg, i) => {
        if (typeof arg === 'object' && arg !== null) {
          return expect.objectContaining(arg).asymmetricMatch(call[i]);
        }
        return arg === call[i];
      });
    });
    
    if (pass) {
      return {
        message: () => `expected ${received.getMockName()} not to have been called with arguments matching ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received.getMockName()} to have been called with arguments matching ${expected}`,
        pass: false,
      };
    }
  }
});

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
