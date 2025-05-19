/**
 * Champ de saisie simple sans dépendance à l'UI complexe
 * Implémente un champ de saisie basique avec gestion du focus et du curseur
 */
import { globalEventBus, EventTypes } from '../utils/event-bus';
import { logger } from '../utils/logger';

/**
 * Interface pour les éléments focusables
 */
export interface FocusableElement {
  id: string;
  focus(): void;
  blur(): void;
  isFocused(): boolean;
}

/**
 * Champ de saisie simple
 */
export class SimpleInputField implements FocusableElement {
  private value: string = '';
  private cursorPos: number = 0;
  private focused: boolean = false;
  private onChange: (value: string) => void;
  private onFocus: () => void;
  private onBlur: () => void;
  
  /**
   * Crée un nouveau champ de saisie
   * @param id Identifiant unique du champ
   * @param label Libellé du champ
   * @param initialValue Valeur initiale
   * @param placeholder Texte d'aide quand le champ est vide
   * @param onChange Fonction appelée quand la valeur change
   * @param onFocus Fonction appelée quand le champ reçoit le focus
   * @param onBlur Fonction appelée quand le champ perd le focus
   */
  constructor(
    public id: string,
    public label: string,
    initialValue: string = '',
    private placeholder: string = '',
    onChange?: (value: string) => void,
    onFocus?: () => void,
    onBlur?: () => void
  ) {
    this.value = initialValue;
    this.onChange = onChange || (() => {});
    this.onFocus = onFocus || (() => {});
    this.onBlur = onBlur || (() => {});
    
    logger.debug('SimpleInputField', `Champ créé: ${id}, label: ${label}, valeur: ${initialValue}`);
  }
  
  /**
   * Définit la valeur du champ
   * @param value Nouvelle valeur
   * @param silent Si true, n'émet pas d'événement de changement
   */
  setValue(value: string, silent: boolean = false): void {
    if (this.value === value) return;
    
    const oldValue = this.value;
    this.value = value;
    
    // Ajuster la position du curseur si nécessaire
    if (this.cursorPos > this.value.length) {
      this.cursorPos = this.value.length;
    }
    
    logger.debug('SimpleInputField', `Valeur de ${this.id} changée: "${oldValue}" -> "${value}"`);
    
    if (!silent) {
      // Appeler le callback
      this.onChange(value);
      
      // Émettre un événement de changement
      globalEventBus.emit(EventTypes.INPUT_CHANGED, {
        id: this.id,
        oldValue,
        newValue: value
      });
    }
  }
  
  /**
   * Obtient la valeur du champ
   * @returns Valeur actuelle
   */
  getValue(): string {
    return this.value;
  }
  
  /**
   * Définit la position du curseur
   * @param pos Nouvelle position
   */
  setCursorPosition(pos: number): void {
    this.cursorPos = Math.max(0, Math.min(pos, this.value.length));
    logger.debug('SimpleInputField', `Position du curseur dans ${this.id}: ${this.cursorPos}`);
  }
  
  /**
   * Obtient la position du curseur
   * @returns Position actuelle
   */
  getCursorPosition(): number {
    return this.cursorPos;
  }
  
  /**
   * Donne le focus au champ
   */
  focus(): void {
    if (this.focused) return;
    
    this.focused = true;
    logger.debug('SimpleInputField', `Focus sur ${this.id}`);
    
    // Appeler le callback
    this.onFocus();
    
    // Émettre un événement de focus
    globalEventBus.emit(EventTypes.INPUT_FOCUSED, {
      id: this.id,
      focused: true
    });
  }
  
  /**
   * Retire le focus du champ
   */
  blur(): void {
    if (!this.focused) return;
    
    this.focused = false;
    logger.debug('SimpleInputField', `${this.id} a perdu le focus`);
    
    // Appeler le callback
    this.onBlur();
    
    // Émettre un événement de perte de focus
    globalEventBus.emit(EventTypes.INPUT_FOCUSED, {
      id: this.id,
      focused: false
    });
  }
  
  /**
   * Vérifie si le champ a le focus
   * @returns true si le champ a le focus, false sinon
   */
  isFocused(): boolean {
    return this.focused;
  }
  
  /**
   * Obtient le placeholder
   * @returns Texte d'aide
   */
  getPlaceholder(): string {
    return this.placeholder;
  }
  
  /**
   * Définit le placeholder
   * @param placeholder Nouveau texte d'aide
   */
  setPlaceholder(placeholder: string): void {
    this.placeholder = placeholder;
  }
  
  /**
   * Génère une représentation textuelle simple du champ
   * @returns Texte représentant le champ
   */
  render(): string {
    if (this.value === '' && this.placeholder) {
      return `${this.label}: [${this.placeholder}]`;
    }
    
    if (this.focused) {
      // Simuler un curseur dans la représentation textuelle
      const beforeCursor = this.value.substring(0, this.cursorPos);
      const afterCursor = this.value.substring(this.cursorPos);
      return `${this.label}: [${beforeCursor}|${afterCursor}]`;
    }
    
    return `${this.label}: [${this.value}]`;
  }
  
  /**
   * Gère un événement clavier
   * @param key Touche pressée
   * @returns true si l'événement a été traité, false sinon
   */
  handleKeyEvent(key: string): boolean {
    if (!this.focused) return false;
    
    // Gérer les touches spéciales
    switch (key) {
      case 'Backspace':
        if (this.cursorPos > 0) {
          const newValue = this.value.substring(0, this.cursorPos - 1) + this.value.substring(this.cursorPos);
          this.setValue(newValue);
          this.cursorPos--;
        }
        return true;
        
      case 'Delete':
        if (this.cursorPos < this.value.length) {
          const newValue = this.value.substring(0, this.cursorPos) + this.value.substring(this.cursorPos + 1);
          this.setValue(newValue);
        }
        return true;
        
      case 'ArrowLeft':
        if (this.cursorPos > 0) {
          this.cursorPos--;
        }
        return true;
        
      case 'ArrowRight':
        if (this.cursorPos < this.value.length) {
          this.cursorPos++;
        }
        return true;
        
      case 'Home':
        this.cursorPos = 0;
        return true;
        
      case 'End':
        this.cursorPos = this.value.length;
        return true;
        
      default:
        // Insérer le caractère si c'est un caractère imprimable
        if (key.length === 1) {
          const newValue = this.value.substring(0, this.cursorPos) + key + this.value.substring(this.cursorPos);
          this.setValue(newValue);
          this.cursorPos++;
          return true;
        }
        return false;
    }
  }
}
