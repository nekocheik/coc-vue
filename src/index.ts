// Point d'entrée de l'extension COC.nvim
import { workspace, ExtensionContext, commands, window, Disposable } from 'coc.nvim';
import { VueRenderer } from './renderer/vue-renderer';
import { NeovimBridge } from './bridge/neovim-bridge';
import { GlobalBufferManager } from './vim/global-buffer-manager';
import { createDirectDemo, DirectBufferDemo } from './vim/direct-buffer-demo';
import { 
  createEnhancedInputDemo, 
  incrementCounterById, 
  nextInputById, 
  prevInputById, 
  editCurrentInputById, 
  confirmInputById, 
  cancelInputById,
  textChangedById,
  cursorMovedById 
} from './vim/enhanced-input-demo';

// Importation de la nouvelle architecture
import { logger, LogLevel } from './core/utils/logger';
import { neovimAdapter } from './core/adapters/neovim-adapter';
import { globalEventBus } from './core/utils/event-bus';

// Importation de la démo de formulaire simple
import {
  createSimpleFormDemo,
  nextFieldById,
  prevFieldById,
  editCurrentFieldById,
  confirmInputById as simpleFormConfirmInputById,
  cancelInputById as simpleFormCancelInputById,
  textChangedById as simpleFormTextChangedById,
  cursorMovedById as simpleFormCursorMovedById
} from './demos/simple-form-demo';

// Importation de la démo de formulaire basique (version ultra-simplifiée)
import {
  createBasicFormDemo,
  nextFieldById as basicNextFieldById,
  prevFieldById as basicPrevFieldById,
  editFieldById as basicEditFieldById,
  confirmInputById as basicConfirmInputById,
  cancelInputById as basicCancelInputById
} from './demos/basic-form-demo';

// Note: Les anciennes démos ont été déplacées dans le dossier 'legacy' pour référence future.

/**
 * Classe principale d'intégration Vue-Neovim
 */
export class VueNeovimIntegration {
  private context: ExtensionContext;
  private renderer: VueRenderer;
  private bridge: NeovimBridge;
  private subscriptions: Disposable[] = [];
  private isInitialized = false;
  private bufferManager: GlobalBufferManager;
  
  constructor(context: ExtensionContext) {
    this.context = context;
    this.bridge = new NeovimBridge();
    // Nous utilisons maintenant workspace.nvim directement
    this.renderer = new VueRenderer(workspace.nvim);
    
    // Initialiser le gestionnaire global de buffers
    this.bufferManager = GlobalBufferManager.getInstance();
    this.subscriptions.push(this.bufferManager);
    
    console.log('[COC-VUE] Gestionnaire global de buffers initialisé');
  }
  
  /**
   * Configurer le renderer Vue
   */
  async setupRenderer() {
    try {
      console.log('[COC-VUE] Configuration du renderer Vue...');
      // Initialisation du renderer - peut être étendu dans le futur
      return true;
    } catch (error) {
      console.error('[COC-VUE] Erreur lors de la configuration du renderer:', error);
      return false;
    }
  }
  
  // Note: Les méthodes de démo réactive ont été déplacées dans legacy
  
  /**
   * Initialiser l'extension
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        return true;
      }
      
      console.log('[COC-VUE] Initialisation...');
      
      // Initialisation du système d'événements
      // L'EventSystem s'attend à avoir un NeovimBridge en paramètre, pas directement nvim
      // Il est déjà initialisé dans le constructeur
      console.log('[BRIDGE] Le système d\'événements est déjà initialisé');
      
      // Configurer le renderer
      await this.setupRenderer();
      
      // On n'a pas besoin des hooks pour notre démo simplifiée
      // Supprimer registerHooks() qui n'existe pas
      
      // Enregistrer les commandes
      this.registerCommands();
      
      // Configurer les écouteurs d'événements
      await this.setupEventListeners();
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('[COC-VUE] Erreur lors de l\'initialisation:', error);
      window.showErrorMessage(`Erreur d'initialisation: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Enregistrer les commandes
   */
  registerCommands() {
    try {
      console.log('[COC-VUE] Enregistrement des commandes');
      
      // Commande pour ouvrir l'application Vue
      this.subscriptions.push(
        commands.registerCommand('vue.openApp', async () => {
          try {
            return await this.openVueApp();
          } catch (error) {
            console.error('[COC-VUE] Erreur lors de l\'ouverture de l\'app:', error);
            window.showErrorMessage(`Erreur lors de l'ouverture de l'app: ${error.message}`);
          }
        })
      );
      
      // Commande pour fermer l'application Vue
      this.subscriptions.push(
        commands.registerCommand('vue.closeApp', async () => {
          try {
            return await this.closeVueApp();
          } catch (error) {
            console.error('[COC-VUE] Erreur lors de la fermeture de l\'app:', error);
            window.showErrorMessage(`Erreur lors de la fermeture de l'app: ${error.message}`);
          }
        })
      );
      
      // Note: Les anciennes commandes de démo ont été supprimées
      
      // Commande pour la démo directe (simplifiée)
      this.subscriptions.push(
        commands.registerCommand('vue.directBufferDemo', async () => {
          try {
            await createDirectDemo();
          } catch (error) {
            console.error('[COC-VUE] Erreur lors du lancement de la démo directe:', error);
            window.showErrorMessage(`Erreur lors du lancement de la démo directe: ${error.message}`);
          }
        })
      );
      
      // Commande pour incrémenter le compteur de la démo directe
      this.subscriptions.push(
        commands.registerCommand('vue.directIncrementCounter', async (instanceId: string) => {
          try {
            DirectBufferDemo.incrementCounterById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors de l\'incrémentation du compteur:', error);
          }
        })
      );
      
      // Commandes pour la démo améliorée avec champs de saisie
      this.subscriptions.push(
        commands.registerCommand('vue.enhancedInputDemo', async () => {
          try {
            await createEnhancedInputDemo();
          } catch (error) {
            console.error('[COC-VUE] Erreur lors du lancement de la démo améliorée:', error);
            window.showErrorMessage(`Erreur lors du lancement de la démo améliorée: ${error.message}`);
          }
        })
      );
      
      // Commandes pour la navigation et l'édition des champs de saisie
      this.subscriptions.push(
        commands.registerCommand('vue.enhancedIncrementCounter', async (instanceId: string) => {
          try {
            incrementCounterById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors de l\'incrémentation du compteur amélioré:', error);
          }
        })
      );
      
      this.subscriptions.push(
        commands.registerCommand('vue.enhancedNextInput', async (instanceId: string) => {
          try {
            nextInputById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors du passage au champ suivant:', error);
          }
        })
      );
      
      this.subscriptions.push(
        commands.registerCommand('vue.enhancedPrevInput', async (instanceId: string) => {
          try {
            prevInputById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors du passage au champ précédent:', error);
          }
        })
      );
      
      this.subscriptions.push(
        commands.registerCommand('vue.enhancedEditCurrentInput', async (instanceId: string) => {
          try {
            editCurrentInputById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors de l\'activation du mode édition:', error);
          }
        })
      );
      
      this.subscriptions.push(
        commands.registerCommand('vue.enhancedConfirmInput', async (instanceId: string) => {
          try {
            confirmInputById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors de la confirmation de l\'entrée:', error);
          }
        })
      );
      
      this.subscriptions.push(
        commands.registerCommand('vue.enhancedCancelInput', async (instanceId: string) => {
          try {
            cancelInputById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors de l\'annulation de l\'entrée:', error);
          }
        })
      );
      
      // Commandes pour la gestion des événements en temps réel
      this.subscriptions.push(
        commands.registerCommand('vue.enhancedTextChanged', async (instanceId: string) => {
          try {
            textChangedById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors du traitement du changement de texte:', error);
          }
        })
      );
      
      this.subscriptions.push(
        commands.registerCommand('vue.enhancedCursorMoved', async (instanceId: string) => {
          try {
            cursorMovedById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors du traitement du mouvement du curseur:', error);
          }
        })
      );
      
      // Commandes pour la nouvelle démo de formulaire simple
      this.subscriptions.push(
        commands.registerCommand('vue.simpleFormDemo', async () => {
          try {
            // Activer la journalisation détaillée pour le développement
            logger.setLogLevel(LogLevel.DEBUG);
            await createSimpleFormDemo();
          } catch (error) {
            console.error('[COC-VUE] Erreur lors du lancement de la démo de formulaire simple:', error);
            window.showErrorMessage(`Erreur lors du lancement de la démo de formulaire simple: ${error.message}`);
          }
        })
      );
      
      // Commande pour la démo de formulaire basique (version ultra-simplifiée)
      this.subscriptions.push(
        commands.registerCommand('vue.basicFormDemo', async () => {
          try {
            await createBasicFormDemo();
          } catch (error) {
            console.error('[COC-VUE] Erreur lors du lancement de la démo de formulaire basique:', error);
            window.showErrorMessage(`Erreur lors du lancement de la démo de formulaire basique: ${error.message}`);
          }
        })
      );
      
      // Commandes pour la navigation et l'édition du formulaire simple
      this.subscriptions.push(
        commands.registerCommand('vue.simpleFormNextField', async (instanceId: string) => {
          try {
            nextFieldById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors du passage au champ suivant:', error);
          }
        })
      );
      
      this.subscriptions.push(
        commands.registerCommand('vue.simpleFormPrevField', async (instanceId: string) => {
          try {
            prevFieldById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors du passage au champ précédent:', error);
          }
        })
      );
      
      this.subscriptions.push(
        commands.registerCommand('vue.simpleFormEditField', async (instanceId: string) => {
          try {
            editCurrentFieldById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors de l\'activation du mode édition:', error);
          }
        })
      );
      
      this.subscriptions.push(
        commands.registerCommand('vue.simpleFormConfirm', async (instanceId: string) => {
          try {
            simpleFormConfirmInputById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors de la confirmation de l\'entrée:', error);
          }
        })
      );
      
      this.subscriptions.push(
        commands.registerCommand('vue.simpleFormCancel', async (instanceId: string) => {
          try {
            simpleFormCancelInputById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors de l\'annulation de l\'entrée:', error);
          }
        })
      );
      
      this.subscriptions.push(
        commands.registerCommand('vue.simpleFormTextChanged', async (instanceId: string) => {
          try {
            simpleFormTextChangedById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors du traitement du changement de texte:', error);
          }
        })
      );
      
      this.subscriptions.push(
        commands.registerCommand('vue.simpleFormCursorMoved', async (instanceId: string) => {
          try {
            simpleFormCursorMovedById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors du traitement du mouvement du curseur:', error);
          }
        })
      );
      
      // Commandes pour la navigation et l'édition du formulaire basique
      this.subscriptions.push(
        commands.registerCommand('vue.basicFormNextField', async (instanceId: string) => {
          try {
            basicNextFieldById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors du passage au champ suivant:', error);
          }
        })
      );
      
      this.subscriptions.push(
        commands.registerCommand('vue.basicFormPrevField', async (instanceId: string) => {
          try {
            basicPrevFieldById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors du passage au champ précédent:', error);
          }
        })
      );
      
      this.subscriptions.push(
        commands.registerCommand('vue.basicFormEditField', async (instanceId: string) => {
          try {
            basicEditFieldById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors de l\'activation du mode édition:', error);
          }
        })
      );
      
      this.subscriptions.push(
        commands.registerCommand('vue.basicFormConfirm', async (instanceId: string) => {
          try {
            basicConfirmInputById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors de la confirmation de l\'entrée:', error);
          }
        })
      );
      
      this.subscriptions.push(
        commands.registerCommand('vue.basicFormCancel', async (instanceId: string) => {
          try {
            basicCancelInputById(instanceId);
          } catch (error) {
            console.error('[COC-VUE] Erreur lors de l\'annulation de l\'entrée:', error);
          }
        })
      );
      
      // Toutes les commandes sont maintenant directement dans this.subscriptions
      console.log('[COC-VUE] Commandes enregistrées');
    } catch (error) {
      console.error('[COC-VUE] Erreur lors de l\'enregistrement des commandes:', error);
      window.showErrorMessage(`Erreur lors de l'enregistrement des commandes: ${error.message}`);
    }
  }
  
  /**
   * Configurer les écouteurs d'événements
   */
  async setupEventListeners() {
    try {
      console.log('[COC-VUE] Configuration des écouteurs d\'événements...');
      
      // Écouter les changements de buffer
      this.subscriptions.push(
        workspace.onDidChangeTextDocument((e: any) => {
          this.bridge.triggerEvent('buffer:change', {
            bufnr: e.bufnr,
            changes: e.changes,
            uri: e.uri
          });
        })
      );
      
      // Note: coc.nvim n'a pas d'API onDidChangeTextEditorSelection, donc nous utilisons
      // une autre approche pour le moment
      console.log('[COC-VUE] Configuration des écouteurs de curseur non disponible dans cette version de coc.nvim');
      
      console.log('[COC-VUE] Écouteurs d\'événements configurés');
      return true;
    } catch (error) {
      console.error('[COC-VUE] Erreur lors de la configuration des écouteurs:', error);
      window.showErrorMessage(`Erreur lors de la configuration des écouteurs: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Ouvrir l'application Vue
   */
  async openVueApp() {
    try {
      console.log('[COC-VUE] Ouverture de l\'application Vue...');
      // Pour notre nouvelle implémentation, nous utilisons directement la démo de test réactive
      return await this.renderReactiveTestDemo();
    } catch (error) {
      console.error('[COC-VUE] Erreur lors de l\'ouverture de l\'application:', error);
      window.showErrorMessage(`Erreur lors de l'ouverture de l'application: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Fermer l'application Vue
   */
  async closeVueApp() {
    // Nous n'avons pas besoin de nettoyer spécifiquement car cela se fera automatiquement
    return 'app-closed';
  }
  
  /**
   * Activer l'extension
   */
  async activate() {
    try {
      console.log('[COC-VUE] Début de l\'activation...');
      
      // Initialiser tous les composants
      const initialized = await this.initialize();
      if (!initialized) {
        return null;
      }
      
      console.log('[COC-VUE] Extension activée avec succès');
      
      // API publique de l'extension
      return {
        renderer: this.renderer,
        openApp: () => this.openVueApp(),
        closeApp: () => this.closeVueApp()
      };
    } catch (error) {
      console.error('[COC-VUE] Erreur lors de l\'activation:', error);
      window.showErrorMessage(`Erreur d'activation: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Désactiver l'extension
   */
  deactivate() {
    // Nettoyer les ressources
    this.renderer.unmountApp();
    
    return true;
  }
}

/**
 * Point d'entrée pour COC.nvim - fonction d'activation principale
 */
export async function activate(context: ExtensionContext): Promise<any> {
  try {
    console.log('[COC-VUE] Démarrage de l\'activation...');
    const integration = new VueNeovimIntegration(context);
    console.log('[COC-VUE] Intégration créée, activation...');
    // Utilisation de await pour s'assurer que l'activation est complète
    const result = await integration.activate();
    
    return result;
  } catch (error) {
    console.error('[COC-VUE] Erreur pendant l\'activation:', error);
    window.showErrorMessage(`Erreur d'activation de coc-vue: ${error.message}`);
    return null;
  }
}

/**
 * Nettoyage lors de la désactivation
 */
export function deactivate(): void {
  // Code de nettoyage
}
