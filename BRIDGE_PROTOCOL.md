# Vue-to-Lua Bridge Protocol Documentation

## Overview

The Vue-to-Lua Bridge provides a generic, component-agnostic communication layer between TypeScript (COC.nvim) and Lua (Neovim). This document outlines the message protocol, usage patterns, and examples for implementing new components using the bridge.

## Message Protocol

All communication between TypeScript and Lua uses a standardized message format:

```typescript
interface BridgeMessage {
  id: string;                // Component instance identifier
  type: MessageType;         // Type of message (event, action, state, etc.)
  action: string;            // Generic action name
  payload?: any;             // Additional data
  timestamp?: number;        // Optional timestamp for tracking
  correlationId?: string;    // Optional correlation ID for request/response pairing
}
```

### Message Types

Messages are categorized by type to indicate their purpose:

```typescript
enum MessageType {
  EVENT = 'event',           // Component event notification
  ACTION = 'action',         // Action to be performed
  STATE = 'state',           // State update
  SYNC = 'sync',             // Synchronization message
  REQUEST = 'request',       // Request for data or action
  RESPONSE = 'response',     // Response to a request
  ERROR = 'error'            // Error notification
}
```

## Using the Bridge

### TypeScript Side

```typescript
import { bridgeCore, BridgeMessage, MessageType } from './bridge/core';

// Sending a message to Lua
async function sendActionToLua() {
  const message: BridgeMessage = {
    id: 'my_component_123',
    type: MessageType.ACTION,
    action: 'update',
    payload: {
      property: 'value',
      newValue: 'updated value'
    }
  };
  
  await bridgeCore.sendMessage(message);
}

// Receiving messages from Lua
function setupHandler() {
  bridgeCore.registerHandler('state_changed', (message: BridgeMessage) => {
    if (message.type === MessageType.EVENT) {
      console.log(`Component ${message.id} state changed:`, message.payload);
    }
  });
}
```

### Lua Side

```lua
local bridge = require('vue-ui.core.bridge')

-- Sending a message to TypeScript
function send_event_to_typescript()
  local message = bridge.create_message(
    'my_component_123',
    bridge.MESSAGE_TYPE.EVENT,
    'state_changed',
    {
      property = 'value',
      oldValue = 'previous value',
      newValue = 'current value'
    }
  )
  
  bridge.sendMessage(message)
end

-- Receiving messages from TypeScript
function setup_handler()
  bridge.register_handler('update', function(message)
    if message.type == bridge.MESSAGE_TYPE.ACTION then
      -- Handle the update action
      local component_id = message.id
      local property = message.payload.property
      local new_value = message.payload.newValue
      
      -- Update component state
      -- ...
      
      return true
    end
    return false
  end)
end
```

## Implementing a New Component

To implement a new component using the bridge:

1. **Define Component API**: Create interfaces for the component configuration and events.
2. **Create Component Class**: Implement the component class in TypeScript.
3. **Implement Lua Counterpart**: Create the corresponding Lua module.
4. **Register Message Handlers**: Set up handlers for component-specific actions.
5. **Use Generic Bridge**: Use the bridge for all communication between the two sides.

### Example: Button Component

#### TypeScript Side

```typescript
// src/components/button.ts
import { bridgeCore, BridgeMessage, MessageType } from '../bridge/core';

export interface ButtonConfig {
  label: string;
  disabled?: boolean;
  primary?: boolean;
}

export class Button {
  private _id: string;
  private _config: ButtonConfig;
  
  constructor(id: string, config: ButtonConfig) {
    this._id = id;
    this._config = config;
    
    // Register for state updates from Lua
    bridgeCore.registerHandler('button_clicked', this.handleButtonClicked.bind(this));
  }
  
  private handleButtonClicked(message: BridgeMessage): void {
    if (message.id === this._id && message.type === MessageType.EVENT) {
      // Handle click event
      console.log(`Button ${this._id} was clicked`);
    }
  }
  
  async click(): Promise<void> {
    const message: BridgeMessage = {
      id: this._id,
      type: MessageType.ACTION,
      action: 'click',
      payload: { timestamp: Date.now() }
    };
    
    await bridgeCore.sendMessage(message);
  }
  
  async setLabel(label: string): Promise<void> {
    const message: BridgeMessage = {
      id: this._id,
      type: MessageType.ACTION,
      action: 'set_property',
      payload: {
        property: 'label',
        value: label
      }
    };
    
    await bridgeCore.sendMessage(message);
    this._config.label = label;
  }
}
```

#### Lua Side

```lua
-- lua/vue-ui/components/button.lua
local bridge = require('vue-ui.core.bridge')

local M = {}
local buttons = {}

-- Create a new button
function M.create(id, config)
  local button = {
    id = id,
    label = config.label,
    disabled = config.disabled or false,
    primary = config.primary or false
  }
  
  buttons[id] = button
  return button
end

-- Handle button click
function M.click(id)
  local button = buttons[id]
  if not button or button.disabled then
    return false
  end
  
  -- Send event to TypeScript
  local message = bridge.create_message(
    id,
    bridge.MESSAGE_TYPE.EVENT,
    'button_clicked',
    { timestamp = os.time() * 1000 }
  )
  
  bridge.sendMessage(message)
  return true
end

-- Initialize message handlers
function M.initialize()
  -- Handle click action from TypeScript
  bridge.register_handler('click', function(message)
    if message.type == bridge.MESSAGE_TYPE.ACTION then
      return M.click(message.id)
    end
    return false
  end)
  
  -- Handle set_property action from TypeScript
  bridge.register_handler('set_property', function(message)
    if message.type == bridge.MESSAGE_TYPE.ACTION then
      local button = buttons[message.id]
      if button and message.payload.property then
        button[message.payload.property] = message.payload.value
        return true
      end
    end
    return false
  end)
  
  return true
end

return M
```

## Best Practices

1. **Component Agnostic**: Keep the bridge layer completely component-agnostic.
2. **Standard Message Format**: Always use the standard message format for all communication.
3. **Error Handling**: Include proper error handling on both sides.
4. **Correlation IDs**: Use correlation IDs for request/response pairs.
5. **Typed Interfaces**: Define clear typed interfaces for all components.
6. **Avoid Direct Commands**: Never use direct Vim/Neovim commands for component-specific actions.
7. **Stateless Bridge**: Keep the bridge stateless; state belongs in components.

## Testing

Test the bridge with the built-in test command:

```
:CocCommand vue.bridge.test
```

This will send a ping message from TypeScript to Lua and receive a pong response, demonstrating bidirectional communication.
