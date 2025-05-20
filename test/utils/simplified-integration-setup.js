/**
 * Configuration spécifique pour les tests d'intégration simplifiés
 * Ce fichier est exécuté avant chaque test d'intégration
 */

// Augmenter le timeout pour les tests d'intégration
jest.setTimeout(30000);

// Définir la variable d'environnement pour utiliser les mocks
process.env.MOCK_NEOVIM = 'true';

// Mock pour le client Neovim
jest.mock('../../__tests__/utils/neovim-test-client', () => {
  return {
    NeovimTestClient: jest.requireActual('../../__tests__/mocks/neovim-mock').NeovimClientMock
  };
});

// Fonction pour nettoyer l'environnement après chaque test
afterEach(async () => {
  // Réinitialiser les mocks
  jest.clearAllMocks();
  
  // Réinitialiser l'instance du client Neovim
  try {
    const { NeovimClientMock } = require('../../__tests__/mocks/neovim-mock');
    NeovimClientMock.resetInstance();
  } catch (err) {
    console.error('Erreur lors de la réinitialisation du client Neovim:', err);
  }
});

// Fonction pour nettoyer l'environnement après tous les tests
afterAll(async () => {
  // Assurez-vous que toutes les connexions sont fermées
  try {
    const { NeovimClientMock } = require('../../__tests__/mocks/neovim-mock');
    NeovimClientMock.resetInstance();
  } catch (err) {
    console.error('Erreur lors de la réinitialisation du client Neovim:', err);
  }
});
