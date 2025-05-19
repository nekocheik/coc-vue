# COC-VUE Technical Handbook

## Overview

COC-VUE is a Vue.js integration for COC.nvim, providing UI components and interactive features for Neovim. The project combines TypeScript for the core logic and Lua for the Neovim integration components.

The architecture has been recently refactored to be completely component-agnostic, eliminating hardcoded references to specific components. This allows for dynamic loading of any Vue component without requiring modifications to global files. Keyboard mappings are now configured dynamically based on the methods available in each component.

## Project Structure

```
coc-vue/
├── dist/                  # Compiled output
├── lib/                   # Output directory for webpack build
├── lua/                   # Lua modules for Neovim integration
│   └── vue-ui/            # Main Lua module
│       ├── components/    # UI components (button, input, modal, select)
│       ├── events/        # Event handling system
│       └── utils/         # Utility functions
├── src/                   # TypeScript source code
│   ├── bridge/            # Bridge between TypeScript and Neovim
│   ├── core/              # Core functionality
│   │   ├── adapters/      # Adapters for external systems
│   │   ├── components/    # Core component implementations
│   │   ├── controllers/   # Controllers for form handling
│   │   ├── services/      # Services for buffer management
│   │   └── utils/         # Utility functions
│   ├── demos/             # Demo implementations
│   ├── renderer/          # Rendering system
│   ├── types/             # TypeScript type definitions
│   └── vim/               # Vim integration
├── test/                  # Test files
│   ├── manual/            # Manual test scripts
│   └── vader/             # Vader tests for Lua components
└── package.json           # Project configuration
```

## Prerequisites

- Node.js (v14.x or higher)
- npm (v6.x or higher)
- Neovim (v0.5.0 or higher)
- [COC.nvim](https://github.com/neoclide/coc.nvim) extension (v0.0.80 or higher)
- [Vader.vim](https://github.com/junegunn/vader.vim) for running Lua component tests

All dependencies are listed in `package.json` and can be installed with `npm install`.

## Build and Run

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/coc-vue.git
   cd coc-vue
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```
   This will compile the TypeScript code using webpack and output to the `lib` directory.

4. Link the extension to COC.nvim:
   ```bash
   cd ~/.config/coc/extensions
   ln -s /path/to/coc-vue .
   ```
   
5. Verify installation in Neovim:
   ```vim
   :CocList extensions
   ```
   You should see `coc-vue` in the list of installed extensions.

### Development Mode

For development with hot reloading:
```bash
npm run watch
```

## Testing

### JavaScript/TypeScript Tests

The project uses Jest for testing TypeScript components:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Lua Component Tests (Vader)

The Lua UI components are tested using Vader.vim:

1. Ensure Vader.vim is installed:
   ```vim
   Plug 'junegunn/vader.vim'
   ```

2. Run individual component tests:
   ```bash
   # Run select component tests
   nvim -u NORC -N --headless -c "set rtp+=./test,vader.vim" -c "Vader! test/vader/select.vader" -c "qall!"
   
   # Run button component tests
   nvim -u NORC -N --headless -c "set rtp+=./test,vader.vim" -c "Vader! test/vader/button.vader" -c "qall!"
   
   # Run modal component tests
   nvim -u NORC -N --headless -c "set rtp+=./test,vader.vim" -c "Vader! test/vader/modal.vader" -c "qall!"
   ```

3. Run all Vader tests:
   ```bash
   nvim -u NORC -N --headless -c "set rtp+=./test,vader.vim" -c "Vader! test/vader/*.vader" -c "qall!"
   ```

### Manual Testing

For manual testing of UI components:

1. Open Neovim with the extension loaded
2. Run one of the demo commands:
   ```vim
   :CocCommand vue.directBufferDemo
   :CocCommand vue.enhancedInputDemo
   :CocCommand vue.simpleFormDemo
   :CocCommand vue.basicFormDemo
   ```

## Components and Modules

### Lua UI Components

The project provides several Lua-based UI components for Neovim:

1. **Button** (`lua/vue-ui/components/button.lua`):
   - Creates clickable buttons in Neovim
   - Supports different styles (primary, default, success, warning, danger)
   - Handles click events and focus states
   - Tested in `test/vader/button.vader`

2. **Input** (`lua/vue-ui/components/input.lua`):
   - Text input field with editing capabilities
   - Supports validation, placeholders, and password masking
   - Handles cursor movement and text editing
   - Emits change and submit events

3. **Modal** (`lua/vue-ui/components/modal.lua`):
   - Dialog windows with customizable content
   - Supports buttons, forms, and keyboard navigation
   - Configurable with title, content, and button options
   - Tested in `test/vader/modal.vader`

4. **Select** (`lua/vue-ui/components/select.lua`):
   - Dropdown selection component
   - Supports single and multi-select modes
   - Keyboard navigation and search functionality
   - Emits events for selection changes
   - Tested in `test/vader/select.vader`

5. **Registry** (`lua/vue-ui/components/registry.lua`):
   - Manages component instances
   - Provides global access to registered components
   - Handles component lifecycle and cleanup

### Core TypeScript Modules

1. **Bridge** (`src/bridge/`):
   - Facilitates communication between TypeScript and Neovim
   - `neovim-bridge.ts`: Core bridge implementation for Neovim communication

2. **Renderer** (`src/renderer/`):
   - Handles rendering of UI components
   - `vue-renderer.ts`: Vue-specific rendering logic
   - `dom-adapter.ts`: Adapter for DOM operations in Neovim context

3. **Core Services** (`src/core/services/`):
   - `buffer-manager.ts`: Manages Neovim buffers with component-agnostic approach
   - `focus-manager.ts`: Handles focus management between components

4. **Core Adapters** (`src/core/adapters/`):
   - `neovim-adapter.ts`: Provides a standardized interface to Neovim

5. **Core Components** (`src/core/components/`):
   - `simple-input-field.ts`: Base implementation for input fields

6. **Demo Implementations** (`src/demos/`, `src/vim/`):
   - `direct-buffer-demo.ts`: Simple buffer-based demo
   - `enhanced-input-demo.ts`: Advanced input field demo
   - `simple-form-demo.ts`: Form implementation demo
   - `basic-form-demo.ts`: Simplified form implementation

## Event System

The project uses an event-driven architecture:

1. **Event Schema** (`lua/vue-ui/events/schema.lua`):
   - Defines all event types used in the system

2. **Event Bridge** (`lua/vue-ui/utils/event_bridge.lua`):
   - Handles event emission and subscription

3. **Event Handlers** (`lua/vue-ui/events/handlers.lua`):
   - Processes events and triggers appropriate actions

## Command Integration

The extension registers several commands in COC.nvim:

1. **Direct Buffer Demo**:
   - `vue.directBufferDemo`: Simple buffer-based demo
   - `vue.directIncrementCounter`: Increment counter in the direct demo

2. **Enhanced Input Demo**:
   - `vue.enhancedInputDemo`: Demo with advanced input fields
   - Various navigation commands (`vue.enhancedNextInput`, etc.)

3. **Form Demos**:
   - `vue.simpleFormDemo`: Simple form implementation
   - `vue.basicFormDemo`: Basic form implementation

## Troubleshooting

### Logs and Debugging

1. **Event Logs**:
   - Located at `~/.local/share/nvim/ui_events_*.json`
   - Contains detailed event information for debugging

2. **COC.nvim Logs**:
   - Check COC.nvim logs with `:CocOpenLog`

3. **Debug Mode**:
   - Enable debug mode in the setup:
   ```lua
   require('vue-ui').setup({debug = true})
   ```

### Common Issues

1. **Component Not Rendering**:
   - Ensure the component ID is unique
   - Check for errors in the COC.nvim log

2. **Event Handling Issues**:
   - Verify event types in `schema.lua`
   - Check event subscriptions

3. **Build Failures**:
   - Ensure all dependencies are installed
   - Check TypeScript errors with `tsc --noEmit`

## Development Workflow

### Adding a New Component

1. Create a new Lua file in `lua/vue-ui/components/`:
   ```lua
   -- example_component.lua
   local M = {}
   local event_bridge = require('vue-ui.utils.event_bridge')
   local schema = require('vue-ui.events.schema')
   
   -- Component implementation
   local ExampleComponent = {}
   ExampleComponent.__index = ExampleComponent
   
   function M.create(id, config)
     -- Implementation
   end
   
   return M
   ```

2. Register the component in `lua/vue-ui/init.lua`:
   ```lua
   -- Add to the init function
   M.example_component = require('vue-ui.components.example_component')
   ```

3. Create Vader tests in `test/vader/`:
   ```
   # example_component.vader
   Execute (Test Environment Setup):
     " Setup test environment
     lua require('vue-ui').setup({debug = true})
     
     " Test implementation
   ```

4. Add any necessary event types in `lua/vue-ui/events/schema.lua`

5. Update documentation in this handbook

### Modifying Existing Components

1. Make changes to the component implementation

2. Run the relevant Vader tests:
   ```bash
   nvim -u NORC -N --headless -c "set rtp+=./test,vader.vim" -c "Vader! test/vader/component_name.vader" -c "qall!"
   ```

3. Test manually with demo commands:
   ```vim
   :CocCommand vue.directBufferDemo
   ```

4. Update any affected documentation

## Project Conventions

1. **Naming**:
   - Lua modules use snake_case (e.g., `event_bridge.lua`)
   - TypeScript uses camelCase for variables and functions (e.g., `createDirectDemo`)
   - TypeScript uses PascalCase for classes (e.g., `VueRenderer`)
   - Component IDs should be unique and descriptive (e.g., `select_component_12345`)

2. **Event Handling**:
   - All events must be defined in the schema (`lua/vue-ui/events/schema.lua`)
   - Events should include timestamp and component ID
   - Event names follow the pattern: `component:action` (e.g., `select:opened`)
   - Event handlers should be registered in `lua/vue-ui/events/handlers.lua`

3. **Testing**:
   - All components should have Vader tests in `test/vader/`
   - Tests should cover rendering, interaction, and edge cases
   - Test files should follow the component name (e.g., `select.vader`)
   - Each test should verify component creation, rendering, events, and cleanup

4. **Component Architecture**:
   - Components should be self-contained and not rely on global state
   - Components should emit events for state changes
   - Components should implement standard methods (render, update, destroy)
   - Component configuration should be passed during creation

## Recent Architectural Changes

The project has undergone significant architectural refactoring to make it component-agnostic:

1. **Component Instance Handling**:
   - The code in `component-instance.ts` is now agnostic and can detect and implement standard methods
   - Components are dynamically loaded without hardcoded references

2. **Buffer Management**:
   - `buffer-manager.ts` now automatically adds methods to components based on their properties
   - This allows for more flexible component integration

3. **Template Compilation**:
   - `vue-template-compiler.ts` has been fixed to extract component options in an agnostic manner
   - This enables support for a wider range of Vue components

4. **Component Discovery**:
   - Added search strategies to find Vue components in multiple locations
   - This improves the flexibility of the extension

5. **API Harmonization**:
   - Corrected method calls (using `mountComponent` instead of non-existent methods)
   - Standardized the API across the codebase

These changes allow the extension to load any Vue component without requiring modifications to global files, with keyboard mappings configured dynamically based on available component methods.

## Conclusion

This project provides a powerful integration between Vue.js and Neovim through COC.nvim, offering a set of UI components and interactive features. The combination of TypeScript for core logic and Lua for Neovim integration creates a flexible and extensible system for building rich UI experiences in Neovim.

With the recent architectural refactoring, the project is now more maintainable, extensible, and component-agnostic, making it easier to add new components and features without modifying the core codebase.
