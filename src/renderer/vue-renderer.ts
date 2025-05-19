import { NeovimDOMAdapter } from './dom-adapter';
import { WindowOptions } from '../types';
import { NeovimBridge } from '../bridge/neovim-bridge';

/**
 * Moteur de rendu Vue pour NeoVim
 */
export class VueRenderer {
  private nvim: any;
  private adapter: NeovimDOMAdapter;
  private app: any = null;
  private hooks: Map<string, any> = new Map();
  
  constructor(nvim: any) {
    this.nvim = nvim;
    this.adapter = new NeovimDOMAdapter(nvim);
  }
  
  /**
   * Crée une fenêtre pour le rendu
   */
  async createWindow(options: WindowOptions): Promise<string> {
    console.log('[RENDERER] Creating window:', options);
    return this.adapter.createWindow(options);
  }
  
  /**
   * Rend un composant Vue
   */
  async render(component: any, props: any = {}): Promise<string> {
    console.log('[RENDERER] Rendering component with props:', props);
    
    // Nettoyer l'application précédente
    if (this.app) {
      console.log('[RENDERER] Unmounting previous app');
      this.unmountApp();
    }
    
    // Créer une div racine virtuelle
    const rootId = this.adapter.createElement('div', 'root');
    
    // Simuler la création d'une application Vue
    this.app = this.createApp(component, props);
    
    // Enregistrer les hooks personnalisés
    this.registerHooks();
    
    // Monter l'application sur l'adaptateur DOM
    this.mountApp(rootId);
    
    return 'app-rendered';
  }
  
  /**
   * Crée une instance d'application Vue
   */
  private createApp(component: any, props: any): any {
    console.log('[RENDERER] Creating Vue app instance');
    return {
      component,
      props,
      mounted: false,
      config: {
        globalProperties: {}
      }
    };
  }
  
  /**
   * Monte l'application sur l'adaptateur DOM
   */
  private mountApp(rootId: string): void {
    if (!this.app) return;
    
    console.log(`[RENDERER] Mounting app on element: ${rootId}`);
    
    // Simuler le rendu du composant Vue sur l'adaptateur DOM
    const componentId = this.adapter.createElement(this.app.component.name || 'component', 'component');
    this.adapter.appendChild(rootId, componentId);
    
    // Simuler le rendu du contenu du composant
    if (this.app.component.template) {
      // Parsing simplifié du template - dans une implémentation réelle,
      // cela utiliserait le compilateur Vue
      const content = this.app.component.template.replace(/<[^>]+>/g, '').trim();
      this.adapter.setText(componentId, content);
    }
    
    this.app.mounted = true;
    console.log('[RENDERER] App mounted successfully');
  }
  
  /**
   * Démonte l'application
   */
  unmountApp(): void {
    if (!this.app) return;
    
    console.log('[RENDERER] Unmounting app');
    this.app.mounted = false;
    this.app = null;
  }
  
  /**
   * Enregistre les hooks personnalisés dans l'application Vue
   */
  registerHooks(): void {
    if (!this.app) return;
    
    console.log('[RENDERER] Registering hooks');
    
    // Exposer l'API NeoVim à Vue
    this.app.config.globalProperties.$neovim = {
      bridge: new NeovimBridge(this.nvim.workspace.nvim),
      execute: (command: string) => this.nvim.workspace.nvim.command(command),
      eval: (expr: string) => this.nvim.workspace.nvim.eval(expr)
    };
    
    // Enregistrer les hooks comme des propriétés globales
    this.hooks.forEach((hook, name) => {
      this.app.config.globalProperties[name] = hook;
    });
  }
  
  /**
   * Enregistre un hook spécifique
   */
  registerHook(name: string, hook: any): void {
    this.hooks.set(name, hook);
    console.log(`[RENDERER] Registered hook: ${name}`);
  }
}
