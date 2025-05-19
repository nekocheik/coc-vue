/**
 * Une démo simplifiée qui écrit directement dans le buffer Vim
 * sans utiliser le système réactif complexe
 */
import { workspace } from 'coc.nvim';

export class DirectBufferDemo {
  private bufnr: number = -1;
  private timer: NodeJS.Timeout | null = null;
  private counter: number = 0;
  private instanceId: string = Math.random().toString(36).substring(2, 8);

  /**
   * Monte la démo dans un nouveau buffer
   */
  public async mount(): Promise<void> {
    try {
      console.log(`[DIRECT-DEMO-${this.instanceId}] Démarrage de la démo simple...`);
      
      // Créer un nouveau buffer
      const nvim = workspace.nvim;
      await nvim.command('new');
      await nvim.command('setlocal buftype=nofile');
      await nvim.command('setlocal noswapfile');
      
      // Obtenir le numéro du buffer
      this.bufnr = await nvim.eval('bufnr("%")') as number;
      
      // Définir le nom du buffer
      const bufferName = `Vue.js Demo Direct (${this.instanceId})`;
      await nvim.command(`file ${bufferName}`);
      
      console.log(`[DIRECT-DEMO-${this.instanceId}] Buffer #${this.bufnr} créé avec nom: ${bufferName}`);
      
      // Marquer le buffer comme appartenant à Vue
      await nvim.command(`call setbufvar(${this.bufnr}, "vue_buffer_id", ${this.bufnr})`);
      await nvim.command(`call setbufvar(${this.bufnr}, "is_vue_reactive_buffer", 1)`);
      
      // Initialiser le contenu du buffer
      await this.updateBuffer();
      
      // Démarrer le timer de mise à jour
      this.startUpdateTimer();
      
      // Configurer les raccourcis clavier
      await this.setupKeyMapping();
      
      console.log(`[DIRECT-DEMO-${this.instanceId}] Démo montée avec succès`);
    } catch (error) {
      console.error(`[DIRECT-DEMO-${this.instanceId}] Erreur lors du montage:`, error);
    }
  }
  
  /**
   * Configure les raccourcis clavier
   */
  private async setupKeyMapping(): Promise<void> {
    try {
      const nvim = workspace.nvim;
      const { commands } = require('coc.nvim');
      
      // CORRECTION: Utiliser une méthode plus directe pour les mappings
      // Méthode 1: Utiliser la commande Vim directe
      await nvim.command(`nnoremap <silent><buffer> <Space> :CocCommand vue.directIncrementCounter ${this.instanceId}<CR>`);
      
      // Méthode 2: Ajouter un autocmd temporaire pour la barre d'espace
      // La ligne suivante est un filet de sécurité si la méthode 1 ne fonctionne pas
      const autoCmd = `autocmd FileType * if &ft == 'vue' | nmap <buffer> <Space> :CocCommand vue.directIncrementCounter ${this.instanceId}<CR> | endif`;
      await nvim.command(`augroup DirectDemoMappings_${this.instanceId}`);
      await nvim.command('autocmd!');
      await nvim.command(autoCmd);
      await nvim.command('augroup END');
      
      console.log(`[DIRECT-DEMO-${this.instanceId}] Raccourcis clavier configurés`);
    } catch (error) {
      console.error(`[DIRECT-DEMO-${this.instanceId}] Erreur lors de la configuration des raccourcis:`, error);
    }
  }
  
  /**
   * Démarrer le timer de mise à jour
   */
  private startUpdateTimer(): void {
    this.timer = setInterval(() => {
      this.updateBuffer().catch(err => {
        console.error(`[DIRECT-DEMO-${this.instanceId}] Erreur de mise à jour:`, err);
      });
    }, 1000);
    
    console.log(`[DIRECT-DEMO-${this.instanceId}] Timer de mise à jour démarré: ${this.timer}`);
  }
  
  /**
   * Met à jour le contenu du buffer
   */
  private async updateBuffer(): Promise<void> {
    try {
      if (this.bufnr <= 0) return;
      
      const nvim = workspace.nvim;
      
      // Vérifier que le buffer existe toujours
      const bufExists = await nvim.eval(`bufexists(${this.bufnr})`) as number;
      if (!bufExists) {
        console.log(`[DIRECT-DEMO-${this.instanceId}] Buffer #${this.bufnr} n'existe plus, arrêt des mises à jour`);
        this.cleanup();
        return;
      }
      
      // Générer le contenu
      const timestamp = new Date().toLocaleTimeString();
      const lines = [
        '┌─────────── TEST DIRECT BUFFER ────────────┐',
        '│                                           │',
        `│  Heure actuelle: ${timestamp.padEnd(19)} │`,
        '│                                           │',
        `│  Compteur: ${this.counter.toString().padEnd(27)} │`,
        '│  (Appuyez sur ESPACE pour incrémenter)    │',
        '│                                           │',
        '└───────────────────────────────────────────┘'
      ];
      
      // Écrire le contenu dans le buffer
      await nvim.command(`call deletebufline(${this.bufnr}, 1, "$")`);
      await nvim.call('setbufline', [this.bufnr, 1, lines]);
      
      console.log(`[DIRECT-DEMO-${this.instanceId}] Buffer #${this.bufnr} mis à jour avec ${lines.length} lignes`);
      
      // Forcer le redessinage
      await nvim.command('redraw!');
    } catch (error) {
      console.error(`[DIRECT-DEMO-${this.instanceId}] Erreur lors de la mise à jour du buffer:`, error);
    }
  }
  
  /**
   * Incrémenter le compteur
   */
  public incrementCounter(): void {
    this.counter++;
    console.log(`[DIRECT-DEMO-${this.instanceId}] Compteur incrémenté: ${this.counter}`);
    
    // Mettre à jour immédiatement le buffer
    this.updateBuffer().catch(err => {
      console.error(`[DIRECT-DEMO-${this.instanceId}] Erreur lors de l'incrémentation:`, err);
    });
  }
  
  /**
   * Nettoie les ressources
   */
  public cleanup(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    console.log(`[DIRECT-DEMO-${this.instanceId}] Ressources nettoyées`);
  }
  
  /**
   * Recherche une instance par son ID et incrémente son compteur
   */
  public static incrementCounterById(instanceId: string): void {
    for (const instance of instances) {
      if (instance.instanceId === instanceId) {
        instance.incrementCounter();
        return;
      }
    }
  }
}

// Registre global des instances actives
const instances: DirectBufferDemo[] = [];

/**
 * Crée et monte une nouvelle instance
 */
export async function createDirectDemo(): Promise<void> {
  try {
    // Nettoyer les instances précédentes
    for (const instance of [...instances]) {
      instance.cleanup();
    }
    instances.length = 0;
    
    // Créer une nouvelle instance
    const demo = new DirectBufferDemo();
    instances.push(demo);
    await demo.mount();
  } catch (error) {
    console.error('[DIRECT-DEMO] Erreur lors de la création:', error);
  }
}
