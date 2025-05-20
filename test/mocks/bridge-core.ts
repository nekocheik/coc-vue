/**
 * This mock simulates the behavior of the bridge between Neovim and Vue components
 */

// Types to improve readability and maintenance
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
    
    // If it's a response, call the corresponding handler
    if (message.type === MessageType.RESPONSE && message.correlationId) {
      const handler = responseHandlers[message.correlationId];
      if (handler) {
        handler(message);
        delete responseHandlers[message.correlationId];
      }
    }
    
    // If it's an event, notify listeners
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
      // Register handler for response
      responseHandlers[id] = (response: Message) => {
        if (response.type === MessageType.ERROR) {
          reject(new Error(response.payload?.error || 'Unknown error'));
        } else {
          resolve(response.payload);
        }
      };
      
      // Simulate response after short delay
      setTimeout(() => {
        // Create simulated response
        const responseMessage: Message = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          type: MessageType.RESPONSE,
          action: action + '_response',
          correlationId: id,
          payload: { success: true, ...payload }
        };
        
        // Send response
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
