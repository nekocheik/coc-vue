/**
 * Contrôleur de formulaire simplifié
 * Orchestre les interactions entre les champs de saisie et le buffer
 */
import { workspace } from 'coc.nvim';
import { BufferManager, KeyMapping, Autocommand } from '../services/buffer-manager';
import { SimpleInputField } from '../components/simple-input-field';
import { FocusManager } from '../services/focus-manager';
import { globalEventBus, EventTypes } from '../utils/event-bus';
import { logger } from '../utils/logger';

/**
 * Contrôleur de formulaire
 */
export class SimpleFormController {
  private bufferManager: BufferManager;
  private focusManager: FocusManager;
  private fields: SimpleInputField[] = [];
  private updateTimer: NodeJS.Timeout | null = null;
  private instanceId: string;
  private title: string;
  
  /**
   * Crée un nouveau contrôleur de formulaire
   * @param title Titre du formulaire
   */
  constructor(title: string = 'Formulaire Simple') {
    this.instanceId = Math.random().toString(36).substring(2, 8);
    this.title = title;
    this.bufferManager = new BufferManager();
    this.focusManager = new FocusManager();
    
    logger.info('SimpleFormController', `Contrôleur créé: ${this.instanceId}, titre: ${title}`);
    
    // S'abonner aux événements pertinents
    globalEventBus.on(EventTypes.INPUT_CHANGED, this.handleInputChanged.bind(this));
    globalEventBus.on(EventTypes.INPUT_FOCUSED, this.handleInputFocused.bind(this));
  }
  
  /**
   * Ajoute un champ au formulaire
   * @param field Champ à ajouter
   */
  addField(field: SimpleInputField): void {
    this.fields.push(field);
    this.focusManager.register(field);
    logger.debug('SimpleFormController', `Champ ajouté: ${field.id}`);
  }
  
  /**
   * Monte le formulaire dans un buffer
   * @param bufferName Nom du buffer (optionnel)
   */
  async mount(bufferName?: string): Promise<void> {
    try {
      const name = bufferName || `${this.title} (${this.instanceId})`;
      await this.bufferManager.createBuffer(name);
      
      // Configurer les mappages clavier
      await this.setupKeyMappings();
      
      // Configurer les autocommandes
      await this.setupAutocommands();
      
      // Effectuer le rendu initial
      await this.render();
      
      // Démarrer les mises à jour périodiques
      this.startUpdateTimer();
      
      logger.info('SimpleFormController', `Formulaire monté: ${name}`);
    } catch (error) {
      logger.error('SimpleFormController', `Erreur lors du montage du formulaire:`, error);
    }
  }
  
  /**
   * Configure les mappages clavier
   */
  private async setupKeyMappings(): Promise<void> {
    const mappings: KeyMapping[] = [
      // Navigation
      { mode: 'n', key: '<Tab>', action: `:CocCommand vue.simpleFormNextField ${this.instanceId}<CR>` },
      { mode: 'n', key: '<S-Tab>', action: `:CocCommand vue.simpleFormPrevField ${this.instanceId}<CR>` },
      
      // Édition
      { mode: 'n', key: 'i', action: `:CocCommand vue.simpleFormEditField ${this.instanceId}<CR>` },
      { mode: 'n', key: 'a', action: `:CocCommand vue.simpleFormEditField ${this.instanceId}<CR>` },
      
      // Validation/Annulation
      { mode: 'i', key: '<CR>', action: `<Esc>:CocCommand vue.simpleFormConfirm ${this.instanceId}<CR>` },
      { mode: 'i', key: '<Esc>', action: `<Esc>:CocCommand vue.simpleFormCancel ${this.instanceId}<CR>` },
      
      // Navigation en mode insertion
      { mode: 'i', key: '<Tab>', action: `<Esc>:CocCommand vue.simpleFormNextField ${this.instanceId}<CR>` },
      { mode: 'i', key: '<S-Tab>', action: `<Esc>:CocCommand vue.simpleFormPrevField ${this.instanceId}<CR>` }
    ];
    
    await this.bufferManager.setupKeyMappings(mappings);
  }
  
  /**
   * Configure les autocommandes
   */
  private async setupAutocommands(): Promise<void> {
    const autocommands: Autocommand[] = [
      // Détection des changements de texte
      {
        event: 'TextChangedI',
        pattern: '*',
        command: `call timer_start(10, { -> execute('CocCommand vue.simpleFormTextChanged ${this.instanceId}') })`,
        bufferSpecific: true
      },
      
      // Détection des mouvements du curseur
      {
        event: 'CursorMovedI',
        pattern: '*',
        command: `call timer_start(10, { -> execute('CocCommand vue.simpleFormCursorMoved ${this.instanceId}') })`,
        bufferSpecific: true
      },
      
      // Gestion de la modifiabilité du buffer
      {
        event: 'InsertEnter',
        pattern: '*',
        command: `call setbufvar(bufnr('%'), '&modifiable', 1)`,
        bufferSpecific: true
      },
      {
        event: 'InsertLeave',
        pattern: '*',
        command: `call timer_start(100, { -> execute('setlocal nomodifiable') })`,
        bufferSpecific: true
      }
    ];
    
    await this.bufferManager.setupAutocommands(autocommands);
  }
  
  /**
   * Démarre le timer de mise à jour
   */
  private startUpdateTimer(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    this.updateTimer = setInterval(async () => {
      try {
        // Vérifier si le buffer existe toujours
        const exists = await this.bufferManager.exists();
        if (!exists) {
          this.cleanup();
          return;
        }
        
        // Mettre à jour le formulaire (pour l'horloge, etc.)
        await this.render();
      } catch (err) {
        logger.error('SimpleFormController', `Erreur lors de la mise à jour périodique:`, err);
      }
    }, 1000); // 1000ms = 1 seconde
    
    logger.debug('SimpleFormController', `Timer de mise à jour démarré: ${this.updateTimer}`);
  }
  
  /**
   * Passe au champ suivant
   */
  async nextField(): Promise<void> {
    this.focusManager.next();
    await this.render();
    await this.positionCursorInCurrentField();
  }
  
  /**
   * Passe au champ précédent
   */
  async prevField(): Promise<void> {
    this.focusManager.previous();
    await this.render();
    await this.positionCursorInCurrentField();
  }
  
  /**
   * Entre en mode édition pour le champ actuel
   */
  async editCurrentField(): Promise<void> {
    const currentField = this.focusManager.getCurrentElement();
    if (!currentField) return;
    
    // Trouver l'index du champ actuel
    const fieldIndex = this.fields.findIndex(f => f.id === currentField.id);
    if (fieldIndex === -1) return;
    
    // Calculer la position du curseur dans la ligne
    const fieldLine = this.getFieldLine(fieldIndex);
    
    // Obtenir la ligne actuelle
    const line = await this.bufferManager.getLine(fieldLine);
    if (!line) return;
    
    // Trouver la position du curseur dans la ligne
    const match = line.match(/\[(.*)\]/);
    if (!match) return;
    
    const startPos = line.indexOf('[') + 1;
    const cursorPos = startPos + (currentField as SimpleInputField).getCursorPosition();
    
    // Positionner le curseur
    await this.bufferManager.setCursorPosition(fieldLine, cursorPos);
    
    // Passer en mode insertion
    await workspace.nvim.command('startinsert');
    
    logger.debug('SimpleFormController', `Édition du champ: ${currentField.id}, ligne: ${fieldLine}, colonne: ${cursorPos}`);
  }
  
  /**
   * Positionne le curseur dans le champ actuel
   */
  private async positionCursorInCurrentField(): Promise<void> {
    await this.editCurrentField();
  }
  
  /**
   * Gère les changements de texte
   */
  async handleTextChanged(): Promise<void> {
    const currentField = this.focusManager.getCurrentElement() as SimpleInputField;
    if (!currentField) return;
    
    // Trouver l'index du champ actuel
    const fieldIndex = this.fields.findIndex(f => f.id === currentField.id);
    if (fieldIndex === -1) return;
    
    // Obtenir la ligne du champ
    const fieldLine = this.getFieldLine(fieldIndex);
    
    // Obtenir le contenu actuel de la ligne
    const line = await this.bufferManager.getLine(fieldLine);
    if (!line) return;
    
    // Extraire la valeur entre crochets
    const match = line.match(/\[(.*)\]/);
    if (!match) return;
    
    const newValue = match[1].replace(/\|/, ''); // Supprimer le curseur visuel
    
    // Mettre à jour la valeur du champ
    if (newValue !== currentField.getValue()) {
      currentField.setValue(newValue);
      
      // Mettre à jour la position du curseur
      const cursorPos = await this.bufferManager.getCursorPosition();
      if (cursorPos) {
        const startPos = line.indexOf('[') + 1;
        const newCursorPos = Math.max(0, cursorPos[1] - startPos);
        currentField.setCursorPosition(newCursorPos);
      }
      
      logger.debug('SimpleFormController', `Valeur du champ ${currentField.id} mise à jour: "${newValue}"`);
    }
  }
  
  /**
   * Gère les mouvements du curseur
   */
  async handleCursorMoved(): Promise<void> {
    const currentField = this.focusManager.getCurrentElement() as SimpleInputField;
    if (!currentField) return;
    
    // Trouver l'index du champ actuel
    const fieldIndex = this.fields.findIndex(f => f.id === currentField.id);
    if (fieldIndex === -1) return;
    
    // Obtenir la ligne du champ
    const fieldLine = this.getFieldLine(fieldIndex);
    
    // Obtenir la position actuelle du curseur
    const cursorPos = await this.bufferManager.getCursorPosition();
    if (!cursorPos) return;
    
    // Vérifier si le curseur est sur la ligne du champ actuel
    if (cursorPos[0] === fieldLine) {
      // Obtenir la ligne actuelle
      const line = await this.bufferManager.getLine(fieldLine);
      if (!line) return;
      
      // Calculer la position du curseur dans le champ
      const startPos = line.indexOf('[') + 1;
      const newCursorPos = Math.max(0, cursorPos[1] - startPos);
      
      // Mettre à jour la position du curseur dans le modèle
      if (newCursorPos !== currentField.getCursorPosition()) {
        currentField.setCursorPosition(newCursorPos);
        logger.debug('SimpleFormController', `Position du curseur mise à jour: ${newCursorPos}`);
      }
    }
  }
  
  /**
   * Confirme l'édition du champ actuel
   */
  async confirmInput(): Promise<void> {
    await workspace.nvim.command('stopinsert');
    await this.handleTextChanged();
    await this.render();
    
    logger.info('SimpleFormController', `Édition confirmée`);
  }
  
  /**
   * Annule l'édition du champ actuel
   */
  async cancelInput(): Promise<void> {
    await workspace.nvim.command('stopinsert');
    await this.render();
    
    logger.info('SimpleFormController', `Édition annulée`);
  }
  
  /**
   * Calcule la ligne d'un champ dans le buffer
   * @param fieldIndex Index du champ
   * @returns Numéro de ligne (1-based)
   */
  private getFieldLine(fieldIndex: number): number {
    // 3 lignes d'en-tête + index du champ + 1 (car les lignes commencent à 1)
    return 3 + fieldIndex + 1;
  }
  
  /**
   * Gère les changements de valeur des champs
   * @param data Données de l'événement
   */
  private handleInputChanged(data: any): void {
    // Mettre à jour l'affichage quand un champ change
    this.render().catch(err => {
      logger.error('SimpleFormController', `Erreur lors du rendu après changement:`, err);
    });
  }
  
  /**
   * Gère les changements de focus
   * @param data Données de l'événement
   */
  private handleInputFocused(data: any): void {
    // Mettre à jour l'affichage quand le focus change
    this.render().catch(err => {
      logger.error('SimpleFormController', `Erreur lors du rendu après changement de focus:`, err);
    });
  }
  
  /**
   * Effectue le rendu du formulaire
   */
  async render(): Promise<void> {
    const timestamp = new Date().toLocaleTimeString();
    
    const lines: string[] = [
      this.title,
      ''.padEnd(this.title.length, '-'),
      ''
    ];
    
    // Ajouter chaque champ
    for (const field of this.fields) {
      lines.push(field.render());
    }
    
    // Ajouter l'horloge
    lines.push('');
    lines.push(`Heure actuelle: ${timestamp}`);
    
    // Ajouter des instructions
    lines.push('');
    lines.push('Navigation: Tab/Shift+Tab | Éditer: i | Valider: Entrée | Annuler: Échap');
    
    await this.bufferManager.updateContent(lines);
  }
  
  /**
   * Obtient l'ID d'instance
   * @returns ID d'instance
   */
  getInstanceId(): string {
    return this.instanceId;
  }
  
  /**
   * Obtient les valeurs de tous les champs
   * @returns Objet avec les valeurs des champs
   */
  getValues(): Record<string, string> {
    const values: Record<string, string> = {};
    for (const field of this.fields) {
      values[field.id] = field.getValue();
    }
    return values;
  }
  
  /**
   * Nettoie les ressources
   */
  async cleanup(): Promise<void> {
    logger.info('SimpleFormController', `Nettoyage des ressources: ${this.instanceId}`);
    
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    // Se désabonner des événements
    globalEventBus.clear(EventTypes.INPUT_CHANGED);
    globalEventBus.clear(EventTypes.INPUT_FOCUSED);
    
    // Nettoyer les gestionnaires
    this.focusManager.cleanup();
    await this.bufferManager.cleanup();
  }
}
