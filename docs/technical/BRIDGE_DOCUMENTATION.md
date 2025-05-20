# Vue-Like Reactive Bridge for Neovim

## Overview

This document describes the Vue-like reactive bridge system implemented for the coc-vue extension. The system provides a generic, reusable bridge between Lua component implementations (such as Select, Modal, Input) and TypeScript component classes with Vue-like reactivity and lifecycle hooks.

## Architecture

The system consists of three main parts:

1. **Generic Bridge Core**: A component-agnostic communication layer between TypeScript and Lua
2. **Vue-Like Reactivity System**: A TypeScript implementation of Vue 3's reactivity system
3. **VimComponent Class**: A base class that provides Vue-like lifecycle hooks and buffer integration

```
┌─────────────────────────────────────────────────────────────────┐
│                      TypeScript (COC.nvim)                       │
│                                                                 │
│  ┌───────────────┐      ┌───────────────┐      ┌───────────────┐│
│  │               │      │               │      │               ││
│  │  Reactivity   │◄────►│  VimComponent │◄────►│  Component    ││
│  │  System       │      │  Class        │      │  Implementations││
│  │               │      │               │      │               ││
│  └───────┬───────┘      └───────┬───────┘      └───────────────┘│
│          │                      │                                │
│          │                      │                                │
│          ▼                      ▼                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                       Bridge Core                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                │                                 │
└────────────────────────────────┼─────────────────────────────────┘
                                 │
                                 │ JSON-RPC/IPC
                                 │
┌────────────────────────────────┼─────────────────────────────────┐
│                                │                                 │
│                         Neovim/Lua Side                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                       Bridge Core                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                │                                 │
│                                │                                 │
│                                ▼                                 │
│  ┌───────────────┐      ┌───────────────┐      ┌───────────────┐│
│  │               │      │               │      │               ││
│  │  Component    │◄────►│  Buffer       │◄────►│  Event        ││
│  │  Implementations     │  Manager      │      │  Handlers     ││
│  │               │      │               │      │               ││
│  └───────────────┘      └───────────────┘      └───────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Generic Bridge Core

The bridge core provides a component-agnostic communication layer between TypeScript and Lua. It uses a standard message protocol:

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

Key features:

- **No hardcoded component logic** in the bridge layer
- **Standard message protocol** for all communication
- **Bidirectional communication** between TypeScript and Lua
- **Handler registration system** for routing messages to the appropriate handlers
- **Error handling** for robust operation

## Vue-Like Reactivity System

The reactivity system provides Vue 3-like reactive state management:

```typescript
// Create reactive state
const state = reactive({ count: 0 });

// Create a computed property
const doubleCount = computed(() => state.count * 2);

// Create an effect (similar to Vue's watchEffect)
effect(() => {
  console.log(`Count: ${state.count}, Double: ${doubleCount.value}`);
});

// Create a watcher (similar to Vue's watch)
watch(() => state.count, (newValue, oldValue) => {
  console.log(`Count changed from ${oldValue} to ${newValue}`);
});

// Update state - automatically triggers effects and watchers
state.count = 1;
```

Key features:

- **Reactive objects** that track property access and changes
- **Computed properties** that update automatically when dependencies change
- **Effects** that run automatically when reactive state changes
- **Watchers** that respond to specific state changes

## VimComponent Class

The `VimComponent` class provides Vue-like lifecycle hooks and Vim buffer integration:

```typescript
const component = new VimComponent({
  id: 'my_component',
  type: 'example',
  state: { message: 'Hello World' },
  beforeMount: async function() {
    console.log('Component will be mounted');
  },
  onMounted: async function() {
    console.log('Component mounted');
  },
  onUpdated: async function() {
    console.log('Component updated');
  },
  onBeforeDestroy: async function() {
    console.log('Component will be destroyed');
  },
  onDestroyed: async function() {
    console.log('Component destroyed');
  },
  render: function(state) {
    return [`Message: ${state.message}`];
  }
});

// Mount the component
await component.mount();

// Update state
component.updateState({ message: 'Updated Message' });

// Destroy the component
await component.destroy();
```

Key features:

- **Lifecycle hooks**: `beforeMount`, `onMounted`, `onUpdated`, `onBeforeDestroy`, `onDestroyed`
- **Reactive state** that triggers re-rendering when changed
- **Computed properties** that update automatically
- **Methods** that can be called from TypeScript or Lua
- **Watchers** that respond to state changes
- **Vim buffer integration** for rendering components

## Buffer Integration

Components are rendered to Vim buffers, which act as the "DOM" for the UI:

```typescript
// Buffer options
bufferOptions: {
  name: 'My Component',
  filetype: 'vue-component',
  width: 60,
  height: 10,
  position: 'floating', // or 'top', 'bottom', 'left', 'right'
  modifiable: false,
  readonly: true,
  focusOnCreate: true
}
```

Key features:

- **Buffer creation and management**: Create, update, and destroy buffers
- **Window positioning**: Floating windows or split windows
- **Buffer options**: Set buffer name, filetype, and other options
- **Content rendering**: Render component state to buffer content
- **Key mappings**: Set up key mappings for component interaction

## Example: Select Component

The Select component demonstrates the full capabilities of the system:

```typescript
// Create a select component
const select = new Select({
  id: 'my_select',
  title: 'Choose an option',
  options: [
    { id: 'opt1', text: 'Option 1', value: 'value1' },
    { id: 'opt2', text: 'Option 2', value: 'value2' },
    { id: 'opt3', text: 'Option 3', value: 'value3' }
  ],
  multi: false,
  placeholder: 'Select an option...'
});

// Mount the component
await select.mount();

// Open the select dropdown
await select.open();

// Focus on an option
await select.focusOption(1);

// Select an option
await select.selectOption(1);

// Get the selected value
const value = select.getValue(); // 'value2'

// Close the select
await select.close();

// Destroy the component
await select.destroy();
```

The select component demonstrates:

- **Reactive state**: Options, selection, focus state
- **Methods**: `open`, `close`, `focusOption`, `selectOption`, etc.
- **Events**: Option selection, focus changes, open/close events
- **Lifecycle hooks**: All hooks are implemented
- **Buffer rendering**: Display of options, selection state, etc.

## Bridge Communication Flow

The bridge enables bidirectional communication between TypeScript and Lua components:

### TypeScript to Lua

1. TypeScript component calls a method (e.g., `select.open()`)
2. Method sends a message to Lua via the bridge
   ```typescript
   bridgeCore.sendMessage({
     id: this.id,
     type: MessageType.ACTION,
     action: 'select:open',
     payload: {}
   });
   ```
3. Lua bridge receives the message and routes it to the appropriate component
4. Lua component processes the message and performs the action

### Lua to TypeScript

1. Lua component emits an event (e.g., option selected)
   ```lua
   core_event.emit_select_option_selected(self, index)
   ```
2. Lua bridge sends the event to TypeScript
3. TypeScript bridge receives the message and routes it to the registered handler
4. Component handler processes the event and updates state
   ```typescript
   if (message.action === 'select:optionSelected') {
     this.updateState({
       selectedOptionIndex: message.payload.index,
       selectedValue: this.state.options[message.payload.index].value,
       selectedText: this.state.options[message.payload.index].text
     });
   }
   ```
5. State update triggers reactivity system to re-render the component

## Testing

The system includes comprehensive tests:

- **Bridge Core Tests**: Test bidirectional communication
- **VimComponent Tests**: Test lifecycle hooks, reactivity, and buffer integration
- **Select Component Tests**: Test a concrete implementation
- **Bridge Integration Tests**: Test end-to-end communication flow

Run the tests with:

```bash
npm test
```

## Implementation Details

### Bridge Core (TypeScript)

The TypeScript bridge core handles message sending and receiving:

```typescript
// Send a message to Lua
await bridgeCore.sendMessage({
  id: 'component_id',
  type: MessageType.ACTION,
  action: 'component:action',
  payload: { /* data */ }
});

// Register a handler for messages from Lua
bridgeCore.registerHandler('component:event', (message) => {
  // Handle the message
});
```

### Bridge Core (Lua)

The Lua bridge core mirrors the TypeScript implementation:

```lua
-- Send a message to TypeScript
bridge.send_message({
  id = 'component_id',
  type = 'event',
  action = 'component:event',
  payload = { -- data -- }
})

-- Register a handler for messages from TypeScript
bridge.register_handler('component:action', function(message)
  -- Handle the message
end)
```

### Component Implementation

Each component extends the `VimComponent` class and implements its specific API:

```typescript
export class Select extends VimComponent {
  constructor(config: SelectConfig) {
    super({
      id: config.id,
      type: 'select',
      props: { /* component props */ },
      state: { /* component state */ },
      methods: { /* component methods */ },
      computed: { /* computed properties */ },
      watch: { /* watchers */ },
      render: function(state) { /* render function */ }
    });
    
    // Register component-specific message handlers
    this.registerMessageHandlers();
  }
  
  // Public API methods
  async open(): Promise<boolean> {
    return await this.callMethod('open');
  }
  
  async selectOption(index: number): Promise<boolean> {
    return await this.callMethod('selectOption', index);
  }
  
  // ... other methods
}
```

## Using the System

To create a new component:

1. **Define component options**: ID, type, state, methods, computed properties, watchers, lifecycle hooks, render function
2. **Create component instance**: `new ComponentClass(options)`
3. **Mount the component**: `await component.mount()`
4. **Call methods**: `await component.methodName(...args)`
5. **Update state**: `component.updateState({ key: value })`
6. **Destroy the component**: `await component.destroy()`

## Adding New Components

To add a new component:

1. **Create Lua implementation**: Implement the component in Lua
2. **Create TypeScript class**: Extend `VimComponent` and implement the component API
3. **Define message protocol**: Define the messages exchanged between TypeScript and Lua
4. **Implement handlers**: Register handlers for component-specific messages
5. **Create tests**: Test the component implementation and bridge communication

## Conclusion

This Vue-like reactive bridge system provides a powerful framework for creating interactive UI components in Neovim. It combines the best of Vue's reactivity system with Vim's buffer management to create a seamless development experience.

The system is designed to be:

- **Modular**: Components are self-contained and can be composed
- **Reactive**: State changes automatically trigger UI updates
- **Testable**: All aspects of the system can be tested
- **Extensible**: New components can be easily created

By following the patterns established in this system, you can create rich, interactive UI components for Neovim that provide a modern development experience.
