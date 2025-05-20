// src/bridge/index.ts
import { workspace } from 'coc.nvim';
import { EventType, EventPayload } from '../events/index';

export class Bridge {
  private static instance: Bridge;

  private constructor() {}

  public static getInstance(): Bridge {
    if (!Bridge.instance) {
      Bridge.instance = new Bridge();
    }
    return Bridge.instance;
  }

  /**
   * Send a command to Lua
   */
  public async sendCommand(command: string, ...args: any[]): Promise<any> {
    const nvim = workspace.nvim;
    const serializedArgs = args.map(arg => {
      if (typeof arg === 'object') {
        return `'${JSON.stringify(arg)}'`;
      } else if (typeof arg === 'string') {
        return `'${arg}'`;
      } else {
        return arg;
      }
    }).join(', ');
    
    const luaCommand = `lua return require('vue-ui.core.bridge').execute_command('${command}', ${serializedArgs})`;
    
    try {
      const result = await nvim.command(luaCommand);
      return result;
    } catch (error) {
      console.error(`[Bridge] Error executing command ${command}:`, error);
      throw error;
    }
  }

  /**
   * Send an event to Lua
   */
  public async sendEvent(event: EventPayload): Promise<void> {
    const nvim = workspace.nvim;
    const serializedEvent = JSON.stringify(event);
    
    const luaCommand = `lua require('vue-ui.core.bridge').handle_event('${serializedEvent}')`;
    
    try {
      await nvim.command(luaCommand);
    } catch (error) {
      console.error(`[Bridge] Error sending event ${event.type}:`, error);
      throw error;
    }
  }

  /**
   * Register a handler for events from Lua
   */
  public async registerEventHandler(handler: (event: EventPayload) => void): Promise<void> {
    // This is a stub for now
    // In a real implementation, we would set up a channel for receiving events from Lua
    console.log('[Bridge] Event handler registered (stub)');
  }
}
