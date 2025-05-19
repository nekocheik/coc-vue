import { WindowOptions } from '../types';
import { workspace, window } from 'coc.nvim';

/**
 * Adaptateur DOM pour NeoVim
 * Traduit les opérations DOM en actions NeoVim
 */
export class NeovimDOMAdapter {
  private nvim: any;
  private floatWindow: any = null;
  private buffer: any = null;
  private elements: Map<string, any> = new Map();
  
  constructor(nvim: any) {
    this.nvim = nvim;
  }
  
  /**
   * Crée une fenêtre pour le rendu
   */
  async createWindow(options: WindowOptions): Promise<string> {
    try {
      console.log('[DOM] Création d\'une fenêtre avec Vim standard...');
      
      // Utiliser uniquement des commandes Vim standards
      const nvim = workspace.nvim;
      
      // Créer une nouvelle fenêtre split
      console.log('[DOM] Création d\'une nouvelle fenêtre split...');
      await nvim.command('new');
      
      // Préparer le contenu
      const title = options.title || 'Vue App';
      const lines = [
        'Vue.js Integration pour Vim/NeoVim',
        '==============================',
        '',
        `${title}`,
        '',
        'Fonctionnalités:',
        ' - Composants réactifs',
        ' - Interface utilisateur riche',
        ' - Hooks Vim',
        '',
        "Appuyez sur 'q' pour fermer cette fenêtre."
      ];
      
      // Obtenir le numéro du buffer actuel (celui créé par 'new')
      const bufnr = await nvim.eval('bufnr("%")');
      console.log('[DOM] Numéro du buffer actuel:', bufnr);
      this.buffer = { id: bufnr };
      
      // Ajouter des lignes au buffer en utilisant des commandes Vim standard
      console.log('[DOM] Ajout du contenu au buffer...');
      
      // Insertion des lignes une par une
      for (let i = 0; i < lines.length; i++) {
        await nvim.command(`call setline(${i+1}, '${lines[i].replace(/'/g, "''")}')`);
      }
      
      // Configurer le buffer
      console.log('[DOM] Configuration du buffer...');
      await nvim.command('setlocal buftype=nofile');
      await nvim.command('setlocal bufhidden=wipe');
      await nvim.command('setlocal noswapfile');
      await nvim.command('setlocal nomodifiable');
      
      // Ajouter un mapping pour fermer facilement la fenêtre
      await nvim.command('nnoremap <buffer> q :q<CR>');
      
      // Configurer l'apparence
      await nvim.command('setlocal cursorline');
      await nvim.command('setlocal nonumber');
      
      // Changer le nom du buffer pour refléter son contenu
      const bufferName = `vue-${title.toLowerCase().replace(/\s+/g, '-')}`;
      await nvim.command(`file ${bufferName}`);
      
      console.log('[DOM] Fenêtre créée avec succès!');
      return 'window-created';
    } catch (error) {
      console.error('[DOM] Erreur lors de la création de la fenêtre:', error);
      window.showErrorMessage(`Erreur lors de la création de la fenêtre: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Crée un élément DOM virtuel
   */
  createElement(tag: string, id: string, classes: string[] = []): string {
    const elementId = `vue-${id}`;
    this.elements.set(elementId, { 
      tag, 
      id: elementId, 
      classes, 
      children: [], 
      style: {},
      text: '',
      attributes: {},
      events: {}
    });
    
    console.log(`[DOM] Created element: ${tag}#${elementId}`);
    return elementId;
  }
  
  /**
   * Ajoute un enfant à un parent
   */
  appendChild(parentId: string, childId: string): void {
    const parent = this.elements.get(parentId);
    const child = this.elements.get(childId);
    
    if (parent && child) {
      parent.children.push(childId);
      console.log(`[DOM] Appended ${childId} to ${parentId}`);
      this.updateRender();
    } else {
      console.error(`[DOM] Can't append: parent or child not found`);
    }
  }
  
  /**
   * Définit le style d'un élément
   */
  setStyle(elementId: string, styles: Record<string, any>): void {
    const element = this.elements.get(elementId);
    if (element) {
      element.style = { ...element.style, ...styles };
      console.log(`[DOM] Set style for ${elementId}:`, styles);
      this.updateRender();
    }
  }
  
  /**
   * Définit le texte d'un élément
   */
  setText(elementId: string, text: string): void {
    const element = this.elements.get(elementId);
    if (element) {
      element.text = text;
      console.log(`[DOM] Set text for ${elementId}: ${text}`);
      this.updateRender();
    }
  }
  
  /**
   * Définit un attribut sur un élément
   */
  setAttribute(elementId: string, name: string, value: any): void {
    const element = this.elements.get(elementId);
    if (element) {
      element.attributes[name] = value;
      console.log(`[DOM] Set attribute ${name}=${value} for ${elementId}`);
      this.updateRender();
    }
  }
  
  /**
   * Ajoute un écouteur d'événement
   */
  addEventListener(elementId: string, event: string, handler: Function): void {
    const element = this.elements.get(elementId);
    if (element) {
      if (!element.events[event]) {
        element.events[event] = [];
      }
      element.events[event].push(handler);
      console.log(`[DOM] Added ${event} listener to ${elementId}`);
    }
  }
  
  /**
   * Supprime un écouteur d'événement
   */
  removeEventListener(elementId: string, event: string, handler: Function): void {
    const element = this.elements.get(elementId);
    if (element && element.events[event]) {
      element.events[event] = element.events[event].filter((h: Function) => h !== handler);
      console.log(`[DOM] Removed ${event} listener from ${elementId}`);
    }
  }
  
  /**
   * Met à jour le rendu
   */
  updateRender(): void {
    if (!this.buffer) return;
    
    // Générer les lignes à afficher
    const lines = this.generateRenderLines();
    
    // Mettre à jour le contenu du buffer
    // Dans une implémentation réelle, nous utiliserions ici l'API Neovim
    console.log('Rendu mis à jour:', lines.join('\n'));
  }
  
  /**
   * Simule le rendu d'un composant Vue en affichant des lignes dans le buffer
   * Cette méthode est une simplification pour montrer comment un composant Vue
   * pourrait être représenté textuellement dans Vim
   */
  async simulateComponentRender(contentLines: string[]): Promise<boolean> {
    try {
      console.log('[DOM] Simulation du rendu d\'un composant Vue...');
      
      if (!this.buffer || !this.buffer.id) {
        console.error('[DOM] Pas de buffer actif pour le rendu');
        return false;
      }
      
      // Obtenir l'instance nvim
      const nvim = workspace.nvim;
      
      // Rendre le contenu ligne par ligne (après la ligne 0)
      console.log('[DOM] Insertion du contenu du composant dans le buffer...');
      
      // Rendre l'adaptateur modifiable
      await nvim.command('setlocal modifiable');
      
      // Effacer le contenu existant
      await nvim.command('%delete _');
      
      // Insérer les lignes une par une
      for (let i = 0; i < contentLines.length; i++) {
        await nvim.command(`call setline(${i+1}, '${contentLines[i].replace(/'/g, "''")}')`); 
      }
      
      // Rendre l'adaptateur non modifiable à nouveau
      await nvim.command('setlocal nomodifiable');
      
      // Placer le curseur au début du buffer
      await nvim.command('normal! gg');
      
      console.log('[DOM] Rendu du composant Vue terminé');
      return true;
    } catch (error) {
      console.error('[DOM] Erreur lors de la simulation du rendu du composant:', error);
      return false;
    }
  }
  
  /**
   * Convertit l'arbre DOM en lignes de texte
   */
  private renderDOMTree(): string[] {
    const lines: string[] = [];
    
    // Fonction récursive pour rendre un élément et ses enfants
    const renderElement = (elementId: string, indent: number = 0): void => {
      const element = this.elements.get(elementId);
      if (!element) return;
      
      const indentStr = ' '.repeat(indent * 2);
      
      // Rendre différemment selon le type d'élément
      if (element.tag === 'div') {
        lines.push(`${indentStr}┌${'─'.repeat(20)}┐`);
        
        if (element.text) {
          lines.push(`${indentStr}│ ${element.text.padEnd(18)} │`);
        } else {
          lines.push(`${indentStr}│${' '.repeat(20)}│`);
        }
        
        // Rendre les enfants
        element.children.forEach((childId: string) => renderElement(childId, indent + 1));
        
        lines.push(`${indentStr}└${'─'.repeat(20)}┘`);
      } else if (element.tag === 'button') {
        lines.push(`${indentStr}[ ${element.text || 'Button'} ]`);
      } else if (element.tag === 'input') {
        lines.push(`${indentStr}| ${element.text || ''} |`);
      } else {
        lines.push(`${indentStr}${element.text || ''}`);
      }
    };
    
    // Rendre à partir des éléments racine
    const rootElements = Array.from(this.elements.values())
      .filter(element => !Array.from(this.elements.values())
        .some(el => el.children && el.children.includes(element.id)));
    
    rootElements.forEach(element => renderElement(element.id));
    
    return lines;
  }
  
  /**
   * Déclenche un événement sur un élément
   */
  triggerEvent(elementId: string, event: string, data: any): void {
    const element = this.elements.get(elementId);
    if (element && element.events[event]) {
      element.events[event].forEach((handler: Function) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[DOM] Error in event handler: ${error}`);
        }
      });
    }
  }
}
