import { EventHandler, Subscription } from '../types';
import { workspace } from 'coc.nvim';

/**
 * Pont de communication entre NeoVim et Vue
 */
export class NeovimBridge {
  public nvim: any;
  private eventCallbacks: Record<string, EventHandler[]> = {};
  private eventsInitialized: boolean = false;
  
  constructor(nvim?: any) {
    // Utiliser le nvim fourni ou accéder à workspace.nvim
    this.nvim = nvim || workspace.nvim;
    this.eventCallbacks = {
      'buffer:change': [],
      'cursor:move': [],
      'mode:change': []
    };
  }
  
  /**
   * Initialise le système d'événements
   */
  initEventSystem(): boolean {
    if (this.eventsInitialized) {
      console.log('[BRIDGE] Système d\'événements déjà initialisé');
      return true;
    }
    
    try {
      console.log('[BRIDGE] Initialisation du système d\'événements');
      // Configuration des événements supplémentaires pourrait être ajoutée ici
      this.eventsInitialized = true;
      return true;
    } catch (error) {
      console.error('[BRIDGE] Erreur lors de l\'initialisation des événements:', error);
      return false;
    }
  }
  
  /**
   * Envoie une commande à NeoVim
   */
  async sendCommand(command: string): Promise<string> {
    console.log(`[BRIDGE] Sending command: ${command}`);
    await this.nvim.command(command);
    return 'success';
  }
  
  /**
   * Évalue une expression Vim
   */
  async evaluate(expression: string): Promise<any> {
    console.log(`[BRIDGE] Evaluating: ${expression}`);
    return this.nvim.eval(expression);
  }
  
  /**
   * Appelle une fonction NeoVim
   */
  async call(method: string, args: any[] = []): Promise<any> {
    console.log(`[BRIDGE] Calling: ${method}`, args);
    return this.nvim.call(method, args);
  }
  
  /**
   * S'abonne à un événement
   */
  on(event: string, callback: EventHandler): Subscription {
    if (!this.eventCallbacks[event]) {
      this.eventCallbacks[event] = [];
    }
    this.eventCallbacks[event].push(callback);
    console.log(`[BRIDGE] Subscribed to event: ${event}`);
    
    return {
      dispose: () => {
        this.eventCallbacks[event] = this.eventCallbacks[event].filter(cb => cb !== callback);
        console.log(`[BRIDGE] Unsubscribed from event: ${event}`);
      }
    };
  }
  
  /**
   * Déclenche un événement simulé
   */
  triggerEvent(event: string, data: any): void {
    if (!this.eventCallbacks[event]) return;
    
    this.eventCallbacks[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[BRIDGE] Error in event callback: ${error}`);
      }
    });
  }
}
