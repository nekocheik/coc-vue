// COC-VUE Implementation with Vue-like Reactive Bridge
import { workspace, ExtensionContext, commands, window } from 'coc.nvim';
import { BridgeCore, BridgeMessage, MessageType, bridgeCore } from './bridge/core';
import { registerBufferCommands } from './commands/bufferCommands';
import { registerWindowManagerCommands } from './commands/windowManagerCommands';
import { Select } from './components/select';

// Registry to keep track of active components
const componentRegistry = new Map<string, any>();

// Main activation function for the extension
export async function activate(context: ExtensionContext): Promise<void> {
  console.log('[COC-VUE] Starting activation of Select component integration');
  
  // Initialize the buffer router and register buffer commands
  const { bufferRouter } = registerBufferCommands(context);
  
  // Initialize the window manager and register window manager commands
  registerWindowManagerCommands(context);
  
  try {
    // Force-load the Lua module to ensure commands are registered
    const nvim = workspace.nvim;
    console.log('[COC-VUE] Loading vue-ui Lua module...');
    
    // Ensure the Lua module is loaded and commands are registered
    await nvim.command('lua print("[VUE-UI] Loading module from TypeScript activation")');
    await nvim.command('lua if not package.loaded["vue-ui"] then require("vue-ui") end');
  await nvim.command('lua if not package.loaded["buffer_router"] then require("buffer_router") end');
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
  
  // Register buffer router commands
  context.subscriptions.push(
    commands.registerCommand('vue.buffer.create', async (path: string, query?: Record<string, any>) => {
      return await bufferRouter.createBuffer(path, query);
    }),
    commands.registerCommand('vue.buffer.delete', async (id: string) => {
      return await bufferRouter.deleteBuffer(id);
    }),
    commands.registerCommand('vue.buffer.switch', async (identifier: string) => {
      return await bufferRouter.switchBuffer(identifier);
    }),
    commands.registerCommand('vue.buffer.current', async () => {
      return await bufferRouter.getCurrentBuffer();
    })
  );

  // Register bridge message receiver command
  context.subscriptions.push(
    commands.registerCommand('vue.bridge.receiveMessage', async (serializedMessage: string) => {
      await bridgeCore.receiveMessage(serializedMessage);
    })
  );
  
  // Register vueui.callMethod action to handle events from Lua
  context.subscriptions.push(
    commands.registerCommand('vueui.callMethod', async (eventName: string, data: any) => {
      try {
        console.log(`[COC-VUE] Received Lua event: ${eventName}`, data);
        
        // Handle different event types
        switch (eventName) {
          case 'component:created':
            // Handle component creation events
            window.showInformationMessage(`Component created: ${data?.id || 'unknown'}`);
            break;
          
          case 'select:opened':
            // Handle select opened events
            console.log(`[COC-VUE] Select opened: ${data?.id || 'unknown'}`);
            break;
          
          case 'select:changed':
            // Handle select changed events
            console.log(`[COC-VUE] Select value changed: ${data?.value || 'unknown'}`);
            break;
          
          case 'select:confirmed':
            // Handle select confirmed events
            console.log(`[COC-VUE] Select confirmed with value: ${data?.value || 'unknown'}`);
            window.showInformationMessage(`Selected value: ${data?.value || 'none'}`);
            break;
          
          default:
            console.log(`[COC-VUE] Unhandled event type: ${eventName}`);
        }
        
        return { success: true, eventName, timestamp: Date.now() };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[COC-VUE] Error handling Lua event ${eventName}:`, errorMessage);
        return { success: false, error: errorMessage, timestamp: Date.now() };
      }
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
  await nvim.command('lua if not package.loaded["buffer_router"] then require("buffer_router") end');
        
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
  
  // Register the vue.showComponentsDemo command (newly added)
  context.subscriptions.push(
    commands.registerCommand('vue.showComponentsDemo', async () => {
      try {
        console.log('[COC-VUE] Executing vue.showComponentsDemo command');
        const nvim = workspace.nvim;
        
        // Ensure the Lua module is loaded before executing the command
        await nvim.command('lua if not package.loaded["vue-ui"] then require("vue-ui") end');
  await nvim.command('lua if not package.loaded["buffer_router"] then require("buffer_router") end');
        
        // Create a demo with multiple components
        window.showInformationMessage('Launching Components Demo...');
        
        // Select component demo
        const selectId = 'select_components_demo_' + Date.now();
        const selectTitle = 'Select Component';
        const selectOptions = {
          multi: false,
          width: 40,
          placeholder: 'Select a component...',
          options: [
            { id: 'select', text: 'Select', value: 'select' },
            { id: 'input', text: 'Input', value: 'input' },
            { id: 'button', text: 'Button', value: 'button' },
            { id: 'modal', text: 'Modal', value: 'modal' }
          ]
        };
        
        // Convert options to JSON for the Lua command
        const optionsJson = JSON.stringify(selectOptions);
        
        // Execute the VueUISelect command to create and open the Select component
        const command = `VueUISelect ${selectId} "${selectTitle}" ${optionsJson}`;
        await nvim.command(command);
        
        console.log('[COC-VUE] Components demo launched successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[COC-VUE] Error launching Components demo:', errorMessage);
        window.showErrorMessage(`Error launching Components demo: ${errorMessage}`);
      }
    })
  );
  
  // Register the vue.showWindowDemo command (redirects to windowManager.demoLayout)
  context.subscriptions.push(
    commands.registerCommand('vue.showWindowDemo', async () => {
      try {
        console.log('[COC-VUE] Executing vue.showWindowDemo command');
        
        // Execute the windowManager.demoLayout command
        window.showInformationMessage('Launching Window Manager Demo Layout...');
        await commands.executeCommand('windowManager.demoLayout');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[COC-VUE] Error launching Window demo:', errorMessage);
        window.showErrorMessage(`Error launching Window demo: ${errorMessage}`);
      }
    })
  );
  
  // Register the vue.showEditorDemo command (newly added)
  context.subscriptions.push(
    commands.registerCommand('vue.showEditorDemo', async () => {
      try {
        console.log('[COC-VUE] Executing vue.showEditorDemo command');
        
        // Display a simple information message for now
        window.showInformationMessage('Editor Demo is not fully implemented yet');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[COC-VUE] Error launching Editor demo:', errorMessage);
        window.showErrorMessage(`Error launching Editor demo: ${errorMessage}`);
      }
    })
  );
  
  console.log('[COC-VUE] Vue-like reactive bridge activated successfully');
}

// Cleanup function called when the extension is deactivated
export function deactivate(): void {
  console.log('[COC-VUE] Deactivating Vue-like reactive bridge');
  
  // Destroy all active components
  for (const [id, component] of componentRegistry.entries()) {
    try {
      if (typeof component.destroy === 'function') {
        component.destroy();
        console.log(`[COC-VUE] Component ${id} destroyed during deactivation`);
      }
    } catch (error) {
      console.error(`[COC-VUE] Error destroying component ${id}:`, error);
    }
  }
  
  // Clear the registry
  componentRegistry.clear();
}
