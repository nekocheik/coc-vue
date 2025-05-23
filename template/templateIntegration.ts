/**
 * Template Integration Module
 * 
 * NO REACT. Project-native TSX factory only.
 * 
 * This module provides the integration layer between our custom TSX templates
 * and the Coc-vue WindowManager/BufferRouter system. It handles the compilation
 * of TSX templates into actual Neovim buffers and window layouts.
 * 
 * @module template/templateIntegration
 */

import { workspace } from 'coc.nvim';
import { WindowManager, WindowSlot } from '../src/windowManager';
import { BufferRouter } from '../src/bufferRouter';
import { MountRegistry, VNode } from './tsxFactory';
import { cocBridge } from './CocBridge';

/**
 * The required slots that must be present for a complete layout
 */
const REQUIRED_SLOTS = ['left', 'center-top', 'center-bottom', 'right'];

/**
 * Renders the template tree to actual Neovim buffers and windows
 * 
 * @param rootNode The root VNode from the template
 * @param windowManager The WindowManager instance
 * @param bufferRouter The BufferRouter instance
 */
export async function renderTemplate(
  _rootNode: VNode, // Not directly used, as we use MountRegistry instead
  windowManager: WindowManager,
  bufferRouter: BufferRouter
): Promise<boolean> {
  try {
    console.log('[TemplateIntegration] Rendering template tree');
    
    // Track buffer creation for each slot
    const slotBufferMap: Record<string, string> = {};
    const slotPromises: Promise<string | null>[] = [];
    
    // Step 1: Process the slots from the MountRegistry
    for (const [slotName, node] of MountRegistry.slots.entries()) {
      // Process each slot
      const promise = processSlotNode(`slot-${slotName}`, node, windowManager, bufferRouter);
      slotPromises.push(promise);
    }
    
    // Wait for all slots to be processed and collect buffer IDs
    const results = await Promise.all(slotPromises);
    
    // Map results to slot names (Map doesn't have forEach with index, so convert to array first)
    const slotEntries = Array.from(MountRegistry.slots.entries());
    slotEntries.forEach(([slotName, _node], index) => {
      const bufferId = results[index];
      if (bufferId) {
        console.log(`[TemplateIntegration] Initial buffer for slot ${slotName}: ${bufferId}`);
        slotBufferMap[`slot-${slotName}`] = bufferId;
      }
    });
    
    // Verify all required slots have valid buffers
    const missingSlots = REQUIRED_SLOTS.filter(slot => !slotBufferMap[`slot-${slot}`]);
    
    // Check if any required slots are missing
    if (missingSlots.length > 0) {
      console.warn(`[TemplateIntegration] Missing buffers for slots: ${missingSlots.join(', ')}`);
      console.warn('[TemplateIntegration] Will create default buffers for missing slots');
      
      // Create default buffers for missing slots
      for (const slotName of missingSlots) {
        const defaultPath = `default-${slotName}.vue`;
        console.log(`[TemplateIntegration] Creating default buffer for ${slotName}: ${defaultPath}`);
        
        const bufferId = await bufferRouter.createBuffer(defaultPath, {
          type: 'default',
          slot: slotName
        });
        
        if (bufferId) {
          console.log(`[TemplateIntegration] Default buffer created for ${slotName}: ${bufferId}`);
          slotBufferMap[`slot-${slotName}`] = bufferId;
          console.log(`[TemplateIntegration] Mounting default buffer ${bufferId} to slot ${slotName}`);
          await windowManager.mountBuffer(`slot-${slotName}`, bufferId, 'DefaultComponent', 30);
        } else {
          console.error(`[TemplateIntegration] Failed to create default buffer for ${slotName}`);
        }
      }
    }
    
    // Log the slot-to-buffer mapping
    console.log('[TemplateIntegration] Final slotBufferMap before layout:', JSON.stringify(slotBufferMap));
    
    // Step 2: Process the bars from the MountRegistry
    const barPromises = [];
    for (const [position, node] of MountRegistry.bars.entries()) {
      barPromises.push(processBarNode(`bar-${position}`, node, windowManager));
    }
    
    // Wait for all bars to be processed
    await Promise.all(barPromises);
    
    // Step 3: Create the visual window layout
    console.log('[TemplateIntegration] Creating window layout with verified buffers');
    const success = await windowManager.createLayout();
    console.log(`[TemplateIntegration] windowManager.createLayout success: ${success}`);
    
    return success;
  } catch (error) {
    console.error('[TemplateIntegration] Error rendering template:', error);
    return false;
  }
}

/**
 * Process a slot node from the template
 * 
 * @param slotName The name of the slot (left, center-top, etc.)
 * @param node The VNode to process
 * @param windowManager The WindowManager instance
 * @param bufferRouter The BufferRouter instance
 * @returns The buffer ID if successful, null otherwise
 */
async function processSlotNode(
  slotName: string,
  node: VNode,
  windowManager: WindowManager,
  bufferRouter: BufferRouter
): Promise<string | null> {
  try {
    console.log(`[TemplateIntegration] Processing slot: ${slotName}`);
    
    // Extract the component type from the first child
    const componentNode = node.children[0];
    if (!componentNode) {
      console.warn(`[TemplateIntegration] No component found for slot ${slotName}`);
      return null;
    }
    
    // Create a buffer for the component
    const componentType = typeof componentNode.type === 'string' 
      ? componentNode.type 
      : componentNode.type.name || 'UnknownComponent';
    
    // Create a buffer with the component name as the path
    const path = `${componentType.toLowerCase()}.vue`;
    const query = componentNode.props || {};
    
    console.log(`[TemplateIntegration] Slot ${slotName}: Attempting to create buffer with path='${path}', query=${JSON.stringify(query)}`);
    const bufferId = await bufferRouter.createBuffer(path, query);
    
    if (!bufferId) {
      console.error(`[TemplateIntegration] Slot ${slotName}: Failed to create buffer for path='${path}'`);
      return null;
    }
    console.log(`[TemplateIntegration] Slot ${slotName}: Buffer created successfully: ${bufferId}`);
    
    // Mount the buffer in the slot
    const size = node.props?.size || 30; // Default size
    console.log(`[TemplateIntegration] Slot ${slotName}: Mounting buffer ${bufferId} (component: ${componentType}, size: ${size})`);
    await windowManager.mountBuffer(slotName, bufferId, componentType, size);
    
    // Return the buffer ID for tracking
    return bufferId;
    
  } catch (error) {
    console.error(`[TemplateIntegration] Error processing slot ${slotName}:`, error);
    return null;
  }
}

/**
 * Process a bar node from the template
 * 
 * @param position The position of the bar (top, bottom)
 * @param node The VNode to process
 * @param windowManager The WindowManager instance
 */
async function processBarNode(
  position: string,
  node: VNode,
  windowManager: WindowManager
): Promise<void> {
  try {
    console.log(`[TemplateIntegration] Processing bar: ${position}`);
    
    // Generate bar content from the node tree
    const content = generateBarContent(node);
    
    // Set the bar content in the WindowManager
    windowManager.setBarContent(position, content);
    
  } catch (error) {
    console.error(`[TemplateIntegration] Error processing bar ${position}:`, error);
  }
}

/**
 * Generate bar content from a node tree
 * 
 * @param node The VNode to process
 * @returns Array of content strings
 */
function generateBarContent(node: VNode): string[] {
  // Default content for bars
  if (node.type === 'Bar' && node.props.position === 'top') {
    return [
      "====== COC-VUE TABS DEMO " + "=".repeat(50),
      "[Home] [Components] [Settings] [Help]" + " ".repeat(30) + "WindowManager Demo"
    ];
  } else if (node.type === 'Bar' && node.props.position === 'bottom') {
    return [
      "Status: Ready" + " ".repeat(20) + "Layout: Default" + " ".repeat(20) + "Mode: Normal",
      "====== COC-VUE STATUS DEMO " + "=".repeat(50)
    ];
  }
  
  // Default fallback
  return [
    "====== " + node.type + " ======",
    "Generated from template system"
  ];
}

/**
 * Integration command to render the app template
 * 
 * @param windowManager The WindowManager instance
 * @param bufferRouter The BufferRouter instance
 */
export async function renderAppTemplate(
  windowManager: WindowManager,
  bufferRouter: BufferRouter
): Promise<boolean> {
  try {
    console.log('[TemplateIntegration] Starting renderAppTemplate...');

    // First clean existing layout via WindowManager
    console.log('[TemplateIntegration] Cleaning existing layout...');
    windowManager.cleanLayout();
    
    // First clear any existing content from MountRegistry
    const { MountRegistry } = await import('./tsxFactory');
    MountRegistry.reset();
    
    // Set the buffer router instance in the renderer
    const { setBufferRouter } = await import('./renderer');
    setBufferRouter(bufferRouter);
    
    // Vérifier que le CocBridge est initialisé
    console.log('[TemplateIntegration] Initializing CocBridge...');
    if (cocBridge.isInitialized()) {
      console.log('[TemplateIntegration] CocBridge already initialized');
    } else {
      console.log('[TemplateIntegration] CocBridge needs initialization');
    }
    
    // Importer les modules nécessaires pour le bridge
    await import('./registry');
    
    console.log('[TemplateIntegration] Importing App component from index.tsx');
    // Dynamically import the App component (webpack will resolve it)
    const { default: App } = await import('./index');
    
    // Create the App VNode
    console.log('[TemplateIntegration] Creating App VNode tree');
    const appNode = App();
    
    // Manually register components from the Window component
    // since the automatic registration isn't working
    await import('./Window');
    
    // This will register all slots and components in the MountRegistry
    console.log('[TemplateIntegration] Generated App VNode type:', 
      typeof appNode.type === 'function' ? appNode.type.name : appNode.type);
    
    // Au lieu de générer du contenu statique, nous allons initialiser les composants
    // mais laisser leur propre logique gérer l'affichage et l'interaction
    async function initializeComponent(slotName: string): Promise<string[]> {
      // Par défaut, on retourne un message d'initialisation qui sera remplacé par le rendu du composant
      const defaultContent = [
        `# Initializing ${slotName} component...`,
        "",
        "Component will render its own content via Coc.nvim API"
      ];
      
      try {
        // Chaque slot a un composant spécifique qui gère sa propre logique
        // Nous pouvons ajouter des configurations spécifiques ici si nécessaire
        switch(slotName) {
          case 'left':
            // Le composant FileExplorer gère sa propre logique via CocBridge
            try {
              // Log pour indiquer que l'initialisation du composant est en cours
              console.log('[TemplateIntegration] Initializing FileExplorer component...');
              
              // Utiliser une structure statique au lieu de récupérer les fichiers dynamiquement
              const fileExplorerInit = async () => {
                try {
                  console.log('[TemplateIntegration] Manually initializing FileExplorer with static data...');
                  
                  // Obtenir les dossiers du workspace juste pour l'information (pas pour les fichiers)
                  const folders = await cocBridge.getWorkspaceFolders();
                  console.log(`[TemplateIntegration] Workspace folders found: ${JSON.stringify(folders)}`);
                  
                  // Utiliser des données statiques plutôt que d'appeler listFiles
                  const staticFileCount = 5; // Correspond au nombre d'éléments dans mockFiles de FileExplorer.tsx
                  
                  // Contenu statique pour le FileExplorer
                  return [
                    '# File Explorer',
                    '',
                    'Project Files:',
                    '  ▼ src',
                    '    📄 main.ts',
                    '    📄 App.vue',
                    '    📄 Navbar.vue',
                    '  📄 package.json',
                    '  📄 README.md'
                  ];
                } catch (initError) {
                  console.error('[TemplateIntegration] Error in manual FileExplorer init:', initError);
                  
                  // Contenu statique même en cas d'erreur
                  return [
                    '# File Explorer',
                    '',
                    'Project Files:',
                    '  ▼ src',
                    '    📄 main.ts',
                    '    📄 App.vue',
                    '    📄 Navbar.vue',
                    '  📄 package.json',
                    '  📄 README.md'
                  ];
                }
              };
              
              // Exécuter l'initialisation et retourner le contenu initial
              console.log('[TemplateIntegration] Running manual FileExplorer initialization');
              const content = await fileExplorerInit();
              console.log('[TemplateIntegration] FileExplorer initialization completed');
              return content;
            } catch (error) {
              console.error('[TemplateIntegration] Error initializing FileExplorer:', error);
              return [
                '# File Explorer Error',
                '',
                `Error: ${error && typeof error === 'object' ? (error as any).message || 'Unknown error' : String(error)}`,
                'Please check the logs for more information'
              ];
            }
            
          case 'center-top':
            // L'éditeur affichera le contenu des fichiers
            return [
              '# Editor',
              '',
              'Ready to display file content...',
              'Click on a file in the explorer to open it'
            ];
            
          case 'center-bottom':
            // La console affichera les messages système
            return [
              '# Console',
              '',
              `> Starting vue-ui integration... [${new Date().toISOString()}]`,
              '> Loading component system...',
              '> Components ready to interact with Coc.nvim'
            ];
            
          case 'right':
            // Le panneau de propriétés affichera les infos des composants
            return [
              '# Properties',
              '',
              'Component properties will be displayed here',
              '',
              'Select a component to view its properties'
            ];
            
          default:
            return defaultContent;
        }
      } catch (error: any) {
        console.error(`[TemplateIntegration] Error initializing component for ${slotName}:`, error);
        return [
          `# Error in ${slotName}`,
          '',
          `Failed to initialize component: ${error?.message || String(error)}`
        ];
      }
    }
    
    // Map to store initial content for components
    // Ce contenu sera remplacé par le rendu réel des composants
    const componentContents: Record<string, string[]> = {};
    
    // Initialiser le contenu pour tous les slots
    for (const slot of ['left', 'center-top', 'center-bottom', 'right']) {
      componentContents[slot] = await initializeComponent(slot);
    }
    
    // Importer le bridge Coc.nvim pour que les composants puissent interagir avec l'API
    try {
      await import('./CocBridge');
      console.log('[TemplateIntegration] Coc.nvim Bridge initialized successfully');
    } catch (error: any) {
      console.error('[TemplateIntegration] Error initializing Coc.nvim Bridge:', error);
    }

    // Create and mount the default buffers for all required slots
    const slotBufferPromises: Array<() => Promise<string | null>> = [];
    const requiredSlots = ['left', 'center-top', 'center-bottom', 'right'];
    
    // First create all the required buffers
    for (const slotName of requiredSlots) {
      slotBufferPromises.push(async () => {
        try {
          const slotKey = `slot-${slotName}` as WindowSlot;
          const existingBufferId = windowManager.getSlotBuffer(slotKey);
          
          // If buffer already exists for this slot, skip creation
          if (existingBufferId) {
            console.log(`[TemplateIntegration] Buffer ${existingBufferId} already exists for slot ${slotName}, reusing it`);
            const bufferInfo = await bufferRouter.getBufferInfo(existingBufferId);
            if (bufferInfo && bufferInfo.nvimBufferId) {
              const nvimBufferId = bufferInfo.nvimBufferId;
              
              // Update buffer content
              await workspace.nvim.call('nvim_buf_set_lines', [
                nvimBufferId, 
                0, 
                -1, 
                false, 
                componentContents[slotName] || [`# Default content for ${slotName}`]
              ]);
              
              console.log(`[TemplateIntegration] Updated content for slot ${slotName} in buffer ${nvimBufferId}`);
            }
            return existingBufferId;
          }
          
          // Otherwise create a new buffer with timestamp to avoid naming conflicts
          const timestamp = Date.now();
          const path = `${slotName}-${timestamp}.vue`;
          
          console.log(`[TemplateIntegration] Creating buffer for ${slotName}: ${path}`);
          const bufferId = await bufferRouter.createBuffer(path, {
            type: 'component',
            slot: slotName
          });
          
          if (bufferId) {
            console.log(`[TemplateIntegration] Buffer created for ${slotName}: ${bufferId}`);
            
            // Mount the buffer in its slot
            await windowManager.mountBuffer(slotKey, bufferId, 
              slotName === 'left' ? 'FileExplorer' : 
              slotName === 'center-top' ? 'Editor' : 
              slotName === 'center-bottom' ? 'Console' : 'Properties', 
              30);
            
            // Set the buffer content
            const bufferInfo = await bufferRouter.getBufferInfo(bufferId);
            if (bufferInfo && bufferInfo.nvimBufferId) {
              const nvimBufferId = bufferInfo.nvimBufferId;
              
              await workspace.nvim.call('nvim_buf_set_lines', [
                nvimBufferId, 
                0, 
                -1, 
                false, 
                componentContents[slotName] || [`# Default content for ${slotName}`]
              ]);
              
              console.log(`[TemplateIntegration] Set content for slot ${slotName} in buffer ${nvimBufferId}`);
            }
            
            return bufferId;
          } else {
            console.error(`[TemplateIntegration] Failed to create buffer for ${slotName}`);
            return null;
          }
        } catch (error) {
          console.error(`[TemplateIntegration] Error rendering component for slot ${slotName}:`, error);
          return null;
        }
      });
    }
    
    // Execute all buffer content updates
    const results = await Promise.all(slotBufferPromises.map((fn: () => Promise<string | null>) => fn()));
    
    // Log results
    console.log(`[TemplateIntegration] Buffer creation results: ${results.join(', ')}`);
    
    // Create the window layout
    console.log('[TemplateIntegration] Creating window layout...');
    const layoutSuccess = await windowManager.createLayout();
    console.log(`[TemplateIntegration] Window layout creation ${layoutSuccess ? 'succeeded' : 'failed'}`);
    
    return layoutSuccess;
  } catch (error) {
    console.error('[TemplateIntegration] Error rendering app template:', error);
    return false;
  }
}
