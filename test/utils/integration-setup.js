/**
 * Configuration spécifique pour les tests d'intégration
 * Ce fichier est exécuté avant chaque test d'intégration
 */

// Augmenter le timeout pour les tests d'intégration
jest.setTimeout(60000);

// Fonction pour nettoyer l'environnement après chaque test
afterEach(async () => {
  // Réinitialiser les mocks
  jest.clearAllMocks();
  
  // Réinitialiser l'instance du client Neovim
  try {
    const { NeovimClient } = require('./neovim-client');
    NeovimClient.resetInstance();
  } catch (err) {
    console.error('Erreur lors de la réinitialisation du client Neovim:', err);
  }
});

// Fonction pour nettoyer l'environnement après tous les tests
afterAll(async () => {
  // Assurez-vous que toutes les connexions sont fermées
  try {
    const { NeovimClient } = require('./neovim-client');
    NeovimClient.resetInstance();
  } catch (err) {
    console.error('Erreur lors de la réinitialisation du client Neovim:', err);
  }
});
