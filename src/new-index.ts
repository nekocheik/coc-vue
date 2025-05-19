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
 * Gère l'initialisation, les commandes et les événements pour l'extension COC-Vue
 */
export class VueNeovimIntegration {
  private context: ExtensionContext;
  private renderer: VueRenderer;
  private bridge: NeovimBridge;
  private subscriptions: Disposable[] = [];
  private isInitialized = false;
  private bufferManager: GlobalBufferManager;

  /**
   * Initialise l'intégration Vue-Neovim
   * @param context Le contexte d'extension COC
   */
  constructor(context: ExtensionContext) {
    console.log('[COC-VUE] Initialisation de l\'intégration Vue-Neovim');
    this.context = context;
    
    // Initialiser le bridge Neovim pour la communication
    this.bridge = new NeovimBridge();
    console.log('[COC-VUE] Bridge Neovim initialisé');
    
    // Initialiser le renderer Vue avec l'instance nvim de l'espace de travail
    this.renderer = new VueRenderer(workspace.nvim);
    console.log('[COC-VUE] Renderer Vue initialisé');
    
    // Initialiser le gestionnaire global de buffers
    this.bufferManager = GlobalBufferManager.getInstance();
    this.subscriptions.push(this.bufferManager);
    console.log('[COC-VUE] Gestionnaire global de buffers initialisé');
  }
  
  /**
   * Configurer le renderer Vue
   * @returns {Promise<boolean>} true si la configuration a réussi, false sinon
   */
  async setupRenderer(): Promise<boolean> {
    try {
      console.log('[COC-VUE] Configuration du renderer Vue...');
      // Initialisation du renderer - peut être étendu dans le futur
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[COC-VUE] Erreur lors de la configuration du renderer:', errorMessage);
      return false;
    }
  }
  
  /**
   * Configurer les écouteurs d'événements
   * @returns {Promise<boolean>} true si la configuration a réussi, false sinon
   */
  async setupEventListeners(): Promise<boolean> {
    try {
      console.log('[COC-VUE] Configuration des écouteurs d\'\u00e9vénements...');
      
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
      
      console.log('[COC-VUE] Écouteurs d\'\u00e9vénements configurés');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[COC-VUE] Erreur lors de la configuration des écouteurs:', errorMessage);
      window.showErrorMessage(`Erreur lors de la configuration des écouteurs: ${errorMessage}`);
      return false;
    }
  }
  
  /**
   * Ouvre l'application Vue
   * @returns {Promise<any>} Résultat de l'opération d'ouverture
   */
  async openVueApp(): Promise<any> {
    try {
      console.log('[COC-VUE] Ouverture de l\'application Vue...');
      // Pour notre implémentation refactorisée, nous nous concentrons sur le composant Select
      console.log('[COC-VUE] Utilisation de la commande vue.selectDemo pour l\'ouverture');
      await this.registerSelectDemoCommand();
      return 'app-opened';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[COC-VUE] Erreur lors de l\'ouverture de l\'application:', errorMessage);
      window.showErrorMessage(`Erreur lors de l'ouverture de l'application: ${errorMessage}`);
      throw error;
    }
  }
  
  /**
   * Ferme l'application Vue
   * @returns {Promise<string>} Message de confirmation
   */
  async closeVueApp(): Promise<string> {
    // Le nettoyage se fait automatiquement
    console.log('[COC-VUE] Fermeture de l\'application Vue');
    return 'app-closed';
  }
  
  /**
   * Active l'extension
   * @returns {Promise<any>} API publique de l'extension ou null en cas d'échec
   */
  async activate(): Promise<any> {
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[COC-VUE] Erreur lors de l\'activation:', errorMessage);
      window.showErrorMessage(`Erreur d'activation: ${errorMessage}`);
      return null;
    }
  }
  
  /**
   * Initialiser l'extension
   * @returns {Promise<boolean>} true si l'initialisation a réussi, false sinon
   */
  async initialize(): Promise<boolean> {
    try {
      // Vérifier si l'extension est déjà initialisée
      if (this.isInitialized) {
        console.log('[COC-VUE] L\'extension est déjà initialisée');
        return true;
      }
      
      console.log('[COC-VUE] Démarrage de l\'initialisation...');
      
      // Étape 1: Configurer le renderer Vue
      console.log('[COC-VUE] Étape 1/3: Configuration du renderer Vue');
      const rendererSetup = await this.setupRenderer();
      if (!rendererSetup) {
        console.error('[COC-VUE] Échec de la configuration du renderer Vue');
        return false;
      }
      
      // Étape 2: Enregistrer les commandes
      console.log('[COC-VUE] Étape 2/3: Enregistrement des commandes');
      try {
        await this.registerCommands();
        console.log('[COC-VUE] Commandes enregistrées avec succès');
      } catch (error) {
        console.error('[COC-VUE] Échec de l\'enregistrement des commandes:', error);
        return false;
      }
      
      // Étape 3: Configurer les écouteurs d'événements
      console.log('[COC-VUE] Étape 3/3: Configuration des écouteurs d\'événements');
      const listenersSetup = await this.setupEventListeners();
      if (!listenersSetup) {
        console.error('[COC-VUE] Échec de la configuration des écouteurs d\'événements');
        return false;
      }
      
      // Marquer l'extension comme initialisée
      this.isInitialized = true;
      console.log('[COC-VUE] ✅ Initialisation terminée avec succès');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[COC-VUE] ❌ Erreur lors de l\'initialisation:', errorMessage);
      window.showErrorMessage(`Erreur d'initialisation: ${errorMessage}`);
      return false;
    }
  }
  
  /**
   * Enregistrer les commandes de l'extension
   * @returns {Promise<void>}
   */
  async registerCommands(): Promise<void> {
    try {
      console.log('[COC-VUE] Début de l\'enregistrement des commandes');
      
      // Commande principale pour la démo du composant Select
      // Cette commande est prioritaire car c'est le focus principal de notre refactoring
      await this.registerSelectDemoCommand();
      
      // Commandes de base pour l'application Vue
      this.subscriptions.push(
        commands.registerCommand('vue.openApp', async () => {
          try {
            console.log('[COC-VUE] Exécution de la commande vue.openApp');
            return await this.openVueApp();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[COC-VUE] Erreur lors de l\'ouverture de l\'app:', errorMessage);
            window.showErrorMessage(`Erreur lors de l'ouverture de l'app: ${errorMessage}`);
          }
        })
      );
      
      // Commande pour fermer l'application Vue
      this.subscriptions.push(
        commands.registerCommand('vue.closeApp', async () => {
          try {
            console.log('[COC-VUE] Exécution de la commande vue.closeApp');
            return await this.closeVueApp();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[COC-VUE] Erreur lors de la fermeture de l\'app:', errorMessage);
            window.showErrorMessage(`Erreur lors de la fermeture de l'app: ${errorMessage}`);
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
      
      // Autres commandes...
      
      console.log('[COC-VUE] Commandes enregistrées avec succès');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[COC-VUE] Erreur lors de l\'enregistrement des commandes:', errorMessage);
      window.showErrorMessage(`Erreur lors de l'enregistrement des commandes: ${errorMessage}`);
      throw error;
    }
  }
  
  /**
   * Enregistre la commande vue.selectDemo pour lancer le composant Select
   * Cette méthode est séparée pour une meilleure organisation et maintenance
   * @returns {Promise<void>}
   */
  async registerSelectDemoCommand(): Promise<void> {
    console.log('[COC-VUE] Enregistrement de la commande vue.selectDemo');
    
    this.subscriptions.push(
      commands.registerCommand('vue.selectDemo', async () => {
        try {
          console.log('[COC-VUE] Exécution de la commande vue.selectDemo');
          const nvim = workspace.nvim;
          
          // Configuration du composant Select avec des options de démonstration
          const selectId = 'select_demo_' + Date.now(); // ID unique pour éviter les conflits
          const selectTitle = 'Select Component Demo';
          const selectOptions = {
            multi: false,
            width: 40,
            placeholder: 'Choisissez une option...',
            options: [
              { id: 'option1', text: 'Option 1', value: 'value1' },
              { id: 'option2', text: 'Option 2', value: 'value2' },
              { id: 'option3', text: 'Option 3', value: 'value3' },
              { id: 'option4', text: 'Option 4', value: 'value4' },
              { id: 'option5', text: 'Option 5', value: 'value5' }
            ]
          };
          
          // Conversion des options en JSON pour la commande Lua
          const optionsJson = JSON.stringify(selectOptions);
          
          console.log('[COC-VUE] Préparation du lancement du composant Select avec ID:', selectId);
          
          // Utiliser la commande VueUISelect pour créer et ouvrir un composant Select
          const command = `VueUISelect ${selectId} "${selectTitle}" ${optionsJson}`;
          console.log('[COC-VUE] Exécution de la commande Neovim:', command);
          
          await nvim.command(command);
          
          // Vérification que le composant a bien été créé
          console.log('[COC-VUE] Composant Select lancé avec succès');
          
          // Afficher un message de confirmation à l'utilisateur
          window.showInformationMessage('Composant Select lancé avec succès');
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[COC-VUE] Erreur lors du lancement de la démo Select:', errorMessage);
          window.showErrorMessage(`Erreur lors du lancement de la démo Select: ${errorMessage}`);
        }
      })
    );
    
    console.log('[COC-VUE] Commande vue.selectDemo enregistrée');
  }
      
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
 * @param context Le contexte d'extension COC
 * @returns L'API publique de l'extension ou null en cas d'échec
 */
export async function activate(context: ExtensionContext): Promise<any> {
  try {
    console.log('[COC-VUE] ========================================');
    console.log('[COC-VUE] Démarrage de l\'activation de l\'extension');
    console.log('[COC-VUE] ========================================');
    
    // Vérifier la disponibilité des dépendances critiques
    if (!context || !commands || !workspace || !workspace.nvim) {
      throw new Error('Dépendances critiques manquantes pour l\'activation');
    }
    
    console.log('[COC-VUE] Contexte COC disponible ✓');
    console.log('[COC-VUE] Commandes COC disponibles ✓');
    console.log('[COC-VUE] Workspace Neovim disponible ✓');
    
    // Créer l'intégration Vue-Neovim
    const integration = new VueNeovimIntegration(context);
    console.log('[COC-VUE] Intégration Vue-Neovim créée ✓');
    
    // Activer l'intégration (initialisation, enregistrement des commandes, etc.)
    console.log('[COC-VUE] Activation de l\'intégration...');
    const result = await integration.activate();
    
    if (!result) {
      throw new Error('L\'activation de l\'intégration a échoué');
    }
    
    console.log('[COC-VUE] Intégration activée avec succès ✓');
    
    // Vérifier que la commande vue.selectDemo est bien enregistrée
    const selectDemoCommand = context.subscriptions.find(sub => {
      return sub && typeof sub === 'object' && 'id' in sub && sub.id === 'vue.selectDemo';
    });
    
    if (selectDemoCommand) {
      console.log('[COC-VUE] Commande vue.selectDemo enregistrée avec succès ✓');
      console.log('[COC-VUE] Pour tester: :CocCommand vue.selectDemo');
    } else {
      console.warn('[COC-VUE] Attention: La commande vue.selectDemo n\'a pas été trouvée dans les subscriptions!');
    }
    
    console.log('[COC-VUE] ========================================');
    console.log('[COC-VUE] Activation terminée avec succès');
    console.log('[COC-VUE] ========================================');
    
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[COC-VUE] ❌ Erreur pendant l\'activation:', errorMessage);
    window.showErrorMessage(`Erreur d'activation de coc-vue: ${errorMessage}`);
    return null;
  }
}

/**
 * Nettoyage lors de la désactivation
 */
export function deactivate(): void {
  // Code de nettoyage
}
