/**
 * Coc.nvim Bridge pour les composants
 * 
 * Ce module fournit un pont entre les composants du template et l'API Coc.nvim.
 * Il permet aux composants d'accéder directement aux fonctionnalités de Coc.nvim
 * et de réagir aux événements.
 * 
 * Ce bridge s'intègre au ComponentRegistry existant pour permettre aux composants
 * d'accéder à l'API Coc.nvim pendant leur cycle de vie.
 */

import { workspace, window, commands } from 'coc.nvim';
import { componentRegistry, RegistryEventType } from './registry';

/**
 * Interface pour les événements du bridge
 */
export interface BridgeEvents {
  onBufferChange: (bufferId: number) => void;
  onWorkspaceChange: () => void;
  onFileSelect: (path: string) => void;
}

/**
 * Interface pour les composants enregistrés auprès du bridge
 */
export interface BridgeComponent {
  id: string;
  state?: any;
  methods?: Record<string, (...args: any[]) => any>;
}

/**
 * Classe singleton pour le bridge Coc.nvim
 */
class CocBridge {
  private static instance: CocBridge;
  private eventListeners: Map<string, Array<(...args: any[]) => void>> = new Map();
  private components: Map<string, BridgeComponent> = new Map();
  // Indique si le bridge est initialisé et prêt à être utilisé
  private _isInitialized = false;
  
  private constructor() {
    // Initialiser les écouteurs d'événements Coc.nvim
    this.setupEventListeners();
    
    // S'abonner aux événements du ComponentRegistry
    componentRegistry.on(RegistryEventType.COMPONENT_ADDED, this.handleComponentAdded.bind(this));
    componentRegistry.on(RegistryEventType.COMPONENT_REMOVED, this.handleComponentRemoved.bind(this));
    
    this._isInitialized = true;
    console.log('[CocBridge] Initialized and connected to ComponentRegistry');
  }

  /**
   * Obtenir l'instance singleton
   */
  public static getInstance(): CocBridge {
    if (!CocBridge.instance) {
      CocBridge.instance = new CocBridge();
    }
    return CocBridge.instance;
  }
  
  /**
   * Vérifier si le bridge est initialisé
   */
  public isInitialized(): boolean {
    return this._isInitialized;
  }
  
  /**
   * Gérer l'ajout d'un composant au registre
   */
  private handleComponentAdded(component: any): void {
    console.log(`[CocBridge] Component added: ${component.id}`);
    
    // Injecter les méthodes Coc.nvim dans le composant
    try {
      if (component.props && component.props.onMount) {
        const originalOnMount = component.props.onMount;
        component.props.onMount = () => {
          // Appeler la fonction originale avec le contexte Coc.nvim
          return originalOnMount.call(component, { coc: { workspace, window, commands }, bridge: this });
        };
      }
    } catch (error) {
      console.error('[CocBridge] Error injecting Coc.nvim into component:', error);
    }
  }
  
  /**
   * Gérer la suppression d'un composant du registre
   */
  private handleComponentRemoved(componentId: string): void {
    console.log(`[CocBridge] Component removed: ${componentId}`);
    this.components.delete(componentId);
  }

  /**
   * Configurer les écouteurs d'événements Coc.nvim
   */
  private setupEventListeners(): void {
    try {
      // Écouter les changements de buffer
      workspace.onDidOpenTextDocument(doc => {
        this.emit('bufferChange', doc.uri);
        console.log(`[CocBridge] Buffer opened: ${doc.uri}`);
      });

      // Écouter les changements de workspace
      workspace.onDidChangeWorkspaceFolders(() => {
        this.emit('workspaceChange');
        console.log('[CocBridge] Workspace folders changed');
      });
      
      // Log pour confirmer l'initialisation
      console.log('[CocBridge] Event listeners set up successfully');
    } catch (error) {
      console.error('[CocBridge] Error setting up event listeners:', error);
    }
  }

  /**
   * Émettre un événement aux composants abonnés
   */
  public emit(event: string, ...args: any[]): void {
    try {
      const listeners = this.eventListeners.get(event) || [];
      console.log(`[CocBridge] Emitting event '${event}' to ${listeners.length} listeners`);
      
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`[CocBridge] Error in event listener for ${event}:`, error);
        }
      });
    } catch (error) {
      console.error(`[CocBridge] Error emitting event ${event}:`, error);
    }
  }

  /**
   * S'abonner à un événement
   */
  public on(event: string, callback: (...args: any[]) => void): () => void {
    try {
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, []);
      }
      
      const listeners = this.eventListeners.get(event)!;
      listeners.push(callback);
      console.log(`[CocBridge] Added listener for event '${event}', now ${listeners.length} listeners`);
      
      // Retourner une fonction de désabonnement
      return () => {
        const index = listeners.indexOf(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
          console.log(`[CocBridge] Removed listener for event '${event}'`);
        }
      };
    } catch (error) {
      console.error(`[CocBridge] Error adding listener for event ${event}:`, error);
      return () => {}; // Fonction vide en cas d'erreur
    }
  }

  /**
   * Enregistrer un composant avec ses méthodes
   */
  public registerComponent(id: string, component: BridgeComponent): void {
    try {
      this.components.set(id, component);
      console.log(`[CocBridge] Registered component: ${id}`);
      
      // Notifier que le composant est prêt à être utilisé
      this.emit(`${id}:ready`, component);
    } catch (error) {
      console.error(`[CocBridge] Error registering component ${id}:`, error);
    }
  }

  /**
   * Obtenir un composant par son ID
   */
  public getComponent(id: string): BridgeComponent | undefined {
    return this.components.get(id);
  }
  
  /**
   * Appeler une méthode sur un composant enregistré
   */
  public callComponentMethod(componentId: string, methodName: string, ...args: any[]): any {
    try {
      const component = this.components.get(componentId);
      if (!component || !component.methods || !component.methods[methodName]) {
        console.error(`[CocBridge] Method ${methodName} not found on component ${componentId}`);
        return null;
      }
      
      return component.methods[methodName](...args);
    } catch (error) {
      console.error(`[CocBridge] Error calling method ${methodName} on component ${componentId}:`, error);
      return null;
    }
  }

  /**
   * Obtenir la liste des dossiers du workspace
   */
  public async getWorkspaceFolders(): Promise<{ name: string, uri: string, path: string }[]> {
    try {
      // Récupérer les dossiers du workspace via l'API coc.nvim
      const folders = workspace.workspaceFolders || [];
      
      // S'assurer que nous avons des dossiers valides avec des chemins complets
      if (folders.length === 0) {
        console.log('[CocBridge] No workspace folders found, trying to get current directory');
        
        // Essayer de récupérer le dossier courant si aucun workspace n'est ouvert
        try {
          const currentPath = await workspace.nvim.call('getcwd') as string;
          console.log(`[CocBridge] Current working directory: ${currentPath}`);
          
          if (currentPath) {
            const dirName = currentPath.split('/').pop() || 'current';
            return [{
              name: dirName,
              uri: `file://${currentPath}`,
              path: currentPath
            }];
          }
        } catch (cwdError) {
          console.error('[CocBridge] Error getting current directory:', cwdError);
        }
      }
      
      // Convertir les WorkspaceFolder en objets avec des chemins utilisables
      const result = folders.map(folder => {
        // Convertir l'URI en chemin de fichier
        const uri = folder.uri;
        const path = uri.startsWith('file://') ? uri.slice(7) : uri;
        
        return { 
          name: folder.name, 
          uri: folder.uri,
          path: path
        };
      });
      
      console.log(`[CocBridge] Found ${result.length} workspace folders:`, result);
      return result;
    } catch (error) {
      console.error('[CocBridge] Error getting workspace folders:', error);
      return [];
    }
  }

  /**
   * Obtenir la liste des fichiers dans un chemin
   */
  public async listFiles(path: string): Promise<string[]> {
    if (!path) {
      console.error('[CocBridge] Cannot list files: path is undefined or empty');
      return [];
    }
    
    try {
      console.log(`[CocBridge] Listing files in: ${path}`);
      const nvim = workspace.nvim;
      
      // Vérifier si le chemin existe
      const exists = await nvim.call('isdirectory', [path]);
      if (!exists) {
        console.error(`[CocBridge] Directory does not exist: ${path}`);
        return [];
      }
      
      // Changer de répertoire de travail temporairement
      try {
        await nvim.command(`lcd ${path}`);
      } catch (cdError) {
        console.error(`[CocBridge] Failed to change to directory ${path}:`, cdError);
        // Essayer une approche alternative si lcd échoue
        return await this.listFilesAlternative(path);
      }
      
      // Obtenir la liste des fichiers avec globpath
      const files = await nvim.call('globpath', ['.', '**/*', 0, 1]) as string[];
      console.log(`[CocBridge] Found ${files.length} files in ${path}`);
      return files;
    } catch (error) {
      console.error('[CocBridge] Error listing files:', error);
      return [];
    }
  }
  
  /**
   * Méthode alternative pour lister les fichiers si la première approche échoue
   */
  private async listFilesAlternative(path: string): Promise<string[]> {
    try {
      console.log(`[CocBridge] Trying alternative method to list files in: ${path}`);
      const nvim = workspace.nvim;
      
      // Utiliser readdir pour obtenir la liste des fichiers/dossiers
      const result = await nvim.call('readdir', [path]) as {name: string, type: string}[];
      console.log(`[CocBridge] Found ${result.length} entries using alternative method`);
      
      const files: string[] = [];
      
      // Traiter chaque entrée (fichier ou dossier)
      for (const entry of result) {
        if (entry.type === 'file') {
          files.push(entry.name);
        } else if (entry.type === 'directory') {
          // Ajouter le dossier lui-même
          files.push(entry.name + '/');
          
          // Récursivement obtenir les fichiers dans ce sous-dossier
          try {
            const subFiles = await this.listFilesAlternative(`${path}/${entry.name}`);
            files.push(...subFiles.map(f => `${entry.name}/${f}`));
          } catch (subError) {
            console.error(`[CocBridge] Error listing subdirectory ${entry.name}:`, subError);
          }
        }
      }
      
      return files;
    } catch (error) {
      console.error('[CocBridge] Error in alternative file listing:', error);
      // Dernier recours: essayer avec l'API Node.js fs
      return [];
    }
  }

  /**
   * Ouvrir un fichier dans l'éditeur
   */
  public async openFile(path: string): Promise<void> {
    try {
      console.log(`[CocBridge] Opening file: ${path}`);
      await commands.executeCommand('vscode.open', path);
      console.log(`[CocBridge] File opened: ${path}`);
    } catch (error) {
      console.error('[CocBridge] Error opening file:', error);
      window.showErrorMessage(`Impossible d'ouvrir le fichier: ${path}`);
    }
  }

  /**
   * Obtenir le contenu d'un buffer
   */
  public async getBufferContent(bufferId: number): Promise<string[]> {
    try {
      const nvim = workspace.nvim;
      const content = await nvim.call('nvim_buf_get_lines', [bufferId, 0, -1, false]) as string[];
      console.log(`[CocBridge] Retrieved content for buffer ${bufferId}: ${content.length} lines`);
      return content;
    } catch (error) {
      console.error('[CocBridge] Error getting buffer content:', error);
      return [];
    }
  }

  /**
   * Obtenir les informations sur le buffer courant
   */
  public async getCurrentBuffer(): Promise<{ id: number, name: string, content: string[] }> {
    try {
      const nvim = workspace.nvim;
      const buf = await nvim.buffer;
      const id = buf.id;
      const name = await buf.name;
      const content = await buf.lines;
      
      console.log(`[CocBridge] Current buffer: ${id}, ${name}, ${content.length} lines`);
      return { id, name, content };
    } catch (error) {
      console.error('[CocBridge] Error getting current buffer:', error);
      return { id: -1, name: 'Error', content: [] };
    }
  }
  
  /**
   * Exécuter une commande Vim
   */
  public async executeVimCommand(command: string): Promise<void> {
    try {
      console.log(`[CocBridge] Executing Vim command: ${command}`);
      await workspace.nvim.command(command);
    } catch (error) {
      console.error(`[CocBridge] Error executing Vim command '${command}':`, error);
    }
  }
}

// Exporter l'instance singleton
export const cocBridge = CocBridge.getInstance();

// Fonction utilitaire pour l'utilisation dans les composants
export function useCocBridge(): CocBridge {
  return cocBridge;
}
