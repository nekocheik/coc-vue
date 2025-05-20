/**
 * Utilitaires robustes pour les tests
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
  },
  INPUT: {
    title: 'Test Input',
    value: '',
    placeholder: 'Enter text...',
    disabled: false,
    required: false,
    maxLength: 100
  },
  BUTTON: {
    title: 'Test Button',
    text: 'Click me',
    disabled: false,
    style: 'primary'
  }
};

/**
 * Classe d'aide pour les tests de composants
 * Fournit des méthodes pour interagir avec les composants et vérifier leur état
 */
export class ComponentTestHelper {
  private client: NeovimClient;
  private componentId: string | null = null;
  private componentType: string;
  
  constructor(componentType: string) {
    this.client = NeovimClient.getInstance();
    this.componentType = componentType;
  }
  
  /**
   * Se connecter au serveur Neovim avec gestion des erreurs
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      const isAlive = await this.client.ping();
      if (!isAlive) {
        throw new Error('Échec de connexion au serveur Neovim - ping échoué');
      }
    } catch (error) {
      console.error('Erreur lors de la connexion au serveur:', 
        error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
  
  /**
   * Créer un composant avec des options personnalisées
   */
  async createComponent(options: Partial<ComponentConfig> = {}): Promise<string> {
    try {
      // Générer un ID unique pour éviter les conflits
      const id = `test_${this.componentType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Fusionner les options par défaut avec les options personnalisées
      const defaultOptions = DEFAULT_OPTIONS[this.componentType.toUpperCase()] || {};
      const config = {
        id,
        ...defaultOptions,
        ...options
      };
      
      this.componentId = await this.client.loadComponent(config);
      return this.componentId;
    } catch (error) {
      console.error('Erreur lors de la création du composant:', 
        error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
  
  /**
   * Appeler une méthode sur le composant actuel avec gestion des erreurs
   */
  async callMethod(method: string, ...args: any[]): Promise<any> {
    if (!this.componentId) {
      throw new Error('Aucun composant créé. Appelez createComponent() d\'abord.');
    }
    
    try {
      return await this.client.callMethod(this.componentId, method, ...args);
    } catch (error) {
      console.error(`Erreur lors de l'appel de la méthode ${method}:`, 
        error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
  
  /**
   * Obtenir l'état du composant actuel avec gestion des erreurs
   */
  async getState(): Promise<any> {
    if (!this.componentId) {
      throw new Error('Aucun composant créé. Appelez createComponent() d\'abord.');
    }
    
    try {
      return await this.client.getState(this.componentId);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'état:', 
        error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
  
  /**
   * Obtenir les événements avec gestion des erreurs
   */
  async getEvents(): Promise<any[]> {
    try {
      return await this.client.getEvents();
    } catch (error) {
      console.error('Erreur lors de la récupération des événements:', 
        error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
  
  /**
   * Attendre qu'une condition soit remplie sur l'état du composant
   */
  async waitForState(predicate: (state: any) => boolean, timeout = 5000): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const state = await this.getState();
        if (predicate(state)) {
          return state;
        }
      } catch (error) {
        // Ignorer les erreurs temporaires et continuer à essayer
        if (Date.now() - startTime >= timeout) {
          throw error;
        }
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
      try {
        const events = await this.getEvents();
        const event = events.find(e => e.type === eventType && 
          (!this.componentId || e.componentId === this.componentId));
        
        if (event) {
          return event;
        }
      } catch (error) {
        // Ignorer les erreurs temporaires et continuer à essayer
        if (Date.now() - startTime >= timeout) {
          throw error;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Événement ${eventType} non reçu après ${timeout}ms`);
  }
  
  /**
   * Se déconnecter du serveur Neovim
   */
  disconnect(): void {
    try {
      this.client.disconnect();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', 
        error instanceof Error ? error.message : String(error));
    }
  }
  
  /**
   * Monter le composant (appeler la méthode mount)
   */
  async mount(): Promise<void> {
    await this.callMethod('mount');
  }
  
  /**
   * Démonter le composant (appeler la méthode unmount)
   */
  async unmount(): Promise<void> {
    await this.callMethod('unmount');
  }
}

/**
 * Fonction utilitaire pour exécuter un test avec gestion automatique des connexions
 * Cette fonction s'occupe de la connexion, de la création du composant et de la déconnexion
 */
export async function withComponent(
  componentType: string,
  testFn: (helper: ComponentTestHelper) => Promise<void>,
  options: Partial<ComponentConfig> = {}
): Promise<void> {
  const helper = new ComponentTestHelper(componentType);
  let error: Error | null = null;
  
  try {
    await helper.connect();
    await helper.createComponent(options);
    await testFn(helper);
  } catch (err) {
    error = err instanceof Error ? err : new Error(String(err));
  } finally {
    try {
      helper.disconnect();
    } catch (disconnectError) {
      // Ne pas écraser l'erreur originale si elle existe
      if (!error) {
        error = disconnectError instanceof Error 
          ? disconnectError 
          : new Error(String(disconnectError));
      }
    }
  }
  
  // Propager l'erreur s'il y en a une
  if (error) {
    throw error;
  }
}

/**
 * Fonction pour simplifier les assertions d'état
 * Vérifie que l'état du composant correspond aux valeurs attendues
 */
export function expectState(state: any, expected: Partial<any>): void {
  Object.entries(expected).forEach(([key, value]) => {
    expect(state[key]).toEqual(value);
  });
}

/**
 * Fonction pour attendre une condition avec timeout
 */
export async function waitForCondition(
  condition: () => Promise<boolean> | boolean,
  timeout = 5000,
  interval = 100,
  errorMessage = 'Condition non remplie dans le délai imparti'
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      if (await condition()) {
        return;
      }
    } catch (error) {
      // Ignorer les erreurs temporaires et continuer à essayer
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(errorMessage);
}
