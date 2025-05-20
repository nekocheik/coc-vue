/**
 * Mock robuste pour bridge-core
 * Ce mock simule le comportement du pont entre Neovim et les composants Vue
 */

// Types pour améliorer la lisibilité et la maintenance
export enum MessageType {
  REQUEST = 'request',
  RESPONSE = 'response',
  EVENT = 'event',
  ERROR = 'error'
}

export interface Message {
  id: string;
  type: MessageType;
  action: string;
  correlationId?: string;
  payload?: any;
}

// Stockage des messages et des callbacks
const messages: Message[] = [];
const eventListeners: Record<string, Function[]> = {};
const responseHandlers: Record<string, (response: Message) => void> = {};

// Créer un mock pour le bridge-core
const bridgeCore = {
  // Méthode pour envoyer un message
  sendMessage: jest.fn(async (message: Message): Promise<void> => {
    messages.push(message);
    
    // Si c'est une réponse, appeler le handler correspondant
    if (message.type === MessageType.RESPONSE && message.correlationId) {
      const handler = responseHandlers[message.correlationId];
      if (handler) {
        handler(message);
        delete responseHandlers[message.correlationId];
      }
    }
    
    // Si c'est un événement, notifier les listeners
    if (message.type === MessageType.EVENT) {
      const listeners = eventListeners[message.action] || [];
      for (const listener of listeners) {
        listener(message);
      }
    }
    
    return Promise.resolve();
  }),
  
  // Méthode pour recevoir un message
  onMessage: jest.fn((callback: (message: Message) => void) => {
    const id = Date.now().toString();
    eventListeners['message'] = eventListeners['message'] || [];
    eventListeners['message'].push(callback);
    return {
      dispose: () => {
        eventListeners['message'] = eventListeners['message'].filter(cb => cb !== callback);
      }
    };
  }),
  
  // Méthode pour envoyer une requête et attendre la réponse
  sendRequest: jest.fn(async (action: string, payload?: any): Promise<any> => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const message: Message = {
      id,
      type: MessageType.REQUEST,
      action,
      payload
    };
    
    messages.push(message);
    
    return new Promise((resolve, reject) => {
      // Enregistrer le handler pour la réponse
      responseHandlers[id] = (response: Message) => {
        if (response.type === MessageType.ERROR) {
          reject(new Error(response.payload?.error || 'Unknown error'));
        } else {
          resolve(response.payload);
        }
      };
      
      // Simuler une réponse après un court délai
      setTimeout(() => {
        // Créer une réponse simulée
        const responseMessage: Message = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          type: MessageType.RESPONSE,
          action: action + '_response',
          correlationId: id,
          payload: { success: true, ...payload }
        };
        
        // Envoyer la réponse
        bridgeCore.sendMessage(responseMessage);
      }, 10);
    });
  }),
  
  // Méthode pour écouter un événement spécifique
  onEvent: jest.fn((eventName: string, callback: (payload: any) => void) => {
    eventListeners[eventName] = eventListeners[eventName] || [];
    eventListeners[eventName].push(callback);
    return {
      dispose: () => {
        eventListeners[eventName] = eventListeners[eventName].filter(cb => cb !== callback);
      }
    };
  }),
  
  // Méthode pour déclencher un événement (utile pour les tests)
  triggerEvent: (eventName: string, payload: any) => {
    const message: Message = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      type: MessageType.EVENT,
      action: eventName,
      payload
    };
    
    bridgeCore.sendMessage(message);
  },
  
  // Méthode pour réinitialiser l'état (utile pour les tests)
  reset: () => {
    messages.length = 0;
    Object.keys(eventListeners).forEach(key => {
      eventListeners[key] = [];
    });
    Object.keys(responseHandlers).forEach(key => {
      delete responseHandlers[key];
    });
    
    jest.clearAllMocks();
  }
};

export default bridgeCore;
