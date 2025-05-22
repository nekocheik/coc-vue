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
 * Renders the template tree to actual Neovim buffers and windows
 * 
 * @param rootNode The root VNode from the template
 * @param windowManager The WindowManager instance
 * @param bufferRouter The BufferRouter instance
 */
export async function renderTemplate(
  rootNode: VNode,
  windowManager: WindowManager,
  bufferRouter: BufferRouter
): Promise<boolean> {
  try {
    console.log('[TemplateIntegration] Rendering template tree');
    
    // Step 1: Process the slots from the MountRegistry
    for (const [slotName, node] of MountRegistry.slots.entries()) {
      await processSlotNode(slotName, node, windowManager, bufferRouter);
    }
    
    // Step 2: Process the bars from the MountRegistry
    for (const [position, node] of MountRegistry.bars.entries()) {
      await processBarNode(position, node, windowManager);
    }
    
    // Step 3: Create the visual window layout
    console.log('[TemplateIntegration] Creating window layout');
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
 */
async function processSlotNode(
  slotName: string,
  node: VNode,
  windowManager: WindowManager,
  bufferRouter: BufferRouter
): Promise<void> {
  try {
    console.log(`[TemplateIntegration] Processing slot: ${slotName}`);
    
    // Extract the component type from the first child
    const componentNode = node.children[0];
    if (!componentNode) {
      console.warn(`[TemplateIntegration] No component found for slot ${slotName}`);
      return;
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
      return;
    }
    
    // Mount the buffer in the slot
    const size = node.props.size || 30; // Default size
    await windowManager.mountBuffer(slotName as any, bufferId, componentType, size);
    
  } catch (error) {
    console.error(`[TemplateIntegration] Error processing slot ${slotName}:`, error);
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
    // Dynamically import the App component
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
