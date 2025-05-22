import { commands, window, workspace, ExtensionContext } from 'coc.nvim';
import { BufferRouter } from '../bufferRouter';

/**
 * Register buffer-related commands for the Coc-vue plugin
 * This demonstrates real-world integration of the buffer router with the plugin
 */
export function registerBufferCommands(context: ExtensionContext) {
  // Create an instance of BufferRouter to use in commands
  const bufferRouter = new BufferRouter(context);
  
  // Register command to open a component file in a managed buffer
  context.subscriptions.push(
    commands.registerCommand('vue.component.open', async (componentPath: string, options?: Record<string, any>) => {
      try {
        // Create a managed buffer for the component
        const id = await bufferRouter.createBuffer(componentPath, options);
        
        // Switch to the buffer
        const success = await bufferRouter.switchBuffer(id);
        if (!success) {
          window.showErrorMessage(`Failed to open component: ${componentPath}`);
          return null;
        }
        
        // Return the buffer ID for potential future reference
        return id;
      } catch (error) {
        window.showErrorMessage(`Error opening component: ${error}`);
        return null;
      }
    })
  );
  
  // Register command to switch between component files (e.g. .vue, .spec.js)
  context.subscriptions.push(
    commands.registerCommand('vue.component.switchView', async (relatedPaths: string[]) => {
      try {
        // Get current buffer
        const current = await bufferRouter.getCurrentBuffer();
        if (!current) {
          window.showWarningMessage('No active Vue component buffer found');
          return false;
        }
        
        // Find the next path in the rotation
        const currentIndex = relatedPaths.findIndex(p => p === current.path);
        const nextIndex = (currentIndex + 1) % relatedPaths.length;
        const nextPath = relatedPaths[nextIndex];
        
        // Switch to the next buffer if it exists, or create it
        let success = await bufferRouter.switchBuffer(nextPath);
        if (!success) {
          // Buffer doesn't exist yet, create it
          const id = await bufferRouter.createBuffer(nextPath);
          success = await bufferRouter.switchBuffer(id);
        }
        
        return success;
      } catch (error) {
        window.showErrorMessage(`Error switching component view: ${error}`);
        return false;
      }
    })
  );
  
  // Register command to list all managed buffers
  context.subscriptions.push(
    commands.registerCommand('vue.buffer.list', async () => {
      try {
        // This command would need the Lua side to be extended with a list_buffers method
        // Here we show how it would integrate with the existing structure
        const nvim = workspace.nvim;
        const luaCommand = `return require('buffer_router'):list_buffers()`;
        const buffers = await nvim.lua(luaCommand) as Array<{id: string, path: string, query_string: string}>;
        
        if (!buffers || buffers.length === 0) {
          window.showInformationMessage('No managed buffers found');
          return [];
        }
        
        // Show buffer list in quick pick menu
        const selected = await window.showQuickPick(
          buffers.map(buf => ({
            label: buf.path + (buf.query_string ? `?${buf.query_string}` : ''),
            description: `ID: ${buf.id}`,
            data: buf.id
          })),
          { title: 'Select buffer to switch to' }
        );
        
        if (selected) {
          await bufferRouter.switchBuffer(selected.data);
        }
        
        return buffers;
      } catch (error) {
        window.showErrorMessage(`Error listing buffers: ${error}`);
        return [];
      }
    })
  );
  
  // Add the buffer router to subscriptions for disposal
  context.subscriptions.push(bufferRouter);
  
  return {
    bufferRouter
  };
}
