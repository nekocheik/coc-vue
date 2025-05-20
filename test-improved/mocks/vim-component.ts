/**
 * Mock amélioré pour le composant VimComponent
 * Ce mock est plus propre, plus facile à maintenir et à tester
 */
import { mockNvim, mockWorkspace } from './coc';
import { bridgeCore, MessageType, BridgeMessage } from './bridge-core';

/**
 * Interface pour les options du composant
 */
export interface ComponentOptions {
  id: string;
  name?: string;
  type?: string;
  template?: string;
  state?: Record<string, any>;
  methods?: Record<string, Function>;
  setup?: (props: any) => Record<string, any>;
  watch?: Record<string, Function>;
  computed?: Record<string, Function>;
  render?: (state: Record<string, any>) => string[];
  
  // Hooks peuvent être passés directement dans les options ou dans un objet hooks
  beforeMount?: () => void | Promise<void>;
  onMounted?: () => void | Promise<void>;
  onUpdated?: () => void | Promise<void>;
  onBeforeDestroy?: () => void | Promise<void>;
  onDestroyed?: () => void | Promise<void>;
  
  hooks?: {
    beforeMount?: () => void | Promise<void>;
    onMounted?: () => void | Promise<void>;
    onUpdated?: () => void | Promise<void>;
    onBeforeDestroy?: () => void | Promise<void>;
    onDestroyed?: () => void | Promise<void>;
  };
}

/**
 * Implémentation mock du composant VimComponent
 */
export class VimComponent {
  id: string;
  name: string;
  type: string;
  state: Record<string, any>;
  methods: Record<string, Function>;
  watchers: Record<string, Function>;
  computed: Record<string, Function>;
  template: string;
  renderFn?: (state: Record<string, any>) => string[];
  hooks: {
    beforeMount?: () => void | Promise<void>;
    onMounted?: () => void | Promise<void>;
    onUpdated?: () => void | Promise<void>;
    onBeforeDestroy?: () => void | Promise<void>;
    onDestroyed?: () => void | Promise<void>;
  };
  
  buffer: number | null = null;
  window: number | null = null;
  mounted: boolean = false;
  destroyed: boolean = false;
  
  /**
   * Constructeur du composant
   */
  constructor(options: ComponentOptions) {
    this.id = options.id;
    this.name = options.name || options.id;
    this.type = options.type || 'default';
    this.state = { ...(options.state || {}) };
    this.methods = { ...(options.methods || {}) };
    this.watchers = { ...(options.watch || {}) };
    this.computed = { ...(options.computed || {}) };
    this.template = options.template || '';
    this.renderFn = options.render;
    
    // Fusionner les hooks des options et de l'objet hooks
    this.hooks = {
      beforeMount: options.beforeMount || options.hooks?.beforeMount,
      onMounted: options.onMounted || options.hooks?.onMounted,
      onUpdated: options.onUpdated || options.hooks?.onUpdated,
      onBeforeDestroy: options.onBeforeDestroy || options.hooks?.onBeforeDestroy,
      onDestroyed: options.onDestroyed || options.hooks?.onDestroyed
    };
    
    // Initialiser les propriétés calculées
    this.initComputedProperties();
    
    // Enregistrer le composant auprès du bridge
    this.registerWithBridge();
  }
  
  /**
   * Initialiser les propriétés calculées
   */
  private initComputedProperties(): void {
    Object.entries(this.computed).forEach(([key, computeFn]) => {
      if (typeof computeFn === 'function') {
        Object.defineProperty(this.state, key, {
          get: () => computeFn.call(this),
          enumerable: true
        });
      }
    });
  }
  
  /**
   * Enregistrer le composant auprès du bridge
   */
  private registerWithBridge(): void {
    bridgeCore.registerHandler(this.id, async (message: BridgeMessage) => {
      if (message.action === 'callMethod' && message.payload && message.payload.method) {
        try {
          const result = await this.callMethod(
            message.payload.method,
            ...(message.payload.args || [])
          );
          
          // Envoyer la réponse
          await bridgeCore.sendMessage({
            id: message.id,
            type: MessageType.RESPONSE,
            action: 'methodResult',
            correlationId: message.correlationId,
            payload: { result }
          });
        } catch (error) {
          // Envoyer l'erreur
          await bridgeCore.sendMessage({
            id: message.id,
            type: MessageType.ERROR,
            action: 'methodError',
            correlationId: message.correlationId,
            payload: { error: error instanceof Error ? error.message : String(error) }
          });
        }
      }
    });
  }
  
  /**
   * Monter le composant
   */
  async mount(): Promise<void> {
    if (this.mounted) return;
    
    try {
      // Appeler le hook beforeMount
      if (this.hooks.beforeMount) {
        await this.hooks.beforeMount.call(this);
      }
      
      // Créer le buffer - Simuler explicitement l'appel pour les tests
      mockNvim.call.mockImplementationOnce(() => Promise.resolve(1));
      this.buffer = await mockWorkspace.nvim.call('nvim_create_buf', [false, true]);
      
      // Créer la fenêtre
      mockNvim.call.mockImplementationOnce(() => Promise.resolve(2));
      this.window = await mockWorkspace.nvim.call('nvim_open_win', [
        this.buffer, 
        false, 
        {
          relative: 'editor',
          width: 60,
          height: 10,
          col: 10,
          row: 7,
          style: 'minimal',
          border: 'rounded'
        }
      ]);
      
      // Définir le nom du buffer
      await mockWorkspace.nvim.call('nvim_buf_set_name', [this.buffer, `${this.name}: ${this.id}`]);
      
      // Rendre le contenu initial
      await this.render();
      
      this.mounted = true;
      
      // Appeler le hook onMounted
      if (this.hooks.onMounted) {
        await this.hooks.onMounted.call(this);
      }
      
      // Envoyer l'événement monté
      await bridgeCore.sendMessage({
        id: this.id,
        type: MessageType.EVENT,
        action: 'component:mounted'
      });
    } catch (error) {
      console.error(`Erreur lors du montage du composant ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Rendre le composant
   */
  async render(): Promise<void> {
    if (!this.buffer) return;
    
    try {
      let lines: string[] = [];
      
      // Utiliser la fonction de rendu si fournie
      if (this.renderFn) {
        lines = this.renderFn(this.state);
      } else if (this.template) {
        // Fallback au template
        lines = this.template.split('\n');
      }
      
      // Mettre à jour le contenu du buffer - simuler explicitement pour les tests
      mockNvim.call.mockImplementationOnce(() => Promise.resolve());
      await mockWorkspace.nvim.call('nvim_buf_set_lines', [this.buffer, 0, -1, false, lines]);
      
      // Appeler le hook onUpdated
      if (this.hooks.onUpdated) {
        await this.hooks.onUpdated.call(this);
      }
    } catch (error) {
      console.error(`Erreur lors du rendu du composant ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Mettre à jour l'état du composant
   */
  async updateState(newState: Record<string, any>): Promise<void> {
    // Sauvegarder les anciennes valeurs pour les watchers
    const oldValues: Record<string, any> = {};
    Object.keys(newState).forEach(key => {
      oldValues[key] = this.state[key];
    });
    
    // Mettre à jour l'état
    Object.entries(newState).forEach(([key, value]) => {
      this.state[key] = value;
    });
    
    // Appeler les watchers pour les propriétés modifiées
    for (const [key, watcher] of Object.entries(this.watchers)) {
      if (key in newState && typeof watcher === 'function') {
        await watcher.call(this, newState[key], oldValues[key]);
      }
    }
    
    // Re-rendre le composant
    await this.render();
    
    // Envoyer l'événement d'état mis à jour
    await bridgeCore.sendMessage({
      id: this.id,
      type: MessageType.STATE,
      action: 'component:stateUpdated',
      payload: { state: this.state }
    });
  }
  
  /**
   * Appeler une méthode du composant
   */
  async callMethod(methodName: string, ...args: any[]): Promise<any> {
    const method = this.methods[methodName];
    if (!method || typeof method !== 'function') {
      throw new Error(`Méthode '${methodName}' non trouvée sur le composant ${this.id}`);
    }
    
    return method.apply(this, args);
  }
  
  /**
   * Détruire le composant
   */
  async destroy(): Promise<void> {
    if (this.destroyed) return;
    
    try {
      // Appeler le hook onBeforeDestroy
      if (this.hooks.onBeforeDestroy) {
        await this.hooks.onBeforeDestroy.call(this);
      }
      
      // Fermer la fenêtre
      if (this.window) {
        await mockWorkspace.nvim.call('nvim_win_close', [this.window, true]);
      }
      
      // Supprimer le buffer
      if (this.buffer) {
        await mockWorkspace.nvim.command(`silent! bdelete! ${this.buffer}`);
      }
      
      this.destroyed = true;
      this.mounted = false;
      
      // Désenregistrer du bridge
      bridgeCore.unregisterHandler(this.id);
      
      // Appeler le hook onDestroyed
      if (this.hooks.onDestroyed) {
        await this.hooks.onDestroyed.call(this);
      }
      
      // Envoyer l'événement détruit
      await bridgeCore.sendMessage({
        id: this.id,
        type: MessageType.EVENT,
        action: 'component:destroyed'
      });
    } catch (error) {
      console.error(`Erreur lors de la destruction du composant ${this.name}:`, error);
      throw error;
    }
  }
}
