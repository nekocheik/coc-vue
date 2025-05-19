# COC-VUE Developer Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Project Structure](#project-structure)
4. [Core Components](#core-components)
5. [TypeScript to Lua Bridge](#typescript-to-lua-bridge)
6. [Command Registration and Execution Flow](#command-registration-and-execution-flow)
7. [Adding a New UI Component](#adding-a-new-ui-component)
8. [Testing](#testing)
9. [Debugging](#debugging)
10. [Running Components for Demo/Testing](#running-components-for-demotesting)
11. [Prerequisites and Configuration](#prerequisites-and-configuration)
12. [Onboarding Checklist](#onboarding-checklist)

## Introduction

COC-VUE is a Vue.js integration for COC.nvim, providing UI components and interactive features for Neovim. The project combines TypeScript for the core logic and Lua for the Neovim integration components.

The architecture has been refactored to be completely component-agnostic, eliminating hardcoded references to specific components. This allows for dynamic loading of any Vue component without requiring modifications to global files. Keyboard mappings are configured dynamically based on the methods available in each component.

## Architecture Overview

```
                                COC-VUE Architecture
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌───────────────┐     ┌───────────────┐     ┌───────────────────────┐  │
│  │  COC.nvim     │     │  TypeScript   │     │  Lua Integration      │  │
│  │  Extension    │◄───►│  Core         │◄───►│  (vue-ui)            │  │
│  └───────────────┘     └───────────────┘     └───────────────────────┘  │
│          ▲                      ▲                       ▲               │
│          │                      │                       │               │
│          ▼                      ▼                       ▼               │
│  ┌───────────────┐     ┌───────────────┐     ┌───────────────────────┐  │
│  │  Commands     │     │  Bridge       │     │  Component Registry   │  │
│  │  Registration │     │  NeovimBridge │     │  (Lua)               │  │
│  └───────────────┘     └───────────────┘     └───────────────────────┘  │
│          ▲                      ▲                       ▲               │
│          │                      │                       │               │
│          ▼                      ▼                       ▼               │
│  ┌───────────────┐     ┌───────────────┐     ┌───────────────────────┐  │
│  │  User         │     │  Event        │     │  UI Components        │  │
│  │  Interaction  │◄───►│  System       │◄───►│  (Button/Input/Select)│  │
│  └───────────────┘     └───────────────┘     └───────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Components:

1. **TypeScript Core**: Handles the main extension logic, command registration, and bridge to Neovim.
2. **Lua Integration**: Provides the UI components and event handling system.
3. **Bridge**: Facilitates communication between TypeScript and Lua/Neovim.
4. **Event System**: Enables component communication and state updates.
5. **Component Registry**: Manages UI component instances.
6. **UI Components**: Button, Input, Modal, Select components implemented in Lua.

### Data Flow:

1. User triggers a command in Neovim via COC
2. Command is processed by the TypeScript core
3. TypeScript core communicates with Lua via the Bridge
4. Lua creates and renders the appropriate UI component
5. User interacts with the component, generating events
6. Events are processed by the event system and passed back to TypeScript
7. TypeScript core updates the application state accordingly

## Project Structure

```
coc-vue/
├── dist/                  # Compiled output
├── lib/                   # Output directory for webpack build
├── lua/                   # Lua modules for Neovim integration
│   └── vue-ui/            # Main Lua module
│       ├── components/    # UI components (button, input, modal, select)
│       ├── core/          # Core functionality for components
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

### Key Files:

- **src/index.ts**: Main entry point for the COC extension
- **src/bridge/neovim-bridge.ts**: Bridge between TypeScript and Neovim
- **src/renderer/vue-renderer.ts**: Vue-specific rendering logic
- **lua/vue-ui/init.lua**: Main entry point for Lua integration
- **lua/vue-ui/components/**: UI component implementations
- **lua/vue-ui/events/schema.lua**: Event type definitions
- **lua/vue-ui/utils/event_bridge.lua**: Event emission and subscription

- [ ] Owner has validated this structure in a real COC+Neovim session.

## Core Components

### TypeScript Core Components

#### 1. VueNeovimIntegration (src/index.ts)
The main class that integrates Vue with Neovim. Responsible for:
- Initializing the extension
- Registering commands with COC.nvim
- Setting up event listeners
- Managing the lifecycle of the extension

```typescript
export class VueNeovimIntegration {
  private context: ExtensionContext;
  private renderer: VueRenderer;
  private bridge: NeovimBridge;
  private subscriptions: Disposable[] = [];
  private isInitialized = false;
  private bufferManager: GlobalBufferManager;
  
  constructor(context: ExtensionContext) {
    this.context = context;
    this.bridge = new NeovimBridge();
    this.renderer = new VueRenderer(workspace.nvim);
    this.bufferManager = GlobalBufferManager.getInstance();
    this.subscriptions.push(this.bufferManager);
  }
  
  // Methods for initialization, command registration, etc.
}
```

#### 2. NeovimBridge (src/bridge/neovim-bridge.ts)
Facilitates communication between TypeScript and Neovim:
- Sends commands to Neovim
- Evaluates Vim expressions
- Calls Neovim functions
- Manages event subscriptions

#### 3. VueRenderer (src/renderer/vue-renderer.ts)
Handles rendering Vue components in Neovim:
- Creates windows for rendering
- Renders Vue components with props
- Manages the lifecycle of Vue applications
- Registers hooks for Vue components

#### 4. GlobalBufferManager (src/vim/global-buffer-manager.ts)
Manages Neovim buffers:
- Creates and destroys buffers
- Manages buffer content
- Handles buffer events

### Lua Core Components

#### 1. Vue UI Module (lua/vue-ui/init.lua)
The main entry point for Lua integration:
- Defines highlight groups
- Registers user commands
- Initializes the UI library
- Provides access to UI components

#### 2. Core Event Module (lua/vue-ui/core/core_event.lua)
Manages events between components:
- Registers and unregisters components
- Emits component events
- Handles event data formatting

#### 3. Core State Module (lua/vue-ui/core/core_state.lua)
Manages component state:
- Validates state changes
- Ensures component state consistency
- Provides state utility functions

#### 4. Core Validation Module (lua/vue-ui/core/core_validation.lua)
Validates component configuration and input:
- Validates data types
- Ensures required fields are present
- Validates component-specific constraints

### UI Components

#### 1. Button Component (lua/vue-ui/components/button.lua)
A clickable button component:
- Supports different styles
- Handles click events
- Manages focus states

#### 2. Input Component (lua/vue-ui/components/input.lua)
A text input field:
- Supports validation
- Handles cursor movement
- Manages text editing
- Emits change and submit events

#### 3. Modal Component (lua/vue-ui/components/modal.lua)
A dialog window:
- Supports customizable content
- Manages buttons and forms
- Handles keyboard navigation

#### 4. Select Component (lua/vue-ui/components/select.lua)
A dropdown selection component:
- Supports single and multi-select modes
- Handles keyboard navigation
- Manages option selection
- Emits selection events

- [ ] Owner has validated these components in a real COC+Neovim session.

## TypeScript to Lua Bridge

The bridge between TypeScript and Lua is a critical part of the architecture, enabling seamless communication between the COC extension (TypeScript) and the Neovim UI components (Lua).

### Bridge Components

#### 1. NeovimBridge (src/bridge/neovim-bridge.ts)
The TypeScript side of the bridge:
```typescript
export class NeovimBridge {
  public nvim: any;
  private eventCallbacks: Record<string, EventHandler[]> = {};
  private eventsInitialized: boolean = false;
  
  constructor(nvim?: any) {
    this.nvim = nvim || workspace.nvim;
    this.eventCallbacks = {
      'buffer:change': [],
      'cursor:move': [],
      'mode:change': []
    };
  }
  
  // Methods for sending commands, evaluating expressions, etc.
  async sendCommand(command: string): Promise<string> {
    console.log(`[BRIDGE] Sending command: ${command}`);
    await this.nvim.command(command);
    return 'success';
  }
  
  // Event subscription
  on(event: string, callback: EventHandler): Subscription {
    // Implementation
  }
}
```

#### 2. Event Bridge (lua/vue-ui/utils/event_bridge.lua)
The Lua side of the bridge:
```lua
local M = {}

-- Configuration
local config = {
  debug = false,
  log_events = true,
  log_path = vim.fn.stdpath('data') .. '/vue-ui-events.json'
}

-- Table for storing components
local components = {}

-- Emits an event to TypeScript
function M.emit(event_name, data)
  -- Implementation
  local coc_vue
  local status, err = pcall(function()
    coc_vue = vim.fn['coc#rpc#request']('coc-vue', 'handleLuaEvent', {event_name, data})
  end)
  
  return coc_vue
end

-- Receives an event from TypeScript
function M.receive(event_name, data)
  -- Implementation
end

return M
```

### Communication Flow

1. **TypeScript to Lua**:
   - TypeScript calls `nvim.command()` to execute Lua code
   - Example: `nvim.command('lua require("vue-ui.init").select.create("id", "title", {})')`

2. **Lua to TypeScript**:
   - Lua calls `vim.fn['coc#rpc#request']` to send events to TypeScript
   - Example: `vim.fn['coc#rpc#request']('coc-vue', 'handleLuaEvent', {event_name, data})`

3. **Event Handling**:
   - Events are defined in `lua/vue-ui/events/schema.lua`
   - TypeScript registers handlers for these events
   - Lua components emit events when state changes

### Event Schema

Events are structured according to a schema defined in `lua/vue-ui/events/schema.lua`:
```lua
M.EVENT_TYPES = {
  -- General events
  COMPONENT_CREATED = "component:created",
  COMPONENT_UPDATED = "component:updated",
  COMPONENT_DESTROYED = "component:destroyed",
  
  -- Component-specific events
  SELECT_OPENED = "select:opened",
  SELECT_CLOSED = "select:closed",
  SELECT_OPTION_SELECTED = "select:option:selected",
  -- etc.
}
```

### Bridge Usage Example

1. **Creating a Select Component from TypeScript**:
```typescript
// In TypeScript
async function createSelectComponent() {
  const nvim = workspace.nvim;
  await nvim.command('VueUISelect select_demo "Select Demo" {"multi":false,"options":[{"id":"option1","text":"Option 1","value":"value1"},{"id":"option2","text":"Option 2","value":"value2"},{"id":"option3","text":"Option 3","value":"value3"}]}');
}
```

2. **Handling Events from Lua in TypeScript**:
```typescript
// In TypeScript
function handleLuaEvent(event: string, data: any) {
  if (event === 'select:option:selected') {
    console.log(`Option selected: ${data.option_text} with value: ${data.option_value}`);
    // Update application state based on selection
  }
}
```

- [ ] Owner has validated this bridge in a real COC+Neovim session.

## Command Registration and Execution Flow

The command registration and execution flow is a critical aspect of the COC-VUE extension, as it defines how commands are registered with COC.nvim and how they are executed to create and interact with UI components.

### Command Registration Process

1. **Extension Activation**:
   When COC.nvim loads the extension, it calls the `activate` function in `src/index.ts`:
   ```typescript
   export async function activate(context: ExtensionContext): Promise<any> {
     console.log('[COC-VUE] Extension activating...');
     const integration = new VueNeovimIntegration(context);
     await integration.initialize();
     return integration;
   }
   ```

2. **Command Registration in TypeScript**:
   The `VueNeovimIntegration` class registers commands with COC.nvim in its `registerCommands` method:
   ```typescript
   registerCommands() {
     try {
       console.log('[COC-VUE] Registering commands');
       
       // Register the select demo command
       this.subscriptions.push(
         commands.registerCommand('vue.selectDemo', async () => {
           try {
             console.log('[COC-VUE] Executing vue.selectDemo command');
             const nvim = workspace.nvim;
             
             // Use the VueUISelect command to create and open a Select component
             await nvim.command('VueUISelect select_demo "Select Demo" {"multi":false,"options":[{"id":"option1","text":"Option 1","value":"value1"},{"id":"option2","text":"Option 2","value":"value2"},{"id":"option3","text":"Option 3","value":"value3"}]}');
             
             console.log('[COC-VUE] Select demo launched successfully');
           } catch (error) {
             console.error('[COC-VUE] Error launching select demo:', error);
           }
         })
       );
       
       // Other commands...
     } catch (error) {
       console.error('[COC-VUE] Error registering commands:', error);
     }
   }
   ```

3. **Lua Command Registration**:
   In parallel, the Lua side registers Vim user commands in `lua/vue-ui/init.lua`:
   ```lua
   function M.define_commands()
     print('[VUE-UI] Registering user commands')
     
     -- Command for creating a Select component
     vim.api.nvim_create_user_command('VueUISelect', function(opts)
       local args = opts.args
       if not args or args == "" then
         vim.api.nvim_echo({{"[VueUI] Missing arguments for VueUISelect command", "ErrorMsg"}}, false, {})
         return
       end
       
       local parts = vim.split(args, ' ')
       local id = parts[1]
       local title = parts[2] or "Select Component"
       
       -- Parse options from the remaining arguments
       local options_str = table.concat(parts, ' ', 3)
       local options = {}
       
       if options_str and options_str ~= "" then
         local success, parsed_options = pcall(vim.fn.json_decode, options_str)
         if success then
           options = parsed_options
         end
       end
       
       -- Create and render the Select component
       local select = M.select.create(id, title, options)
       if select then
         select:open()
       end
     end, { nargs = '+' })
     
     -- Other commands...
   end
   ```

### Command Execution Flow

1. **User Triggers a COC Command**:
   The user runs a COC command in Neovim, for example:
   ```vim
   :CocCommand vue.selectDemo
   ```

2. **COC.nvim Processes the Command**:
   COC.nvim finds the registered command handler and executes it.

3. **TypeScript Handler Executes**:
   The TypeScript handler for `vue.selectDemo` is executed, which:
   - Logs the execution
   - Gets the Neovim instance
   - Executes a Neovim command to create a Select component

4. **Neovim Command Execution**:
   Neovim executes the `VueUISelect` command, which:
   - Parses the command arguments
   - Creates a Select component using the Lua API
   - Opens the component

5. **Lua Component Creation and Rendering**:
   The Lua code creates and renders the Select component:
   ```lua
   local select = M.select.create(id, title, options)
   if select then
     select:open()
   end
   ```

6. **User Interaction and Event Flow**:
   - User interacts with the component (e.g., navigates options)
   - Component emits events via the event bridge
   - TypeScript receives and processes events
   - Application state is updated accordingly

### Command Flow Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  User Input     │     │  COC.nvim       │     │  TypeScript     │
│  :CocCommand    │────►│  Command        │────►│  Command        │
│  vue.selectDemo │     │  Processor      │     │  Handler        │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Lua Component  │     │  Neovim         │     │  Neovim         │
│  Creation       │◄────│  Command        │◄────│  Command        │
│  and Rendering  │     │  Execution      │     │  Invocation     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Example: Select Component Command Flow

1. User runs `:CocCommand vue.selectDemo`
2. COC.nvim executes the registered handler for `vue.selectDemo`
3. Handler executes `nvim.command('VueUISelect select_demo "Select Demo" {...}')`
4. Neovim executes the `VueUISelect` command
5. Command handler parses arguments and calls `select.create()`
6. Select component is created and rendered
7. User interacts with the component
8. Component emits events (e.g., `select:option:selected`)
9. TypeScript receives and processes events

### Debugging Command Flow

To debug the command flow:

1. **Check Command Registration**:
   ```vim
   :CocList commands
   ```
   Verify that `vue.selectDemo` is listed.

2. **Check Vim Command Registration**:
   ```vim
   :command VueUISelect
   ```
   Verify that the `VueUISelect` command is registered.

3. **Check COC Logs**:
   ```vim
   :CocOpenLog
   ```
   Look for log messages related to command registration and execution.

4. **Enable Debug Mode in Lua**:
   ```lua
   require('vue-ui').setup({debug = true})
   ```
   This will enable verbose logging in the Lua components.

- [ ] Owner has validated this command flow in a real COC+Neovim session.

## Adding a New UI Component

This section provides a step-by-step guide for adding a new UI component (e.g., a Select component) to the COC-VUE extension. This process involves creating the Lua component, exposing it via COC commands, and testing it.

### Step 1: Create the Lua Component

1. **Create the Component File**:
   Create a new file in the `lua/vue-ui/components/` directory, e.g., `select.lua`:

   ```lua
   --- Select Component for Vue UI
   -- @module select
   -- @author Your Name
   -- @license MIT
   
   -- Dependencies
   local validation = require('vue-ui.utils.validation')
   local render_utils = require('vue-ui.utils.render')
   local event_bridge = require('vue-ui.utils.event_bridge')
   local schema = require('vue-ui.events.schema')
   
   -- Core modules
   local core_validation = require('vue-ui.core.core_validation')
   local core_state = require('vue-ui.core.core_state')
   local core_event = require('vue-ui.core.core_event')
   local core_render = require('vue-ui.core.core_render')
   
   local M = {}
   
   --- Select Class
   -- @type Select
   local Select = {}
   Select.__index = Select
   
   --- Creates a new Select instance
   -- @param config table Select configuration
   -- @return Select Created Select instance
   function Select:new(config)
     -- Validate configuration
     core_validation.validate_table(config, "Configuration must be a table")
     core_validation.validate_not_empty(config.id, "Select ID cannot be empty")
     
     -- Default configuration
     local default_config = {
       width = 30,
       options = {},
       placeholder = 'Select...',
       multi = false
     }
     
     -- Merge with provided configuration
     for k, v in pairs(default_config) do
       if config[k] == nil then
         config[k] = v
       end
     end
     
     -- Create instance
     local instance = setmetatable({
       id = config.id,
       title = config.title or "Select",
       width = config.width,
       options = config.options,
       placeholder = config.placeholder,
       multi = config.multi,
       _is_open = false,
       buffer_id = nil,
       window_id = nil,
       focused_option_index = -1,
       selected_options = {},
       component_type = 'select'
     }, Select)
     
     -- Register component with event bridge
     core_event.register_component(config.id, instance)
     
     -- Emit creation event
     core_event.emit_component_created(instance)
     
     return instance
   end
   
   --- Creates a new Select instance (Compatibility API)
   -- @param id string Select ID
   -- @param title string Select title
   -- @param config table Select configuration
   -- @return Select Created Select instance
   function M.create(id, title, config)
     config = config or {}
     config.id = id
     config.title = title
     return Select:new(config)
   end
   
   --- Opens the select component
   -- @return boolean True if opened successfully
   function Select:open()
     if self._is_open then
       return true
     end
     
     -- Create buffer and window
     local result = core_render.create_component_window(self)
     if not result then
       return false
     end
     
     self.buffer_id = result.buffer_id
     self.window_id = result.window_id
     self._is_open = true
     
     -- Render the component
     self:render()
     
     -- Set up keymaps
     self:setup_keymaps()
     
     -- Emit opened event
     core_event.emit_select_opened(self)
     
     return true
   end
   
   --- Renders the select component
   -- @return table Render result
   function Select:render()
     -- Implementation details
     -- This would render the component in the buffer
   end
   
   --- Sets up keymaps for the component
   function Select:setup_keymaps()
     -- Set up keymaps for navigation and selection
   end
   
   -- Add more methods as needed
   
   return M
   ```

2. **Update Event Schema**:
   Add any new event types to `lua/vue-ui/events/schema.lua`:

   ```lua
   -- Add to M.EVENT_TYPES
   SELECT_OPENED = "select:opened",
   SELECT_CLOSED = "select:closed",
   SELECT_OPTION_SELECTED = "select:option:selected",
   ```

3. **Register the Component in init.lua**:
   Update `lua/vue-ui/init.lua` to include your new component:

   ```lua
   -- Add to the M table initialization
   M.select = require('vue-ui.components.select')
   
   -- Add to the define_commands function
   vim.api.nvim_create_user_command('VueUISelect', function(opts)
     -- Command implementation
   end, { nargs = '+' })
   ```

### Step 2: Create the TypeScript Integration

1. **Register a COC Command**:
   In `src/index.ts`, add a new command to the `registerCommands` method:

   ```typescript
   // Register the select demo command
   this.subscriptions.push(
     commands.registerCommand('vue.selectDemo', async () => {
       try {
         console.log('[COC-VUE] Executing vue.selectDemo command');
         const nvim = workspace.nvim;
         
         // Use the VueUISelect command to create and open a Select component
         await nvim.command('VueUISelect select_demo "Select Demo" {"multi":false,"options":[{"id":"option1","text":"Option 1","value":"value1"},{"id":"option2","text":"Option 2","value":"value2"},{"id":"option3","text":"Option 3","value":"value3"}]}');
         
         console.log('[COC-VUE] Select demo launched successfully');
       } catch (error) {
         console.error('[COC-VUE] Error launching select demo:', error);
       }
     })
   );
   ```

2. **Add Command to package.json**:
   Update `package.json` to include the new command:

   ```json
   "contributes": {
     "commands": [
       {
         "command": "vue.selectDemo",
         "title": "Vue: Show Select Demo"
       }
     ]
   }
   ```

3. **Add Event Handling**:
   In `src/index.ts`, add event handling for the component:

   ```typescript
   async setupEventListeners() {
     // Add handler for select events
     this.bridge.on('select:option:selected', (data) => {
       console.log(`[COC-VUE] Select option selected: ${data.option_text}`);
       // Handle the selection
     });
   }
   ```

### Step 3: Test the Component

1. **Build the Extension**:
   ```bash
   npm run build
   ```

2. **Test the Lua Component Directly**:
   Create a test script in `test_select.lua`:

   ```lua
   -- Test script for Select component
   local function test_select()
     -- Load the vue-ui module
     local vue_ui = require('vue-ui.init')
     
     -- Create a test select configuration
     local config = {
       multi = false,
       options = {
         { id = "option1", text = "Option 1", value = "value1" },
         { id = "option2", text = "Option 2", value = "value2" },
         { id = "option3", text = "Option 3", value = "value3" }
       }
     }
     
     -- Create and open the select component
     local select = vue_ui.select.create("test_select", "Select Demo", config)
     if select then
       print("SUCCESS: Select component created")
       select:open()
       print("SUCCESS: Select component opened")
       return true
     else
       print("ERROR: Failed to create Select component")
       return false
     end
   end
   
   -- Run the test
   return test_select()
   ```

3. **Test the COC Command Integration**:
   In Neovim, run:
   ```vim
   :CocCommand vue.selectDemo
   ```

4. **Verify Command Registration**:
   ```vim
   :CocList commands
   ```
   Check that `vue.selectDemo` is listed.

5. **Create an Integration Test**:
   Create a test script in `verify_integration.vim`:

   ```vim
   " Test script for verifying component integration
   function! TestCommandExecution()
     try
       execute 'CocCommand vue.selectDemo'
       echo "SUCCESS: Command executed successfully"
       return 1
     catch
       echo "ERROR: Command execution failed: " . v:exception
       return 0
     endtry
   endfunction
   
   call TestCommandExecution()
   ```

### Step 4: Document the Component

1. **Add Component Documentation**:
   Create a markdown file in `docs/` to document the component:

   ```markdown
   # Select Component
   
   The Select component provides a dropdown selection interface in Neovim.
   
   ## Usage
   
   ```vim
   :VueUISelect id "Title" {"multi":false,"options":[{"id":"option1","text":"Option 1","value":"value1"}]}
   ```
   
   ## Configuration Options
   
   - `multi`: Boolean, enables multi-select mode
   - `options`: Array of option objects with `id`, `text`, and `value` properties
   - `placeholder`: String, placeholder text when no option is selected
   
   ## Events
   
   - `select:opened`: Emitted when the select is opened
   - `select:closed`: Emitted when the select is closed
   - `select:option:selected`: Emitted when an option is selected
   ```

2. **Update Technical Handbook**:
   Add the new component to the technical handbook.

### Complete Example: Adding a Select Component

Here's a complete workflow for adding a Select component:

1. **Create the Component**:
   - Create `lua/vue-ui/components/select.lua` with the Select implementation
   - Add event types to `lua/vue-ui/events/schema.lua`
   - Register the component in `lua/vue-ui/init.lua`

2. **Integrate with TypeScript**:
   - Add a command in `src/index.ts`
   - Register the command in `package.json`
   - Add event handling in `src/index.ts`

3. **Test the Component**:
   - Build the extension
   - Test the Lua component directly
   - Test the COC command integration
   - Verify command registration

4. **Document the Component**:
   - Create component documentation
   - Update the technical handbook

5. **Verify Integration**:
   - Run the integration test script
   - Test in a real Neovim session

By following these steps, you can successfully add a new UI component to the COC-VUE extension and make it available through COC commands.

- [ ] Owner has validated this component creation process in a real COC+Neovim session.

## Testing

The COC-VUE extension includes a comprehensive testing suite for both TypeScript and Lua components. This section explains how to run tests and interpret the results.

### TypeScript Tests

TypeScript tests use Jest and are located in the `test/` directory.

#### Running TypeScript Tests

1. **Run All Tests**:
   ```bash
   npm test
   ```

2. **Run Tests in Watch Mode**:
   ```bash
   npm run test:watch
   ```

3. **Run Specific Test Files**:
   ```bash
   npx jest test/bridge/neovim-bridge.test.ts
   ```

4. **Run Tests with Coverage**:
   ```bash
   npx jest --coverage
   ```
   Coverage reports are generated in the `coverage/` directory.

#### Test Structure

TypeScript tests follow the Jest testing pattern:

```typescript
describe('NeovimBridge', () => {
  let bridge: NeovimBridge;
  let mockNvim: any;
  
  beforeEach(() => {
    mockNvim = {
      command: jest.fn(),
      eval: jest.fn(),
      call: jest.fn()
    };
    bridge = new NeovimBridge(mockNvim);
  });
  
  test('should send commands to nvim', async () => {
    await bridge.sendCommand('echo "hello"');
    expect(mockNvim.command).toHaveBeenCalledWith('echo "hello"');
  });
});
```

### Lua Component Tests

Lua component tests use a combination of direct Lua testing and Vader.vim for integration testing.

#### Running Lua Tests

1. **Run Direct Lua Tests**:
   ```bash
   nvim -u NORC -c "luafile test_select.lua"
   ```

2. **Run Interactive Tests**:
   ```bash
   nvim -u NORC -c "luafile test_select_interactive.lua"
   ```

3. **Run TypeScript Integration Tests**:
   ```bash
   nvim -u NORC -c "luafile test_typescript_integration.lua"
   ```

#### Vader Tests

Vader tests are used for more comprehensive testing of Lua components:

1. **Run Vader Tests**:
   ```bash
   nvim -u NORC -N --headless -c "set rtp+=./test,vader.vim" -c "Vader! test/vader/select.vader" -c "qall!"
   ```

2. **Run All Vader Tests**:
   ```bash
   nvim -u NORC -N --headless -c "set rtp+=./test,vader.vim" -c "Vader! test/vader/*.vader" -c "qall!"
   ```

#### Vader Test Structure

Vader tests use a specific format:

```vader
Given (Test Environment Setup):
  " Setup code

Execute (Component Creation):
  lua require('vue-ui').setup({debug = true})
  lua local select = require('vue-ui').select.create("test_select", "Test Select", {multi=false})

Expect (Component Created):
  lua assert(select ~= nil, "Select component should be created")

Execute (Open Component):
  lua select:open()

Expect (Component Opened):
  lua assert(select._is_open == true, "Select should be open")
```

### Integration Tests

Integration tests verify that the TypeScript and Lua components work together correctly.

#### Running Integration Tests

1. **Run Verification Script**:
   ```bash
   ./verify_real_integration.sh
   ```
   This script starts Neovim and tests the COC command integration.

2. **Run Minimal COC Test**:
   ```bash
   ./minimal_coc_test.sh
   ```
   This script verifies that the COC command is registered and can be executed.

3. **Manual Integration Test**:
   ```vim
   :source verify_integration.vim
   ```
   This script tests the component integration within a running Neovim instance.

### Interpreting Test Results

#### TypeScript Test Results

Jest test results show passed and failed tests with detailed error messages:

```
PASS  test/bridge/neovim-bridge.test.ts
  NeovimBridge
    ✓ should send commands to nvim (5ms)
    ✓ should evaluate expressions (1ms)
    ✓ should call methods with arguments (1ms)
    ✓ should subscribe to events (1ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
Snapshots:   0 total
Time:        1.5s
```

#### Lua Test Results

Lua test results are output to the console and log files:

```
Module loading: SUCCESS - vue-ui.init loaded successfully
Select module: SUCCESS - Select module is available
Select creation: SUCCESS - Select component created via Lua API
Select opening: SUCCESS - Select component opened successfully
Select state: SUCCESS - Select component reports it is open
```

#### Integration Test Results

Integration test results are displayed in Neovim and saved to log files:

```
=== COC-VUE Select Component Real Integration Test ===
Date: Mon May 19 14:45:03 CEST 2025

Waiting for COC to be ready...
COC is ready. Restarting COC...
Checking COC extensions...
Checking runtime path...
Checking loaded scripts...
Checking available COC commands...
Checking for vue.selectDemo command...
SUCCESS: vue.selectDemo command is registered
Attempting to execute vue.selectDemo...
Command executed successfully
```

- [ ] Owner has validated these testing procedures in a real COC+Neovim session.

## Debugging

Debugging the COC-VUE extension involves tracing issues between TypeScript and Lua components. This section provides guidance on debugging techniques.

### TypeScript Debugging

#### Console Logging

The TypeScript code includes extensive console logging. These logs can be viewed in the COC log:

```vim
:CocOpenLog
```

Look for entries with the `[COC-VUE]` prefix.

#### Enabling Debug Mode

You can enable more verbose logging by setting the debug flag in the TypeScript code:

```typescript
// In src/index.ts
private debug = true;
```

This will output additional debugging information to the COC log.

#### Inspecting State

You can inspect the state of the TypeScript components using the COC command interface:

```vim
:CocCommand workspace.showState
```

This will show the current state of the COC extension, including registered commands and active components.

### Lua Debugging

#### Lua Logging

The Lua code includes logging functions that output to Neovim's echo area and log files.

1. **Enable Debug Mode**:
   ```lua
   require('vue-ui').setup({debug = true})
   ```

2. **View Echo Messages**:
   Debug messages are displayed in Neovim's echo area. You can also use:
   ```vim
   :messages
   ```
   to view recent messages.

3. **Check Log Files**:
   Lua event logs are saved to:
   ```
   ~/.local/share/nvim/vue-ui-events.json
   ```

#### Inspecting Lua State

You can inspect the state of Lua components using Lua commands:

```vim
:lua print(vim.inspect(require('vue-ui.utils.event_bridge').get_component('select_demo')))
```

This will print the current state of the specified component.

### Bridge Debugging

Debugging issues in the TypeScript-Lua bridge requires tracing the flow of commands and events.

#### Command Tracing

1. **Trace TypeScript Commands**:
   ```typescript
   console.log(`[BRIDGE] Sending command: ${command}`);
   await this.nvim.command(command);
   ```

2. **Trace Lua Command Execution**:
   ```lua
   vim.api.nvim_echo({{'[VueUI] Executing command: ' .. command, 'WarningMsg'}}, false, {})
   ```

#### Event Tracing

1. **Enable Event Logging**:
   ```lua
   local config = {
     debug = true,
     log_events = true,
     log_path = vim.fn.stdpath('data') .. '/vue-ui-events.json'
   }
   ```

2. **View Event Log**:
   ```bash
   cat ~/.local/share/nvim/vue-ui-events.json | jq
   ```

3. **Trace Event Flow**:
   - Lua emits events via `event_bridge.emit()`
   - TypeScript receives events via the event handler
   - TypeScript processes events and updates state

### Common Issues and Solutions

#### 1. Command Not Found

**Symptoms**:
- Error: `Command not found: vue.selectDemo`

**Debugging Steps**:
1. Check if the command is registered:
   ```vim
   :CocList commands
   ```
2. Verify extension activation:
   ```vim
   :CocList extensions
   ```
3. Check COC logs for activation errors:
   ```vim
   :CocOpenLog
   ```

**Solution**:
- Ensure the extension is properly built and linked
- Check that the command is registered in `package.json`
- Verify that the `activate` function is being called

#### 2. Lua Component Not Rendering

**Symptoms**:
- No visible component appears
- No errors in COC log

**Debugging Steps**:
1. Check if the Lua module is loaded:
   ```vim
   :lua print(require('vue-ui') ~= nil)
   ```
2. Verify component creation:
   ```vim
   :lua print(require('vue-ui.utils.event_bridge').get_component('select_demo') ~= nil)
   ```
3. Check for buffer and window creation errors:
   ```vim
   :lua print(vim.inspect(require('vue-ui.core.core_render').get_last_error()))
   ```

**Solution**:
- Ensure the Lua module is in the runtime path
- Check for errors in component creation
- Verify that the buffer and window are created correctly

#### 3. Event Bridge Issues

**Symptoms**:
- Components created but not responding to events
- TypeScript not receiving events from Lua

**Debugging Steps**:
1. Check event emission in Lua:
   ```lua
   local result = event_bridge.emit('select:option:selected', { id = 'select_demo', option_id = 'option1' })
   print(vim.inspect(result))
   ```
2. Verify event subscription in TypeScript:
   ```typescript
   this.bridge.on('select:option:selected', (data) => {
     console.log(`[DEBUG] Event received: ${JSON.stringify(data)}`);
   });
   ```
3. Check COC RPC communication:
   ```vim
   :CocCommand workspace.showOutput coc-rpc
   ```

**Solution**:
- Ensure events are properly defined in the schema
- Verify that the event bridge is initialized
- Check for errors in the COC RPC communication

- [ ] Owner has validated these debugging procedures in a real COC+Neovim session.

## Running Components for Demo/Testing

The COC-VUE extension provides several ways to launch and test UI components. This section explains how to run components for demonstration and testing purposes.

### Running Demo Commands

The extension includes several demo commands that can be used to launch UI components:

1. **Select Component Demo**:
   ```vim
   :CocCommand vue.selectDemo
   ```
   This command launches a Select component with sample options.

2. **Direct Buffer Demo**:
   ```vim
   :CocCommand vue.directBufferDemo
   ```
   This command demonstrates a simple buffer-based UI.

3. **Enhanced Input Demo**:
   ```vim
   :CocCommand vue.enhancedInputDemo
   ```
   This command demonstrates advanced input field functionality.

4. **Form Demos**:
   ```vim
   :CocCommand vue.simpleFormDemo
   :CocCommand vue.basicFormDemo
   ```
   These commands demonstrate form implementations with different complexity levels.

### Running Components Directly

You can also create and run UI components directly using Vim commands:

1. **Create a Button**:
   ```vim
   :VueUIButton button_id "Button Label" {"style":"primary"}
   ```

2. **Create an Input Field**:
   ```vim
   :VueUIInput input_id "Input Label" {"placeholder":"Enter text here"}
   ```

3. **Create a Modal**:
   ```vim
   :VueUIModal modal_id "Modal Title" {"content":"Modal content","buttons":[{"id":"ok","text":"OK"},{"id":"cancel","text":"Cancel"}]}
   ```

4. **Create a Select Component**:
   ```vim
   :VueUISelect select_id "Select Title" {"multi":false,"options":[{"id":"option1","text":"Option 1","value":"value1"},{"id":"option2","text":"Option 2","value":"value2"}]}
   ```

### Running Test Scripts

The extension includes several test scripts that can be used to test components:

1. **Basic Select Test**:
   ```bash
   nvim -u NORC -c "luafile test_select.lua"
   ```
   This script creates and opens a Select component.

2. **Interactive Select Test**:
   ```bash
   nvim -u NORC -c "luafile test_select_interactive.lua"
   ```
   This script tests various interactions with a Select component.

3. **TypeScript Integration Test**:
   ```bash
   nvim -u NORC -c "luafile test_typescript_integration.lua"
   ```
   This script tests the integration between TypeScript and Lua.

### Running Integration Verification

The extension includes scripts to verify the integration between COC.nvim and the UI components:

1. **Verify Real Integration**:
   ```bash
   ./verify_real_integration.sh
   ```
   This script starts Neovim and verifies that the COC command is registered and can be executed.

2. **Minimal COC Test**:
   ```bash
   ./minimal_coc_test.sh
   ```
   This script performs a minimal test of the COC command integration.

3. **Integration Verification in Neovim**:
   ```vim
   :source verify_integration.vim
   ```
   This script verifies the integration within a running Neovim instance.

### Creating Custom Demo Instances

You can create custom demo instances by combining the above methods:

1. **Create a Custom Select Demo**:
   ```vim
   :VueUISelect custom_select "Custom Select" {"multi":true,"options":[{"id":"custom1","text":"Custom Option 1","value":"custom1"},{"id":"custom2","text":"Custom Option 2","value":"custom2"}]}
   ```

2. **Create a Custom Form**:
   ```lua
   -- In a Lua file or directly in Neovim
   local vue_ui = require('vue-ui.init')
   
   -- Create a modal with a form
   local modal = vue_ui.modal.create("custom_form", "Custom Form", {
     width = 40,
     content = "Please fill out the form:",
     buttons = {
       { id = "submit", text = "Submit" },
       { id = "cancel", text = "Cancel" }
     }
   })
   
   -- Add input fields to the modal
   local name_input = vue_ui.input.create("name_input", "Name", {
     placeholder = "Enter your name",
     required = true
   })
   
   local email_input = vue_ui.input.create("email_input", "Email", {
     placeholder = "Enter your email",
     validation = "email"
   })
   
   -- Add the inputs to the modal
   modal:add_component(name_input)
   modal:add_component(email_input)
   
   -- Open the modal
   modal:open()
   ```

### Keyboard Interaction

Once a component is open, you can interact with it using keyboard shortcuts:

1. **Select Component**:
   - `j` or `Down`: Move focus to the next option
   - `k` or `Up`: Move focus to the previous option
   - `Enter`: Select the focused option
   - `Space`: Toggle selection (in multi-select mode)
   - `Esc`: Close the Select component

2. **Input Component**:
   - `Enter`: Submit the input
   - `Esc`: Cancel the input
   - Arrow keys: Navigate within the input field

3. **Modal Component**:
   - `Tab`: Navigate between components
   - `Enter`: Activate the focused button
   - `Esc`: Close the modal

### Debugging Demo Components

If a demo component doesn't work as expected, you can debug it using the techniques described in the Debugging section:

1. **Enable Debug Mode**:
   ```lua
   require('vue-ui').setup({debug = true})
   ```

2. **Check Component State**:
   ```vim
   :lua print(vim.inspect(require('vue-ui.utils.event_bridge').get_component('select_demo')))
   ```

3. **Check COC Logs**:
   ```vim
   :CocOpenLog
   ```

- [ ] Owner has validated these component running procedures in a real COC+Neovim session.

## Prerequisites and Configuration

This section outlines the prerequisites for developing and using the COC-VUE extension, as well as configuration options.

### Prerequisites

#### Development Prerequisites

1. **Node.js and npm**:
   - Node.js v14.x or higher
   - npm v6.x or higher

2. **Neovim**:
   - Neovim v0.5.0 or higher
   - COC.nvim extension v0.0.80 or higher

3. **Development Tools**:
   - TypeScript
   - Webpack
   - Jest for testing

4. **Optional Tools**:
   - Vader.vim for Lua component testing
   - jq for JSON processing

#### Runtime Prerequisites

1. **Neovim**:
   - Neovim v0.5.0 or higher
   - Lua support enabled

2. **COC.nvim**:
   - COC.nvim extension v0.0.80 or higher
   - Properly configured in Neovim

3. **Runtime Path**:
   - The extension must be in Neovim's runtime path

### Installation

#### Development Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/coc-vue.git
   cd coc-vue
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Build the Extension**:
   ```bash
   npm run build
   ```

4. **Link the Extension to COC.nvim**:
   ```bash
   cd ~/.config/coc/extensions
   ln -s /path/to/coc-vue .
   ```

#### User Installation

1. **Install via COC Extensions**:
   ```vim
   :CocInstall coc-vue
   ```

2. **Manual Installation**:
   ```bash
   cd ~/.config/coc/extensions
   npm install coc-vue
   ```

### Configuration

#### Extension Configuration

The extension can be configured in COC settings:

```json
{
  "vue.showWindowManager": true,
  "vue.enableEditorIntegration": true
}
```

These settings can be modified in your COC configuration file (`~/.config/nvim/coc-settings.json`) or using the `:CocConfig` command.

#### Lua Module Configuration

The Lua module can be configured when it's loaded:

```lua
require('vue-ui').setup({
  debug = false,
  log_events = true,
  log_path = vim.fn.stdpath('data') .. '/vue-ui-events.json',
  highlight_groups = {
    default = { fg = "Normal", bg = "Normal" },
    primary = { fg = "Function", bg = "Normal" },
    success = { fg = "String", bg = "Normal" },
    warning = { fg = "WarningMsg", bg = "Normal" },
    danger = { fg = "ErrorMsg", bg = "Normal" },
    focused = { fg = "Search", bg = "Normal" },
    disabled = { fg = "Comment", bg = "Normal" }
  }
})
```

#### Runtime Path Configuration

To ensure the extension is in Neovim's runtime path, you can add it explicitly:

```vim
" In your init.vim or init.lua
let &runtimepath .= ',' . expand('~/.config/coc/extensions/node_modules/coc-vue')
```

### Build Configuration

#### Webpack Configuration

The extension uses Webpack for building. The configuration is in `webpack.config.js`:

```javascript
module.exports = {
  entry: './src/index.ts',
  target: 'node',
  mode: 'none',
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: 'index.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    'coc.nvim': 'commonjs coc.nvim'
  }
};
```

#### TypeScript Configuration

TypeScript configuration is in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2018",
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "lib",
    "rootDir": "src",
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
```

#### Jest Configuration

Jest configuration is in `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage'
};
```

### Runtime Details

#### Component Lifecycle

1. **Initialization**:
   - COC.nvim loads the extension
   - The extension registers commands
   - The Lua module is loaded

2. **Component Creation**:
   - A command creates a component
   - The component is registered with the event bridge
   - The component is rendered

3. **Component Interaction**:
   - User interacts with the component
   - Events are emitted
   - State is updated

4. **Component Destruction**:
   - Component is closed
   - Resources are released
   - Events are emitted

#### Memory Management

The extension manages memory in several ways:

1. **Buffer Management**:
   - Buffers are created for components
   - Buffers are destroyed when components are closed

2. **Event Cleanup**:
   - Event subscriptions are cleaned up
   - Components are unregistered from the event bridge

3. **Disposables**:
   - TypeScript uses disposables for resource management
   - Disposables are cleaned up when the extension is deactivated

- [ ] Owner has validated these prerequisites and configuration details in a real COC+Neovim session.

## Onboarding Checklist

This checklist is designed for new developers joining the project or for transferring project leadership. It covers all essential aspects of the COC-VUE extension.

### Development Environment Setup

- [ ] Clone the repository
  ```bash
  git clone https://github.com/your-username/coc-vue.git
  cd coc-vue
  ```

- [ ] Install dependencies
  ```bash
  npm install
  ```

- [ ] Build the extension
  ```bash
  npm run build
  ```

- [ ] Link the extension to COC.nvim
  ```bash
  cd ~/.config/coc/extensions
  ln -s /path/to/coc-vue .
  ```

- [ ] Verify the extension is loaded
  ```vim
  :CocList extensions
  ```

- [ ] Owner has validated this development environment setup in a real COC+Neovim session.

### Project Structure Understanding

- [ ] Review the project structure
  - TypeScript core (`src/`)
  - Lua integration (`lua/vue-ui/`)
  - Tests (`test/`)

- [ ] Understand the architecture
  - TypeScript to Lua bridge
  - Event system
  - Component registry

- [ ] Review the core components
  - VueNeovimIntegration
  - NeovimBridge
  - VueRenderer
  - UI components (Button, Input, Modal, Select)

- [ ] Owner has validated this project structure understanding in a real COC+Neovim session.

### Command and Event Flow

- [ ] Understand the command registration process
  - TypeScript command registration
  - Lua command registration

- [ ] Understand the command execution flow
  - User triggers a command
  - COC.nvim processes the command
  - TypeScript handler executes
  - Lua component is created and rendered

- [ ] Understand the event flow
  - Component emits events
  - Events are processed by the event bridge
  - TypeScript receives and handles events

- [ ] Owner has validated this command and event flow understanding in a real COC+Neovim session.

### Component Development

- [ ] Create a simple component
  - Create a Lua component file
  - Register the component in `init.lua`
  - Add TypeScript integration

- [ ] Test the component
  - Test the Lua component directly
  - Test the TypeScript integration
  - Verify the component works in Neovim

- [ ] Document the component
  - Add component documentation
  - Update the technical handbook

- [ ] Owner has validated this component development process in a real COC+Neovim session.

### Testing and Debugging

- [ ] Run TypeScript tests
  ```bash
  npm test
  ```

- [ ] Run Lua component tests
  ```bash
  nvim -u NORC -c "luafile test_select.lua"
  ```

- [ ] Run integration tests
  ```bash
  ./verify_real_integration.sh
  ```

- [ ] Debug a component
  - Enable debug mode
  - Check component state
  - Check COC logs

- [ ] Owner has validated these testing and debugging procedures in a real COC+Neovim session.

### Project Maintenance

- [ ] Understand the build process
  - Webpack configuration
  - TypeScript configuration
  - Jest configuration

- [ ] Understand the release process
  - Version bumping
  - Publishing to npm
  - Documentation updates

- [ ] Understand the contribution process
  - Code style and conventions
  - Pull request process
  - Code review process

- [ ] Owner has validated this project maintenance understanding in a real COC+Neovim session.

### Knowledge Transfer

- [ ] Review all documentation
  - Technical handbook
  - Component documentation
  - Code comments

- [ ] Understand the project history
  - Recent architectural changes
  - Component refactoring
  - API harmonization

- [ ] Identify key stakeholders
  - Project maintainers
  - Contributors
  - Users

- [ ] Owner has validated this knowledge transfer process in a real COC+Neovim session.

### Final Verification

- [ ] Run all tests
  - TypeScript tests
  - Lua component tests
  - Integration tests

- [ ] Verify all components work
  - Button
  - Input
  - Modal
  - Select

- [ ] Verify all commands work
  - `vue.selectDemo`
  - `vue.directBufferDemo`
  - Other demo commands

- [ ] Owner has validated this final verification process in a real COC+Neovim session.
