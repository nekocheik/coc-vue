/**
 * Client de test Neovim avec mock
 * Ce fichier fournit un client de test qui utilise le mock Neovim au lieu d'une connexion réelle
 */

import { NeovimClientMock } from '../mocks/neovim-mock';

// Classe client de test pour Neovim
export class NeovimTestClient {
  private static instance: NeovimTestClient | null = null;
  private client: NeovimClientMock;
  
  private constructor() {
    this.client = NeovimClientMock.getInstance();
  }
  
  // Singleton pattern
  public static getInstance(): NeovimTestClient {
    if (!NeovimTestClient.instance) {
      NeovimTestClient.instance = new NeovimTestClient();
    }
    return NeovimTestClient.instance;
  }
  
  // Réinitialiser l'instance (utile pour les tests)
  public static resetInstance(): void {
    NeovimClientMock.resetInstance();
    NeovimTestClient.instance = null;
  }
  
  // Connecter au serveur Neovim (mock)
  public async connect(): Promise<void> {
    console.log('Connecting to Neovim test server (mock)...');
    await this.client.connect();
    console.log('Successfully connected to Neovim test server (mock)');
  }
  
  // Déconnecter du serveur Neovim (mock)
  public async disconnect(): Promise<void> {
    console.log('Disconnecting from Neovim test server (mock)...');
    await this.client.disconnect();
    console.log('Disconnected from Neovim test server (mock)');
  }
  
  // Appeler une fonction Lua (mock)
  public async callFunction(functionName: string, args: any[]): Promise<any> {
    return this.client.callFunction(functionName, args);
  }
  
  // Vérifier si le client est connecté
  public isConnected(): boolean {
    return this.client.isConnected();
  }
}

// Fonction pour obtenir une instance du client de test
export function getNeovimTestClient(): NeovimTestClient {
  return NeovimTestClient.getInstance();
}

// Exporter la fonction pour obtenir le client
export default getNeovimTestClient;
