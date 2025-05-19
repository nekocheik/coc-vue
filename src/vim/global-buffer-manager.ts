import { workspace, events, Disposable } from 'coc.nvim';

/**
 * Gestionnaire global de buffers Vue.js
 * 
 * Ce gestionnaire s'assure que chaque buffer créé dans Vim reçoit
 * un identifiant unique et des marqueurs spécifiques pour l'identifier.
 */
export class GlobalBufferManager implements Disposable {
  private static instance: GlobalBufferManager | null = null;
  private disposables: Disposable[] = [];
  private registeredBuffers: Map<number, string> = new Map();
  
  /**
   * Obtenir l'instance singleton
   */
  public static getInstance(): GlobalBufferManager {
    if (!GlobalBufferManager.instance) {
      GlobalBufferManager.instance = new GlobalBufferManager();
    }
    return GlobalBufferManager.instance;
  }
  
  /**
   * Constructeur privé (singleton)
   */
  private constructor() {
    console.log('[GLOBAL-BUFFER] Initialisation du gestionnaire global de buffers');
    this.setupEventListeners();
  }
  
  /**
   * Configurer les écouteurs d'événements pour détecter les nouveaux buffers
   */
  private setupEventListeners(): void {
    // Écouter la création de nouveaux buffers
    this.disposables.push(
      workspace.registerAutocmd({
        event: 'BufNew,BufAdd,BufCreate',
        callback: async () => {
          await this.onBufferCreated();
        }
      })
    );
    
    // Écouter le changement de buffers
    this.disposables.push(
      workspace.registerAutocmd({
        event: 'BufEnter',
        callback: async () => {
          await this.onBufferEntered();
        }
      })
    );
  }
  
  /**
   * Appelé quand un nouveau buffer est créé
   */
  private async onBufferCreated(): Promise<void> {
    try {
      const nvim = workspace.nvim;
      const currentBufnr = await nvim.eval('bufnr("%")') as number;
      
      // Vérifier si ce buffer a déjà été enregistré
      if (this.registeredBuffers.has(currentBufnr)) {
        return;
      }
      
      // Générer un identifiant unique pour ce buffer
      const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      
      console.log(`[GLOBAL-BUFFER] Nouveau buffer #${currentBufnr} détecté, attribution de l'ID unique: ${uniqueId}`);
      
      // Marquer ce buffer avec son identifiant unique
      await nvim.command(`call setbufvar(${currentBufnr}, "buffer_unique_id", "${uniqueId}")`);
      await nvim.command(`call setbufvar(${currentBufnr}, "is_managed_buffer", 1)`);
      
      // Si c'est un buffer Vue.js, ajouter des marqueurs spécifiques
      const bufname = await nvim.eval(`bufname(${currentBufnr})`) as string;
      if (bufname.includes('Vue.js')) {
        await nvim.command(`call setbufvar(${currentBufnr}, "is_vue_buffer", 1)`);
        // Renommer le buffer pour inclure son ID unique dans le nom afin d'éviter les confusions
        // Format: "Vue.js Demo [ID]"
        const shortId = uniqueId.substring(uniqueId.length - 5);
        if (!bufname.includes('[')) {
          // Ne renommer que si le buffer n'a pas déjà un identifiant
          const newName = bufname.replace('Vue.js', `Vue.js [${shortId}]`);
          await nvim.command(`silent! file ${newName}`);
        }
      }
      
      // Enregistrer ce buffer
      this.registeredBuffers.set(currentBufnr, uniqueId);
    } catch (error) {
      console.error('[GLOBAL-BUFFER] Erreur lors du traitement d\'un nouveau buffer:', error);
    }
  }
  
  /**
   * Appelé quand on entre dans un buffer
   */
  private async onBufferEntered(): Promise<void> {
    try {
      const nvim = workspace.nvim;
      const currentBufnr = await nvim.eval('bufnr("%")') as number;
      
      // Si le buffer n'est pas encore enregistré, le faire maintenant
      if (!this.registeredBuffers.has(currentBufnr)) {
        await this.onBufferCreated();
        return;
      }
      
      // Vérification supplémentaire pour les buffers Vue.js
      const bufname = await nvim.eval(`bufname(${currentBufnr})`) as string;
      const isVueBuffer = bufname.includes('Vue.js');
      
      if (isVueBuffer) {
        // S'assurer que les variables spécifiques sont bien définies
        const uniqueId = this.registeredBuffers.get(currentBufnr);
        await nvim.command(`call setbufvar(${currentBufnr}, "vue_buffer_id", ${currentBufnr})`);
        await nvim.command(`call setbufvar(${currentBufnr}, "is_vue_buffer", 1)`);
        
        console.log(`[GLOBAL-BUFFER] Entrée dans un buffer Vue.js #${currentBufnr}, ID: ${uniqueId}`);
      }
    } catch (error) {
      console.error('[GLOBAL-BUFFER] Erreur lors de l\'entrée dans un buffer:', error);
    }
  }
  
  /**
   * Vérifier si un buffer est sûr pour les opérations Vue.js
   */
  public async isBufferSafeForVueOperations(bufnr: number): Promise<boolean> {
    try {
      const nvim = workspace.nvim;
      
      // 1. Vérifier que le buffer existe
      const bufExists = await nvim.eval(`bufexists(${bufnr})`) as number;
      if (bufExists !== 1) return false;
      
      // 2. Vérifier les marqueurs spécifiques
      const isVueBuffer = await nvim.eval(`getbufvar(${bufnr}, "is_vue_buffer", 0)`) as number;
      const uniqueId = await nvim.eval(`getbufvar(${bufnr}, "buffer_unique_id", "")`) as string;
      
      // 3. Vérification du nom
      const bufname = await nvim.eval(`bufname(${bufnr})`) as string;
      
      const isSafeBuffer = isVueBuffer === 1 && uniqueId !== "" && bufname.includes('Vue.js');
      
      if (!isSafeBuffer) {
        console.log(`[GLOBAL-BUFFER] Buffer #${bufnr} non sécurisé pour les opérations Vue.js:`,
                  `isVue=${isVueBuffer}, uniqueId=${uniqueId}, name=${bufname}`);
      }
      
      return isSafeBuffer;
    } catch (error) {
      console.error('[GLOBAL-BUFFER] Erreur lors de la vérification du buffer:', error);
      return false;
    }
  }
  
  /**
   * Libérer les ressources
   */
  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    GlobalBufferManager.instance = null;
    console.log('[GLOBAL-BUFFER] Gestionnaire de buffers nettoyé');
  }
}
