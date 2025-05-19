// Minimal implementation for COC-VUE Select component
import { workspace, ExtensionContext, commands, window } from 'coc.nvim';
import { BridgeCore, BridgeMessage, MessageType, bridgeCore } from './bridge/core';

// Main activation function for the extension
export async function activate(context: ExtensionContext): Promise<void> {
  console.log('[COC-VUE] Starting activation of Select component integration');
  
  try {
    // Force-load the Lua module to ensure commands are registered
    const nvim = workspace.nvim;
    console.log('[COC-VUE] Loading vue-ui Lua module...');
    
    // Ensure the Lua module is loaded and commands are registered
    await nvim.command('lua print("[VUE-UI] Loading module from TypeScript activation")');
    await nvim.command('lua if not package.loaded["vue-ui"] then require("vue-ui") end');
    await nvim.command('lua if not package.loaded["vue-ui.init"] then require("vue-ui.init") end');
    
    // Verify that the module is loaded and commands are registered
    await nvim.command('lua print("[VUE-UI] Module loaded: " .. tostring(package.loaded["vue-ui"] ~= nil))');
    
    // Log available commands for debugging
    console.log('[COC-VUE] Checking available Neovim commands...');
    await nvim.command('lua print("[VUE-UI] VueUISelect command registered: " .. tostring(vim.api.nvim_get_commands({})[\'VueUISelect\'] ~= nil))');
    
    console.log('[COC-VUE] Lua module loaded successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[COC-VUE] Error loading Lua module:', errorMessage);
    window.showErrorMessage(`Error loading Lua module: ${errorMessage}`);
  }
  
  // Register bridge message receiver command
  context.subscriptions.push(
    commands.registerCommand('vue.bridge.receiveMessage', async (serializedMessage: string) => {
      await bridgeCore.receiveMessage(serializedMessage);
    })
  );
  
  // Register bridge test command
  context.subscriptions.push(
    commands.registerCommand('vue.bridge.test', async () => {
      try {
        console.log('[COC-VUE] Testing generic bridge...');
        window.showInformationMessage('Testing generic bridge communication...');
        
        // Create a test message
        const testMessage: BridgeMessage = {
          id: 'test_component_' + Date.now(),
          type: MessageType.REQUEST,
          action: 'ping',
          payload: {
            message: 'Hello from TypeScript!',
            timestamp: Date.now()
          }
        };
        
        // Register a one-time handler for the response
        const responseHandler = async (message: BridgeMessage) => {
          if (message.type === MessageType.RESPONSE && message.action === 'pong') {
            window.showInformationMessage(`Bridge test successful! Response: ${JSON.stringify(message.payload)}`);
            bridgeCore.unregisterHandler('pong', responseHandler);
          }
        };
        
        bridgeCore.registerHandler('pong', responseHandler);
        
        // Send the test message
        console.log('[COC-VUE] Sending test message:', testMessage);
        const result = await bridgeCore.sendMessage(testMessage);
        console.log('[COC-VUE] Initial result:', result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[COC-VUE] Error testing bridge:', errorMessage);
        window.showErrorMessage(`Error testing bridge: ${errorMessage}`);
      }
    })
  );
  
  // Register the vue.selectDemo command
  context.subscriptions.push(
    commands.registerCommand('vue.selectDemo', async () => {
      try {
        console.log('[COC-VUE] Executing vue.selectDemo command');
        const nvim = workspace.nvim;
        
        // Ensure the Lua module is loaded before executing the command
        await nvim.command('lua if not package.loaded["vue-ui"] then require("vue-ui") end');
        
        // Create a unique ID for the Select component
        const selectId = 'select_demo_' + Date.now();
        const selectTitle = 'Select Component Demo';
        
        // Configure demo options for the Select component
        const selectOptions = {
          multi: false,
          width: 40,
          placeholder: 'Choose an option...',
          options: [
            { id: 'option1', text: 'Option 1', value: 'value1' },
            { id: 'option2', text: 'Option 2', value: 'value2' },
            { id: 'option3', text: 'Option 3', value: 'value3' },
            { id: 'option4', text: 'Option 4', value: 'value4' },
            { id: 'option5', text: 'Option 5', value: 'value5' }
          ]
        };
        
        // Convert options to JSON for the Lua command
        const optionsJson = JSON.stringify(selectOptions);
        
        console.log(`[COC-VUE] Preparing to launch Select component with ID: ${selectId}`);
        
        // Verify the command is registered before executing it
        await nvim.command('lua print("[VUE-UI] Checking VueUISelect command before execution: " .. tostring(vim.api.nvim_get_commands({})[\'VueUISelect\'] ~= nil))');
        
        // Execute the VueUISelect command to create and open the Select component
        const command = `VueUISelect ${selectId} "${selectTitle}" ${optionsJson}`;
        console.log(`[COC-VUE] Executing Neovim command: ${command}`);
        
        await nvim.command(command);
        
        console.log('[COC-VUE] Select component launched successfully');
        window.showInformationMessage('Select component launched successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[COC-VUE] Error launching Select component:', errorMessage);
        window.showErrorMessage(`Error launching Select component: ${errorMessage}`);
      }
    })
  );
  
  console.log('[COC-VUE] Select component integration activated successfully');
}

// Cleanup function called when the extension is deactivated
export function deactivate(): void {
  console.log('[COC-VUE] Deactivating Select component integration');
}
