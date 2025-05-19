/**
 * Adaptateur Neovim - Interface unifiée pour toutes les opérations Neovim
 * Fournit une abstraction des opérations Vim/Neovim pour faciliter les tests et la maintenance
 */
import { workspace } from 'coc.nvim';

/**
 * Interface d'abstraction pour les opérations Neovim
 */
export interface NeovimAdapter {
  createBuffer(name: string): Promise<number>;
  deleteBuffer(bufnr: number): Promise<void>;
  setBufferLines(bufnr: number, start: number, end: number, lines: string[]): Promise<void>;
  getBufferLines(bufnr: number, start: number, end: number): Promise<string[]>;
  setCursorPosition(bufnr: number, line: number, col: number): Promise<void>;
  getCursorPosition(bufnr: number): Promise<[number, number] | null>;
  executeCommand(command: string): Promise<void>;
  getCurrentMode(): Promise<string>;
  registerKeyMapping(bufnr: number, mode: string, key: string, action: string): Promise<void>;
  registerAutocommand(event: string, pattern: string, command: string): Promise<void>;
  setBufferOption(bufnr: number, option: string, value: any): Promise<void>;
  getBufferOption(bufnr: number, option: string): Promise<any>;
}

/**
 * Implémentation concrète de l'adaptateur Neovim pour coc.nvim
 */
class CocNeovimAdapter implements NeovimAdapter {
  private nvim = workspace.nvim;
  
  /**
   * Crée un nouveau buffer
   */
  async createBuffer(name: string): Promise<number> {
    await this.nvim.command('new');
    await this.nvim.command('setlocal buftype=nofile');
    await this.nvim.command('setlocal noswapfile');
    const bufnr = await this.nvim.eval('bufnr("%")') as number;
    await this.nvim.command(`file ${name}`);
    return bufnr;
  }
  
  /**
   * Supprime un buffer
   */
  async deleteBuffer(bufnr: number): Promise<void> {
    const exists = await this.nvim.eval(`bufexists(${bufnr})`) as number;
    if (exists) {
      await this.nvim.command(`bdelete! ${bufnr}`);
    }
  }
  
  /**
   * Définit les lignes d'un buffer
   */
  async setBufferLines(bufnr: number, start: number, end: number, lines: string[]): Promise<void> {
    const exists = await this.nvim.eval(`bufexists(${bufnr})`) as number;
    if (!exists) return;
    
    // Utiliser des commandes Vim standard au lieu de nvim_buf_set_lines
    // Sauvegarder le buffer actuel
    const currentBufnr = await this.nvim.eval('bufnr("%")') as number;
    
    try {
      // Aller au buffer cible
      await this.nvim.command(`buffer ${bufnr}`);
      
      // Rendre le buffer modifiable
      await this.nvim.command('setlocal modifiable');
      
      // Effacer le contenu existant si on remplace tout le buffer
      if (start === 0 && (end === -1 || end >= await this.nvim.eval('line("$")') as number)) {
        await this.nvim.command('%delete _');
        
        // Ajouter les nouvelles lignes
        if (lines.length > 0) {
          // Échapper les guillemets et les barres obliques inverses pour la commande Vim
          const escapedLines = lines.map(line => 
            line.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
          );
          
          await this.nvim.command(`call append(0, ["${escapedLines.join('","')}"])`);
          // Supprimer la ligne vide qui reste au début
          await this.nvim.command('1delete _');
        }
      } else {
        // Pour les remplacements partiels
        const endLine = end === -1 ? await this.nvim.eval('line("$")') as number : end;
        
        // Supprimer les lignes dans la plage spécifiée
        if (endLine > start) {
          await this.nvim.command(`${start + 1},${endLine}delete _`);
        }
        
        // Ajouter les nouvelles lignes
        if (lines.length > 0) {
          const escapedLines = lines.map(line => 
            line.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
          );
          
          await this.nvim.command(`call append(${start}, ["${escapedLines.join('","')}"])`);
        }
      }
    } finally {
      // Revenir au buffer original si nécessaire
      if (currentBufnr !== bufnr && await this.nvim.eval(`bufexists(${currentBufnr})`) as number) {
        await this.nvim.command(`buffer ${currentBufnr}`);
      }
    }
  }
  
  /**
   * Récupère les lignes d'un buffer
   */
  async getBufferLines(bufnr: number, start: number, end: number): Promise<string[]> {
    const exists = await this.nvim.eval(`bufexists(${bufnr})`) as number;
    if (!exists) return [];
    
    // Utiliser des commandes Vim standard au lieu de nvim_buf_get_lines
    // Sauvegarder le buffer actuel
    const currentBufnr = await this.nvim.eval('bufnr("%")') as number;
    let lines: string[] = [];
    
    try {
      // Aller au buffer cible
      await this.nvim.command(`buffer ${bufnr}`);
      
      // Déterminer la fin réelle si end est -1
      const endLine = end === -1 ? await this.nvim.eval('line("$")') as number : end;
      
      // Récupérer les lignes une par une
      for (let i = start + 1; i <= endLine; i++) {
        const line = await this.nvim.eval(`getline(${i})`) as string;
        lines.push(line);
      }
    } finally {
      // Revenir au buffer original si nécessaire
      if (currentBufnr !== bufnr && await this.nvim.eval(`bufexists(${currentBufnr})`) as number) {
        await this.nvim.command(`buffer ${currentBufnr}`);
      }
    }
    
    return lines;
  }
  
  /**
   * Définit la position du curseur
   */
  async setCursorPosition(bufnr: number, line: number, col: number): Promise<void> {
    const currentBufnr = await this.nvim.eval('bufnr("%")') as number;
    if (currentBufnr !== bufnr) {
      const exists = await this.nvim.eval(`bufexists(${bufnr})`) as number;
      if (!exists) return;
      await this.nvim.command(`buffer ${bufnr}`);
    }
    await this.nvim.call('cursor', [line, col]);
  }
  
  /**
   * Récupère la position du curseur
   */
  async getCursorPosition(bufnr: number): Promise<[number, number] | null> {
    const currentBufnr = await this.nvim.eval('bufnr("%")') as number;
    if (currentBufnr !== bufnr) {
      return null; // Buffer non actif
    }
    const pos = await this.nvim.call('getpos', ['.']) as [number, number, number, number];
    return [pos[1], pos[2]];
  }
  
  /**
   * Exécute une commande Vim
   */
  async executeCommand(command: string): Promise<void> {
    await this.nvim.command(command);
  }
  
  /**
   * Récupère le mode actuel (normal, insert, etc.)
   */
  async getCurrentMode(): Promise<string> {
    return await this.nvim.eval('mode()') as string;
  }
  
  /**
   * Enregistre un mapping de touches
   */
  async registerKeyMapping(bufnr: number, mode: string, key: string, action: string): Promise<void> {
    await this.nvim.command(`${mode}noremap <silent><buffer=${bufnr}> ${key} ${action}`);
  }
  
  /**
   * Enregistre une autocommande
   */
  async registerAutocommand(event: string, pattern: string, command: string): Promise<void> {
    await this.nvim.command(`autocmd ${event} ${pattern} ${command}`);
  }
  
  /**
   * Définit une option de buffer
   */
  async setBufferOption(bufnr: number, option: string, value: any): Promise<void> {
    // Convertir les booléens en 1 ou 0 pour Vim
    const vimValue = typeof value === 'boolean' ? (value ? 1 : 0) : value;
    
    // Éviter d'utiliser JSON.stringify pour les nombres car cela ajoute des guillemets
    const valueStr = typeof vimValue === 'number' ? vimValue : JSON.stringify(vimValue);
    
    await this.nvim.command(`call setbufvar(${bufnr}, '&${option}', ${valueStr})`);
  }
  
  /**
   * Récupère une option de buffer
   */
  async getBufferOption(bufnr: number, option: string): Promise<any> {
    return await this.nvim.eval(`getbufvar(${bufnr}, '&${option}')`) as any;
  }
}

// Création d'une instance singleton
export const neovimAdapter: NeovimAdapter = new CocNeovimAdapter();
