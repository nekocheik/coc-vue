/**
 * Démo de formulaire simple
 * Exemple d'utilisation de la nouvelle architecture
 */
import { SimpleFormController } from '../core/controllers/form-controller';
import { SimpleInputField } from '../core/components/simple-input-field';
import { logger } from '../core/utils/logger';

// Registre des instances actives
const instances: SimpleFormDemo[] = [];

/**
 * Classe de démo de formulaire simple
 */
export class SimpleFormDemo {
  private controller: SimpleFormController;
  public readonly instanceId: string;
  private bufnr: number = -1;
  
  /**
   * Crée une nouvelle instance de démo
   */
  constructor() {
    this.instanceId = Math.random().toString(36).substring(2, 8);
    this.controller = new SimpleFormController(`Formulaire de Démo (${this.instanceId})`);
    
    logger.info('SimpleFormDemo', `Instance créée: ${this.instanceId}`);
    
    // Initialiser les champs
    this.initializeFields();
  }
  
  /**
   * Initialise les champs du formulaire
   */
  private initializeFields(): void {
    // Champ Nom
    const nameField = new SimpleInputField(
      'name',
      'Nom',
      '',
      'Entrez votre nom',
      (value) => {
        logger.info('SimpleFormDemo', `Nom changé: ${value}`);
      }
    );
    
    // Champ Email
    const emailField = new SimpleInputField(
      'email',
      'Email',
      '',
      'Entrez votre email',
      (value) => {
        logger.info('SimpleFormDemo', `Email changé: ${value}`);
      }
    );
    
    // Champ Message
    const messageField = new SimpleInputField(
      'message',
      'Message',
      '',
      'Entrez votre message',
      (value) => {
        logger.info('SimpleFormDemo', `Message changé: ${value}`);
      }
    );
    
    // Ajouter les champs au contrôleur
    this.controller.addField(nameField);
    this.controller.addField(emailField);
    this.controller.addField(messageField);
  }
  
  /**
   * Monte la démo dans un buffer
   */
  async mount(): Promise<void> {
    try {
      await this.controller.mount(`Formulaire Simple (${this.instanceId})`);
      logger.info('SimpleFormDemo', `Démo montée: ${this.instanceId}`);
    } catch (error) {
      logger.error('SimpleFormDemo', `Erreur lors du montage:`, error);
    }
  }
  
  /**
   * Passe au champ suivant
   */
  async nextField(): Promise<void> {
    await this.controller.nextField();
  }
  
  /**
   * Passe au champ précédent
   */
  async prevField(): Promise<void> {
    await this.controller.prevField();
  }
  
  /**
   * Entre en mode édition pour le champ actuel
   */
  async editCurrentField(): Promise<void> {
    await this.controller.editCurrentField();
  }
  
  /**
   * Confirme l'édition du champ actuel
   */
  async confirmInput(): Promise<void> {
    await this.controller.confirmInput();
  }
  
  /**
   * Annule l'édition du champ actuel
   */
  async cancelInput(): Promise<void> {
    await this.controller.cancelInput();
  }
  
  /**
   * Gère les changements de texte
   */
  async handleTextChanged(): Promise<void> {
    await this.controller.handleTextChanged();
  }
  
  /**
   * Gère les mouvements du curseur
   */
  async handleCursorMoved(): Promise<void> {
    await this.controller.handleCursorMoved();
  }
  
  /**
   * Obtient l'ID d'instance
   */
  getInstanceId(): string {
    return this.instanceId;
  }
  
  /**
   * Définit le numéro de buffer
   * @param bufnr Numéro du buffer
   */
  setBufferNumber(bufnr: number): void {
    this.bufnr = bufnr;
  }
  
  /**
   * Obtient le numéro de buffer
   * @returns Numéro du buffer
   */
  getBufferNumber(): number {
    return this.bufnr;
  }
  
  /**
   * Nettoie les ressources
   */
  async cleanup(): Promise<void> {
    // Si nous avons un buffer, essayons de le fermer
    if (this.bufnr > 0) {
      try {
        const { workspace } = require('coc.nvim');
        const nvim = workspace.nvim;
        const exists = await nvim.eval(`bufexists(${this.bufnr})`) as number;
        
        if (exists) {
          await nvim.command(`bdelete! ${this.bufnr}`);
        }
      } catch (error) {
        logger.error('SimpleFormDemo', `Erreur lors de la fermeture du buffer:`, error);
      }
    }
    
    await this.controller.cleanup();
    
    // Supprimer cette instance du registre
    const index = instances.findIndex(instance => instance === this);
    if (index !== -1) {
      instances.splice(index, 1);
    }
    
    logger.info('SimpleFormDemo', `Instance nettoyée: ${this.instanceId}`);
  }
}

/**
 * Crée et monte une nouvelle instance de démo
 * Version simplifiée qui utilise directement les commandes Vim
 */
export async function createSimpleFormDemo(): Promise<void> {
  try {
    // Nettoyer les instances précédentes
    for (const instance of [...instances]) {
      await instance.cleanup();
    }
    instances.length = 0;
    
    // Créer une nouvelle instance
    const demo = new SimpleFormDemo();
    instances.push(demo);
    
    // Créer un buffer directement avec des commandes Vim
    const { workspace } = require('coc.nvim');
    const nvim = workspace.nvim;
    
    // Créer un nouveau buffer
    await nvim.command('new');
    await nvim.command('setlocal buftype=nofile');
    await nvim.command('setlocal noswapfile');
    await nvim.command(`file Formulaire Simple (${demo.instanceId})`);
    
    // Récupérer le numéro du buffer
    const bufnr = await nvim.eval('bufnr("%")') as number;
    
    // Rendre le buffer modifiable
    await nvim.command('setlocal modifiable');
    
    // Ajouter le contenu du formulaire
    const lines = [
      `Formulaire de Démo (${demo.instanceId})`,
      '---------------------------',
      '',
      'Nom: [Entrez votre nom]',
      'Email: [Entrez votre email]',
      'Message: [Entrez votre message]',
      '',
      `Heure actuelle: ${new Date().toLocaleTimeString()}`,
      '',
      'Navigation: Tab/Shift+Tab | Éditer: i | Valider: Entrée | Annuler: Échap'
    ];
    
    // Effacer le contenu existant
    await nvim.command('%delete _');
    
    // Ajouter les lignes une par une pour éviter les problèmes d'encodage
    for (const line of lines) {
      await nvim.command(`call append('$', '${line.replace(/'/g, "''")}')`); 
    }
    
    // Supprimer la première ligne vide
    await nvim.command('1delete _');
    
    // Configurer les mappages clavier
    await nvim.command(`nnoremap <buffer> <Tab> :CocCommand vue.simpleFormNextField ${demo.instanceId}<CR>`);
    await nvim.command(`nnoremap <buffer> <S-Tab> :CocCommand vue.simpleFormPrevField ${demo.instanceId}<CR>`);
    await nvim.command(`nnoremap <buffer> i :CocCommand vue.simpleFormEditField ${demo.instanceId}<CR>`);
    await nvim.command(`nnoremap <buffer> a :CocCommand vue.simpleFormEditField ${demo.instanceId}<CR>`);
    
    // Configurer les mappages pour le mode insertion
    await nvim.command(`inoremap <buffer> <CR> <Esc>:CocCommand vue.simpleFormConfirm ${demo.instanceId}<CR>`);
    await nvim.command(`inoremap <buffer> <Esc> <Esc>:CocCommand vue.simpleFormCancel ${demo.instanceId}<CR>`);
    await nvim.command(`inoremap <buffer> <Tab> <Esc>:CocCommand vue.simpleFormNextField ${demo.instanceId}<CR>`);
    await nvim.command(`inoremap <buffer> <S-Tab> <Esc>:CocCommand vue.simpleFormPrevField ${demo.instanceId}<CR>`);
    
    // Configurer les autocommandes
    await nvim.command(`autocmd TextChangedI <buffer=${bufnr}> call timer_start(10, { -> execute('CocCommand vue.simpleFormTextChanged ${demo.instanceId}') })`);
    await nvim.command(`autocmd CursorMovedI <buffer=${bufnr}> call timer_start(10, { -> execute('CocCommand vue.simpleFormCursorMoved ${demo.instanceId}') })`);
    
    // Positionner le curseur au début du formulaire
    await nvim.command('normal! gg');
    
    // Marquer le buffer comme monté
    demo.setBufferNumber(bufnr);
    
    logger.info('SimpleFormDemo', `Nouvelle démo créée et montée`);
  } catch (error) {
    logger.error('SimpleFormDemo', `Erreur lors de la création:`, error);
  }
}

/**
 * Recherche une instance par son ID
 * @param instanceId ID de l'instance
 * @returns Instance trouvée ou null
 */
export function findInstanceById(instanceId: string): SimpleFormDemo | null {
  for (const instance of instances) {
    if (instance.getInstanceId() === instanceId) {
      return instance;
    }
  }
  return null;
}

/**
 * Fonctions d'action pour les commandes COC
 */
export function nextFieldById(instanceId: string): void {
  const instance = findInstanceById(instanceId);
  if (instance) {
    instance.nextField();
  }
}

export function prevFieldById(instanceId: string): void {
  const instance = findInstanceById(instanceId);
  if (instance) {
    instance.prevField();
  }
}

export function editCurrentFieldById(instanceId: string): void {
  const instance = findInstanceById(instanceId);
  if (instance) {
    instance.editCurrentField();
  }
}

export function confirmInputById(instanceId: string): void {
  const instance = findInstanceById(instanceId);
  if (instance) {
    instance.confirmInput();
  }
}

export function cancelInputById(instanceId: string): void {
  const instance = findInstanceById(instanceId);
  if (instance) {
    instance.cancelInput();
  }
}

export function textChangedById(instanceId: string): void {
  const instance = findInstanceById(instanceId);
  if (instance) {
    instance.handleTextChanged();
  }
}

export function cursorMovedById(instanceId: string): void {
  const instance = findInstanceById(instanceId);
  if (instance) {
    instance.handleCursorMoved();
  }
}
