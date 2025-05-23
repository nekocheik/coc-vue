// src/events/index.ts
export class EventEmitter<T extends Record<string, (...args: any[]) => void>> {
  private listeners: Partial<Record<keyof T, T[keyof T][]>> = {};

  on<K extends keyof T>(event: K, callback: T[K]): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(callback);
  }

  off<K extends keyof T>(event: K, callback: T[K]): void {
    if (!this.listeners[event]) {
      // TODO: Test coverage - Add test for removing a listener from a non-existent event
      return;
    }
    this.listeners[event] = this.listeners[event]!.filter(cb => cb !== callback);
  }

  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void {
    if (!this.listeners[event]) {
      // TODO: Test coverage - Add test for emitting an event with no listeners
      return;
    }
    this.listeners[event]!.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        // Swallow errors from event listeners to prevent them from crashing the application
        console.error(`Error in event listener for ${String(event)}:`, error);
      }
    });
  }
}

export enum EventType {
  COMPONENT_CREATED = 'component:created',
  COMPONENT_UPDATED = 'component:updated',
  COMPONENT_DESTROYED = 'component:destroyed',
  SELECT_OPEN = 'select:open',
  SELECT_CLOSE = 'select:close',
  SELECT_OPTION_SELECTED = 'select:option:selected',
  SELECT_OPTION_DESELECTED = 'select:option:deselected',
  SELECT_CHANGE = 'select:change',
  SELECT_SEARCH = 'select:search'
}

export interface EventData {
  componentId: string;
  componentType: string;
  [key: string]: any;
}

export interface EventPayload {
  type: EventType;
  data: EventData;
}
