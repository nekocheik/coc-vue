/**
 * Factory pour le client Neovim
 * Ce fichier détermine s'il faut utiliser un client réel ou un mock en fonction de l'environnement
 */

// Importer les deux types de clients
import getNeovimTestClient from './neovim-test-client-mock';
import { NeovimTestClient as RealNeovimTestClient } from './neovim-test-client';

// Fonction pour obtenir le client réel
function getRealNeovimTestClient() {
  return RealNeovimTestClient.getInstance();
}

/**
 * Obtenir le client Neovim approprié en fonction de l'environnement
 * Si MOCK_NEOVIM=true, utilise le mock, sinon tente une connexion réelle
 */
export function getNeovimClient() {
  // Vérifier si nous devons utiliser le mock
  const useMock = process.env.MOCK_NEOVIM === 'true';
  
  if (useMock) {
    console.log('Using mock Neovim client');
    return getNeovimTestClient();
  } else {
    console.log('Using real Neovim client');
    try {
      return getRealNeovimTestClient();
    } catch (error) {
      console.error('Failed to create real Neovim client, falling back to mock:', error);
      return getNeovimTestClient();
    }
  }
}

export default getNeovimClient;
