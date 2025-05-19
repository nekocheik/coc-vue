# Vue-Like Reactive Component System for Neovim

## Overview

This document describes the Vue-like reactive component system implemented for the coc-vue extension. The system provides a framework for creating, managing, and rendering reactive UI components in Neovim buffers, with bidirectional state synchronization between TypeScript and Lua via a generic bridge.

## Architecture

The system consists of three main parts:

1. **Generic Bridge Core**: A component-agnostic communication layer between TypeScript and Lua
2. **Vue-Like Reactivity System**: A TypeScript implementation of Vue 3's reactivity system
3. **VimComponent Class**: A class that provides Vue-like lifecycle hooks and buffer integration

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
│  │  Neovim       │◄────►│  Buffer       │◄────►│  Event        ││
│  │  API Adapter  │      │  Manager      │      │  Handlers     ││
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

## Example: Counter Component

The Counter component demonstrates the full capabilities of the system:

```typescript
// Create a counter
const counter = new Counter({
  id: 'my_counter',
  initialCount: 0,
  step: 1
});

// Mount the counter
await counter.mount();

// Increment the counter
await counter.increment(); // count = 1

// Decrement the counter
await counter.decrement(); // count = 0

// Reset the counter
await counter.reset(); // count = 0

// Set the step size
await counter.setStep(5);

// Increment with new step size
await counter.increment(); // count = 5

// Destroy the counter
await counter.destroy();
```

The counter component demonstrates:

- **Reactive state**: `count`, `step`, `incrementCount`, `decrementCount`
- **Computed properties**: `displayValue`, `stats`
- **Methods**: `increment`, `decrement`, `reset`, `setStep`
- **Watchers**: Watch for changes to `count`
- **Lifecycle hooks**: All hooks are implemented
- **Buffer rendering**: ASCII art display of the counter
- **Key mappings**: `+` to increment, `-` to decrement, `r` to reset, `q` to close

## Using the System

To create a new component:

1. **Define component options**: ID, type, state, methods, computed properties, watchers, lifecycle hooks, render function
2. **Create component instance**: `new VimComponent(options)` or extend the class
3. **Mount the component**: `await component.mount()`
4. **Update state**: `component.updateState({ key: value })`
5. **Call methods**: `await component.callMethod('methodName', ...args)`
6. **Destroy the component**: `await component.destroy()`

## Testing

The system includes comprehensive tests:

- **Bridge Core Tests**: Test bidirectional communication
- **VimComponent Tests**: Test lifecycle hooks, reactivity, and buffer integration
- **Counter Component Tests**: Test a concrete implementation

Run the tests with:

```bash
npm test
```

## Conclusion

This Vue-like reactive component system provides a powerful framework for creating interactive UI components in Neovim. It combines the best of Vue's reactivity system with Vim's buffer management to create a seamless development experience.

The system is designed to be:

- **Modular**: Components are self-contained and can be composed
- **Reactive**: State changes automatically trigger UI updates
- **Testable**: All aspects of the system can be tested
- **Extensible**: New components can be easily created

By following the patterns established in this system, you can create rich, interactive UI components for Neovim that provide a modern development experience.
