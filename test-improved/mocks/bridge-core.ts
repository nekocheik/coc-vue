/**
 * Mock amélioré pour bridge/core.ts
 * Ce mock est plus propre, plus facile à maintenir et à tester
 */

// Définir les types de messages
export enum MessageType {
  INIT = 'init',
  STATE = 'state',
  ACTION = 'action',
  EVENT = 'event',
  RESPONSE = 'response',
  ERROR = 'error'
}

// Définir l'interface du message
export interface BridgeMessage {
  id: string;
  type: MessageType;
  action?: string;
  payload?: any;
  correlationId?: string;
}

// Définir le type du gestionnaire de messages
export type MessageHandler = (message: BridgeMessage) => Promise<void>;

// Mock BridgeCore class
export class BridgeCore {
  private static instance: BridgeCore | null = null;
  private handlers: Map<string, MessageHandler> = new Map();
  
  // Mocks pour les tests
  public sendMessage = jest.fn().mockImplementation(async (message: BridgeMessage) => {
    return {
      success: true,
      data: { received: true }
    };
  });
  
  private constructor() {}
  
  /**
   * Obtenir l'instance singleton
   */
  static getInstance(): BridgeCore {
    if (!BridgeCore.instance) {
      BridgeCore.instance = new BridgeCore();
    }
    return BridgeCore.instance;
  }
  
  /**
   * Enregistrer un gestionnaire de messages
   */
  registerHandler(id: string, handler: MessageHandler): void {
    this.handlers.set(id, handler);
  }
  
  /**
   * Désenregistrer un gestionnaire de messages
   */
  unregisterHandler(id: string): void {
    this.handlers.delete(id);
  }
  
  /**
   * Obtenir un gestionnaire de messages
   */
  getHandler(id: string): MessageHandler | undefined {
    return this.handlers.get(id);
  }
  
  /**
   * Simuler la réception d'un message
   */
  async receiveMessage(message: BridgeMessage | string): Promise<void> {
    const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;
    const handler = this.handlers.get(parsedMessage.id);
    
    if (handler) {
      await handler(parsedMessage);
    }
  }
  
  /**
   * Réinitialiser tous les mocks et gestionnaires
   */
  resetMocks(): void {
    this.sendMessage.mockClear();
    this.handlers.clear();
  }
  
  /**
   * Réinitialiser l'instance singleton (utile pour les tests)
   */
  static resetInstance(): void {
    if (BridgeCore.instance) {
      BridgeCore.instance.resetMocks();
      BridgeCore.instance = null;
    }
  }
}

// Exporter l'instance singleton
export const bridgeCore = BridgeCore.getInstance();
