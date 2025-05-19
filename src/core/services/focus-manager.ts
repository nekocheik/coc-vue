/**
 * Gestionnaire de focus pour naviguer entre les éléments interactifs
 * Permet de gérer la navigation par tabulation entre les champs
 */
import { FocusableElement } from '../components/simple-input-field';
import { globalEventBus, EventTypes } from '../utils/event-bus';
import { logger } from '../utils/logger';

/**
 * Gestionnaire de focus
 */
export class FocusManager {
  private focusableElements: FocusableElement[] = [];
  private currentIndex: number = -1;
  
  /**
   * Enregistre un élément focusable
   * @param element Élément à enregistrer
   */
  register(element: FocusableElement): void {
    logger.debug('FocusManager', `Enregistrement de l'élément: ${element.id}`);
    this.focusableElements.push(element);
    
    // Si c'est le premier élément, lui donner le focus
    if (this.focusableElements.length === 1) {
      this.currentIndex = 0;
      element.focus();
    }
  }
  
  /**
   * Supprime un élément focusable
   * @param element Élément à supprimer
   */
  unregister(element: FocusableElement): void {
    const index = this.focusableElements.findIndex(e => e.id === element.id);
    if (index !== -1) {
      logger.debug('FocusManager', `Suppression de l'élément: ${element.id}`);
      this.focusableElements.splice(index, 1);
      
      // Ajuster l'index courant si nécessaire
      if (this.currentIndex >= this.focusableElements.length) {
        this.currentIndex = this.focusableElements.length - 1;
      }
      
      // Donner le focus au nouvel élément courant
      if (this.currentIndex >= 0) {
        this.focusableElements[this.currentIndex].focus();
      }
    }
  }
  
  /**
   * Passe au prochain élément focusable
   */
  next(): void {
    if (this.focusableElements.length === 0) return;
    
    // Enlever le focus de l'élément actuel
    if (this.currentIndex >= 0) {
      this.focusableElements[this.currentIndex].blur();
    }
    
    // Passer au prochain élément
    this.currentIndex = (this.currentIndex + 1) % this.focusableElements.length;
    
    // Donner le focus au nouvel élément
    const newElement = this.focusableElements[this.currentIndex];
    newElement.focus();
    
    logger.info('FocusManager', `Focus déplacé vers: ${newElement.id} (index ${this.currentIndex})`);
  }
  
  /**
   * Passe à l'élément focusable précédent
   */
  previous(): void {
    if (this.focusableElements.length === 0) return;
    
    // Enlever le focus de l'élément actuel
    if (this.currentIndex >= 0) {
      this.focusableElements[this.currentIndex].blur();
    }
    
    // Passer à l'élément précédent
    this.currentIndex = (this.currentIndex - 1 + this.focusableElements.length) % this.focusableElements.length;
    
    // Donner le focus au nouvel élément
    const newElement = this.focusableElements[this.currentIndex];
    newElement.focus();
    
    logger.info('FocusManager', `Focus déplacé vers: ${newElement.id} (index ${this.currentIndex})`);
  }
  
  /**
   * Obtient l'élément actuellement focusé
   * @returns Élément focusé ou null si aucun
   */
  getCurrentElement(): FocusableElement | null {
    if (this.currentIndex < 0) return null;
    return this.focusableElements[this.currentIndex];
  }
  
  /**
   * Donne le focus à un élément spécifique
   * @param id Identifiant de l'élément
   * @returns true si l'élément a été trouvé, false sinon
   */
  focusElement(id: string): boolean {
    const index = this.focusableElements.findIndex(e => e.id === id);
    if (index === -1) return false;
    
    // Enlever le focus de l'élément actuel
    if (this.currentIndex >= 0) {
      this.focusableElements[this.currentIndex].blur();
    }
    
    // Mettre à jour l'index courant
    this.currentIndex = index;
    
    // Donner le focus au nouvel élément
    this.focusableElements[this.currentIndex].focus();
    
    logger.info('FocusManager', `Focus défini sur: ${id} (index ${this.currentIndex})`);
    return true;
  }
  
  /**
   * Obtient tous les éléments focusables
   * @returns Liste des éléments focusables
   */
  getAllElements(): FocusableElement[] {
    return [...this.focusableElements];
  }
  
  /**
   * Nettoie les ressources
   */
  cleanup(): void {
    logger.debug('FocusManager', 'Nettoyage des ressources');
    this.focusableElements = [];
    this.currentIndex = -1;
  }
}
