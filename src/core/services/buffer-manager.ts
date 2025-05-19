/**
 * Gestionnaire de buffer abstrait sans dépendance à l'UI
 * Fournit une interface simplifiée pour manipuler les buffers Neovim
 */
import { neovimAdapter } from '../adapters/neovim-adapter';
import { globalEventBus, EventTypes } from '../utils/event-bus';
import { logger } from '../utils/logger';

/**
 * Gestionnaire de buffer
 */
export class BufferManager {
  private bufnr: number = -1;
  private lines: string[] = [];
  private name: string = '';
  private isModifiable: boolean = true;
  
  /**
   * Crée un nouveau buffer
   * @param name Nom du buffer
   * @returns Numéro du buffer créé
   */
  async createBuffer(name: string): Promise<number> {
    try {
      logger.info('BufferManager', `Création du buffer: ${name}`);
      this.name = name;
      
      // Créer le buffer via l'adaptateur Neovim
      this.bufnr = await neovimAdapter.createBuffer(name);
      
      // Émettre un événement de création de buffer
      globalEventBus.emit(EventTypes.BUFFER_CREATED, {
        bufnr: this.bufnr,
        name: this.name
      });
      
      return this.bufnr;
    } catch (error) {
      logger.error('BufferManager', `Erreur lors de la création du buffer ${name}:`, error);
      throw error;
    }
  }
  
  /**
   * Met à jour le contenu du buffer
   * @param lines Nouvelles lignes à afficher
   */
  async updateContent(lines: string[]): Promise<void> {
    try {
      if (this.bufnr <= 0) {
        logger.warn('BufferManager', 'Tentative de mise à jour d\'un buffer non initialisé');
        return;
      }
      
      // Vérifier que le buffer existe toujours
      const bufExists = await neovimAdapter.getBufferOption(this.bufnr, 'buflisted');
      if (!bufExists) {
        logger.warn('BufferManager', `Buffer #${this.bufnr} n'existe plus`);
        this.bufnr = -1;
        return;
      }
      
      // Sauvegarder l'état actuel
      const currentMode = await neovimAdapter.getCurrentMode();
      const isInsertMode = currentMode === 'i' || currentMode === 'I';
      let cursorPosition = await neovimAdapter.getCursorPosition(this.bufnr);
      
      // Rendre le buffer modifiable
      await neovimAdapter.setBufferOption(this.bufnr, 'modifiable', 1);
      
      // Mettre à jour le contenu
      await neovimAdapter.setBufferLines(this.bufnr, 0, -1, lines);
      this.lines = [...lines];
      
      // Émettre un événement de mise à jour
      globalEventBus.emit(EventTypes.BUFFER_UPDATED, {
        bufnr: this.bufnr,
        lines: this.lines
      });
      
      // Restaurer l'état si nécessaire
      if (!this.isModifiable && !isInsertMode) {
        await neovimAdapter.setBufferOption(this.bufnr, 'modifiable', 0);
      }
      
      // Restaurer la position du curseur si nécessaire
      if (cursorPosition) {
        await neovimAdapter.setCursorPosition(this.bufnr, cursorPosition[0], cursorPosition[1]);
        if (isInsertMode) {
          await neovimAdapter.executeCommand('startinsert');
        }
      }
      
      logger.debug('BufferManager', `Buffer #${this.bufnr} mis à jour avec ${lines.length} lignes`);
    } catch (error) {
      logger.error('BufferManager', `Erreur lors de la mise à jour du buffer #${this.bufnr}:`, error);
      throw error;
    }
  }
  
  /**
   * Obtient la position actuelle du curseur
   * @returns Position du curseur [ligne, colonne] ou null si le buffer n'est pas actif
   */
  async getCursorPosition(): Promise<[number, number] | null> {
    if (this.bufnr <= 0) return null;
    return await neovimAdapter.getCursorPosition(this.bufnr);
  }
  
  /**
   * Définit la position du curseur
   * @param line Numéro de ligne
   * @param column Numéro de colonne
   */
  async setCursorPosition(line: number, column: number): Promise<void> {
    if (this.bufnr <= 0) return;
    await neovimAdapter.setCursorPosition(this.bufnr, line, column);
  }
  
  /**
   * Obtient le contenu d'une ligne
   * @param lineNum Numéro de ligne (1-based, comme dans Vim)
   * @returns Contenu de la ligne ou null si la ligne n'existe pas
   */
  async getLine(lineNum: number): Promise<string | null> {
    if (this.bufnr <= 0 || lineNum <= 0 || lineNum > this.lines.length) return null;
    
    try {
      const lines = await neovimAdapter.getBufferLines(this.bufnr, lineNum - 1, lineNum, false);
      return lines[0] || null;
    } catch (error) {
      logger.error('BufferManager', `Erreur lors de la récupération de la ligne ${lineNum}:`, error);
      return null;
    }
  }
  
  /**
   * Définit le contenu d'une ligne
   * @param lineNum Numéro de ligne (1-based, comme dans Vim)
   * @param content Nouveau contenu de la ligne
   */
  async setLine(lineNum: number, content: string): Promise<void> {
    if (this.bufnr <= 0 || lineNum <= 0) return;
    
    try {
      await neovimAdapter.setBufferOption(this.bufnr, 'modifiable', 1);
      await neovimAdapter.setBufferLines(this.bufnr, lineNum - 1, lineNum, [content]);
      
      // Mettre à jour notre cache local
      if (lineNum <= this.lines.length) {
        this.lines[lineNum - 1] = content;
      } else {
        // Ajouter des lignes vides si nécessaire
        while (this.lines.length < lineNum - 1) {
          this.lines.push('');
        }
        this.lines.push(content);
      }
      
      if (!this.isModifiable) {
        await neovimAdapter.setBufferOption(this.bufnr, 'modifiable', 0);
      }
    } catch (error) {
      logger.error('BufferManager', `Erreur lors de la définition de la ligne ${lineNum}:`, error);
    }
  }
  
  /**
   * Configure les mappages clavier pour le buffer
   * @param mappings Mappages à configurer
   */
  async setupKeyMappings(mappings: KeyMapping[]): Promise<void> {
    if (this.bufnr <= 0) return;
    
    try {
      for (const mapping of mappings) {
        await neovimAdapter.registerKeyMapping(
          this.bufnr,
          mapping.mode,
          mapping.key,
          mapping.action
        );
        logger.debug('BufferManager', `Mapping configuré: ${mapping.mode}map ${mapping.key} -> ${mapping.action}`);
      }
    } catch (error) {
      logger.error('BufferManager', 'Erreur lors de la configuration des mappages:', error);
    }
  }
  
  /**
   * Configure les autocommandes pour le buffer
   * @param autocommands Autocommandes à configurer
   */
  async setupAutocommands(autocommands: Autocommand[]): Promise<void> {
    try {
      await neovimAdapter.executeCommand(`augroup BufferManager_${this.bufnr}`);
      await neovimAdapter.executeCommand('autocmd!');
      
      for (const autocmd of autocommands) {
        const pattern = autocmd.bufferSpecific ? `<buffer=${this.bufnr}>` : autocmd.pattern;
        await neovimAdapter.registerAutocommand(
          autocmd.event,
          pattern,
          autocmd.command
        );
        logger.debug('BufferManager', `Autocommande configurée: ${autocmd.event} ${pattern} -> ${autocmd.command}`);
      }
      
      await neovimAdapter.executeCommand('augroup END');
    } catch (error) {
      logger.error('BufferManager', 'Erreur lors de la configuration des autocommandes:', error);
    }
  }
  
  /**
   * Définit si le buffer est modifiable
   * @param modifiable Indique si le buffer est modifiable
   */
  async setModifiable(modifiable: boolean): Promise<void> {
    if (this.bufnr <= 0) return;
    
    this.isModifiable = modifiable;
    await neovimAdapter.setBufferOption(this.bufnr, 'modifiable', modifiable ? 1 : 0);
  }
  
  /**
   * Vérifie si le buffer existe encore
   * @returns true si le buffer existe, false sinon
   */
  async exists(): Promise<boolean> {
    if (this.bufnr <= 0) return false;
    return await neovimAdapter.getBufferOption(this.bufnr, 'buflisted') as boolean;
  }
  
  /**
   * Obtient le numéro du buffer
   * @returns Numéro du buffer
   */
  getBufferNumber(): number {
    return this.bufnr;
  }
  
  /**
   * Obtient le nom du buffer
   * @returns Nom du buffer
   */
  getName(): string {
    return this.name;
  }
  
  /**
   * Nettoie les ressources
   */
  async cleanup(): Promise<void> {
    if (this.bufnr <= 0) return;
    
    try {
      // Émettre un événement de fermeture
      globalEventBus.emit(EventTypes.BUFFER_CLOSED, {
        bufnr: this.bufnr,
        name: this.name
      });
      
      // Supprimer le buffer
      await neovimAdapter.deleteBuffer(this.bufnr);
      
      this.bufnr = -1;
      this.lines = [];
      logger.info('BufferManager', `Buffer ${this.name} nettoyé`);
    } catch (error) {
      logger.error('BufferManager', `Erreur lors du nettoyage du buffer ${this.name}:`, error);
    }
  }
}

/**
 * Interface pour les mappages clavier
 */
export interface KeyMapping {
  mode: string;      // 'n' pour normal, 'i' pour insert, etc.
  key: string;       // Touche à mapper
  action: string;    // Action à exécuter
}

/**
 * Interface pour les autocommandes
 */
export interface Autocommand {
  event: string;           // Événement (TextChanged, CursorMoved, etc.)
  pattern: string;         // Pattern (*, *.txt, etc.)
  command: string;         // Commande à exécuter
  bufferSpecific: boolean; // Indique si l'autocommande est spécifique au buffer
}
