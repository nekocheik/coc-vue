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

import { MountRegistry, VNode } from './tsxFactory';
import { WindowManager } from '../src/windowManager';
import { BufferRouter } from '../src/bufferRouter';

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
      const promise = processSlotNode(slotName, node, windowManager, bufferRouter);
      slotPromises.push(promise);
    }
    
    // Wait for all slots to be processed and collect buffer IDs
    const results = await Promise.all(slotPromises);
    
    // Map results to slot names (Map doesn't have forEach with index, so convert to array first)
    const slotEntries = Array.from(MountRegistry.slots.entries());
    slotEntries.forEach(([slotName, _node], index) => {
      const bufferId = results[index];
      if (bufferId) {
        slotBufferMap[slotName] = bufferId;
      }
    });
    
    // Verify all required slots have valid buffers
    const missingSlots = REQUIRED_SLOTS.filter(slot => !slotBufferMap[slot]);
    
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
          slotBufferMap[slotName] = bufferId;
          await windowManager.mountBuffer(slotName as any, bufferId, 'DefaultComponent', 30);
        } else {
          console.error(`[TemplateIntegration] Failed to create default buffer for ${slotName}`);
        }
      }
    }
    
    // Verify again after creating default buffers
    const stillMissingSlots = REQUIRED_SLOTS.filter(slot => !slotBufferMap[slot]);
    if (stillMissingSlots.length > 0) {
      console.error(`[TemplateIntegration] Still missing buffers for slots: ${stillMissingSlots.join(', ')}. Cannot create layout.`);
      return false;
    }
    
    // Log the slot-to-buffer mapping
    console.log('[DEBUG] slotMap:', slotBufferMap);
    
    // Step 2: Process the bars from the MountRegistry
    const barPromises = [];
    for (const [position, node] of MountRegistry.bars.entries()) {
      barPromises.push(processBarNode(position, node, windowManager));
    }
    
    // Wait for all bars to be processed
    await Promise.all(barPromises);
    
    // Step 3: Create the visual window layout
    console.log('[TemplateIntegration] Creating window layout with verified buffers');
    const success = await windowManager.createLayout();
    
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
    
    console.log(`[TemplateIntegration] Creating buffer for ${path}`);
    const bufferId = await bufferRouter.createBuffer(path, query);
    
    if (!bufferId) {
      console.error(`[TemplateIntegration] Failed to create buffer for ${slotName}`);
      return null;
    }
    
    // Mount the buffer in the slot
    const size = node.props?.size || 30; // Default size
    await windowManager.mountBuffer(slotName as any, bufferId, componentType, size);
    
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
    windowManager.setBarContent(position as 'top' | 'bottom', content);
    
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
    // Dynamically import the App component without extension (webpack will resolve it)
    const { default: App } = await import('./index');
    
    // Create the App VNode
    const appNode = App();
    
    // Render the template
    return await renderTemplate(appNode, windowManager, bufferRouter);
  } catch (error) {
    console.error('[TemplateIntegration] Error rendering app template:', error);
    return false;
  }
}
