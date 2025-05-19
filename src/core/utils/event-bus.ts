/**
 * Système d'événements typé pour la communication entre composants
 * Permet un découplage entre les différentes parties de l'application
 */

/**
 * Types d'événements du système
 */
export enum EventTypes {
  // Événements liés aux buffers
  BUFFER_CREATED = 'buffer:created',
  BUFFER_UPDATED = 'buffer:updated',
  BUFFER_CLOSED = 'buffer:closed',
  
  // Événements liés aux inputs
  INPUT_FOCUSED = 'input:focused',
  INPUT_CHANGED = 'input:changed',
  INPUT_SUBMITTED = 'input:submitted',
  
  // Événements liés au curseur et au mode
  CURSOR_MOVED = 'cursor:moved',
  MODE_CHANGED = 'mode:changed',
  
  // Événements liés aux composants
  COMPONENT_MOUNTED = 'component:mounted',
  COMPONENT_UPDATED = 'component:updated',
  COMPONENT_UNMOUNTED = 'component:unmounted'
}

/**
 * Type pour les gestionnaires d'événements
 */
type EventHandler<T = any> = (data: T) => void;

/**
 * Bus d'événements pour la communication entre composants
 */
export class EventBus {
  private handlers: Map<string, Array<EventHandler>> = new Map();
  
  /**
   * Enregistre un gestionnaire d'événements
   * @param eventName Nom de l'événement
   * @param handler Fonction de gestion de l'événement
   * @returns Fonction pour se désabonner
   */
  on<T>(eventName: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    
    const handlers = this.handlers.get(eventName)!;
    handlers.push(handler as EventHandler);
    
    // Retourne une fonction pour se désabonner
    return () => {
      const index = handlers.indexOf(handler as EventHandler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    };
  }
  
  /**
   * Émet un événement avec des données
   * @param eventName Nom de l'événement
   * @param data Données associées à l'événement
   */
  emit<T>(eventName: string, data: T): void {
    if (!this.handlers.has(eventName)) return;
    
    const handlers = this.handlers.get(eventName)!;
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Erreur lors du traitement de l'événement ${eventName}:`, error);
      }
    }
  }
  
  /**
   * Supprime tous les gestionnaires d'un événement
   * @param eventName Nom de l'événement (optionnel, si non fourni, tous les événements sont supprimés)
   */
  clear(eventName?: string): void {
    if (eventName) {
      this.handlers.delete(eventName);
    } else {
      this.handlers.clear();
    }
  }
}

// Création d'un bus d'événements global
export const globalEventBus = new EventBus();
