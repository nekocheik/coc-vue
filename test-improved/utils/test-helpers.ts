/**
 * Utilitaires pour les tests
 * Ces fonctions aident à simplifier l'écriture des tests et à réduire la duplication de code
 */
import { NeovimClient, ComponentConfig } from './neovim-client';

// Options par défaut pour les composants
export const DEFAULT_OPTIONS: Record<string, Record<string, any>> = {
  SELECT: {
    title: 'Test Select',
    options: [
      { id: 'opt1', text: 'Option 1', value: 'value1' },
      { id: 'opt2', text: 'Option 2', value: 'value2' },
      { id: 'opt3', text: 'Option 3', value: 'value3' }
    ],
    style: 'default',
    placeholder: 'Select an option...',
    disabled: false,
    required: false,
    multi: false,
    maxVisibleOptions: 5
  }
};

// Classe d'aide pour les tests de composants
export class ComponentTestHelper {
  private client: NeovimClient;
  private componentId: string | null = null;
  private componentType: string;
  
  constructor(componentType: string) {
    this.client = NeovimClient.getInstance();
    this.componentType = componentType;
  }
  
  /**
   * Se connecter au serveur Neovim
   */
  async connect(): Promise<void> {
    await this.client.connect();
    const isAlive = await this.client.ping();
    if (!isAlive) {
      throw new Error('Échec de connexion au serveur Neovim - ping échoué');
    }
  }
  
  /**
   * Créer un composant avec des options personnalisées
   */
  async createComponent(options: Partial<ComponentConfig> = {}): Promise<string> {
    // Générer un ID unique pour éviter les conflits
    const id = `test_${this.componentType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Fusionner les options par défaut avec les options personnalisées
    const config = {
      id,
      ...DEFAULT_OPTIONS[this.componentType.toUpperCase()] || {},
      ...options
    };
    
    this.componentId = await this.client.loadComponent(config);
    return this.componentId;
  }
  
  /**
   * Appeler une méthode sur le composant actuel
   */
  async callMethod(method: string, ...args: any[]): Promise<any> {
    if (!this.componentId) {
      throw new Error('Aucun composant créé. Appelez createComponent() d\'abord.');
    }
    return this.client.callMethod(this.componentId, method, ...args);
  }
  
  /**
   * Obtenir l'état du composant actuel
   */
  async getState(): Promise<any> {
    if (!this.componentId) {
      throw new Error('Aucun composant créé. Appelez createComponent() d\'abord.');
    }
    return this.client.getState(this.componentId);
  }
  
  /**
   * Obtenir les événements
   */
  async getEvents(): Promise<any[]> {
    return this.client.getEvents();
  }
  
  /**
   * Attendre qu'une condition soit remplie sur l'état du composant
   */
  async waitForState(predicate: (state: any) => boolean, timeout = 5000): Promise<any> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const state = await this.getState();
      if (predicate(state)) {
        return state;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Condition d'état non remplie après ${timeout}ms`);
  }
  
  /**
   * Attendre qu'un événement spécifique soit émis
   */
  async waitForEvent(eventType: string, timeout = 5000): Promise<any> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const events = await this.getEvents();
      const event = events.find(e => e.type === eventType && e.id === this.componentId);
      if (event) {
        return event;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Événement ${eventType} non reçu après ${timeout}ms`);
  }
  
  /**
   * Se déconnecter du serveur Neovim
   */
  disconnect(): void {
    this.client.disconnect();
  }
}

// Fonction utilitaire pour exécuter un test avec gestion automatique des connexions
export async function withComponent(
  componentType: string,
  testFn: (helper: ComponentTestHelper) => Promise<void>,
  options: Partial<ComponentConfig> = {}
): Promise<void> {
  const helper = new ComponentTestHelper(componentType);
  
  try {
    await helper.connect();
    await helper.createComponent(options);
    await testFn(helper);
  } finally {
    helper.disconnect();
  }
}

// Fonction pour simplifier les assertions d'état
export function expectState(state: any, expected: Partial<any>): void {
  Object.entries(expected).forEach(([key, value]) => {
    expect(state[key]).toEqual(value);
  });
}
