/**
 * Mock robuste pour VimComponent
 * Ce mock simule le comportement de base du composant Vim
 */
import bridgeCore, { MessageType } from './bridge-core';

// Classe de base pour les composants Vim
export default class VimComponent {
  // Propriétés du composant
  id: string;
  type: string;
  options: Record<string, any>;
  state: Record<string, any>;
  mounted: boolean = false;
  
  // Constructeur
  constructor(id: string, type: string, options: Record<string, any> = {}) {
    this.id = id;
    this.type = type;
    this.options = { ...options };
    this.state = { ...options };
    
    // Configurer le gestionnaire de messages
    this.setupMessageHandler();
  }
  
  // Configurer le gestionnaire de messages
  private setupMessageHandler() {
    bridgeCore.onMessage((message) => {
      // Traiter uniquement les messages destinés à ce composant
      if (message.payload?.id !== this.id) {
        return;
      }
      
      // Traiter les requêtes de méthode
      if (message.type === MessageType.REQUEST && message.action === 'callMethod') {
        this.handleMethodCall(message);
      }
      
      // Traiter les requêtes d'état
      if (message.type === MessageType.REQUEST && message.action === 'getState') {
        this.handleGetState(message);
      }
    });
  }
  
  // Gérer les appels de méthode
  private async handleMethodCall(message: any) {
    const { method, args = [] } = message.payload || {};
    
    // Vérifier si la méthode existe
    if (typeof (this as any)[method] === 'function') {
      try {
        // Appeler la méthode
        const result = await (this as any)[method](...args);
        
        // Envoyer la réponse
        await bridgeCore.sendMessage({
          id: Date.now().toString(),
          type: MessageType.RESPONSE,
          action: 'methodResult',
          correlationId: message.id,
          payload: { result }
        });
      } catch (error) {
        // Envoyer l'erreur
        await bridgeCore.sendMessage({
          id: Date.now().toString(),
          type: MessageType.ERROR,
          action: 'methodError',
          correlationId: message.id,
          payload: { error: error instanceof Error ? error.message : String(error) }
        });
      }
    } else {
      // Méthode non trouvée
      await bridgeCore.sendMessage({
        id: Date.now().toString(),
        type: MessageType.ERROR,
        action: 'methodError',
        correlationId: message.id,
        payload: { error: `Method '${method}' not found` }
      });
    }
  }
  
  // Gérer les requêtes d'état
  private async handleGetState(message: any) {
    // Envoyer l'état actuel
    await bridgeCore.sendMessage({
      id: Date.now().toString(),
      type: MessageType.RESPONSE,
      action: 'stateResult',
      correlationId: message.id,
      payload: { state: this.state }
    });
  }
  
  // Mettre à jour l'état et émettre un événement
  protected updateState(newState: Partial<Record<string, any>>, eventName?: string) {
    // Mettre à jour l'état
    this.state = { ...this.state, ...newState };
    
    // Émettre un événement si nécessaire
    if (eventName) {
      this.emitEvent(eventName, newState);
    }
  }
  
  // Émettre un événement
  protected emitEvent(eventName: string, payload: any = {}) {
    bridgeCore.sendMessage({
      id: Date.now().toString(),
      type: MessageType.EVENT,
      action: eventName,
      payload: {
        componentId: this.id,
        ...payload
      }
    });
  }
  
  // Méthode pour monter le composant
  async mount() {
    this.mounted = true;
    this.updateState({ mounted: true }, `${this.type}:mounted`);
    return true;
  }
  
  // Méthode pour démonter le composant
  async unmount() {
    this.mounted = false;
    this.updateState({ mounted: false }, `${this.type}:unmounted`);
    return true;
  }
  
  // Méthode pour mettre à jour les options
  async updateOptions(options: Record<string, any>) {
    this.options = { ...this.options, ...options };
    this.updateState(options, `${this.type}:optionsUpdated`);
    return true;
  }
}
