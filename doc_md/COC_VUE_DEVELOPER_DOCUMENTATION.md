# COC_VUE_DEVELOPER_DOCUMENTATION
**Path:** /docs/COC_VUE_DEVELOPER_DOCUMENTATION.md
**Priority:** CRITICAL
**Tags:** Documentation, Architecture, Development
**Summary:** Comprehensive developer documentation for COC-VUE, detailing its architecture, component system, TypeScript-Lua bridge, command flows, and implementation guidelines for creating new UI components.

## Sections

### Introduction and Architecture
**Priority:** CRITICAL
**Tags:** Architecture, Overview

COC-VUE integrates Vue.js with COC.nvim, providing UI components and interactive features for Neovim through a combination of TypeScript core logic and Lua integration components. The architecture has been completely refactored to be component-agnostic, eliminating hardcoded references to specific components and enabling dynamic loading of any Vue component without global file modifications. User interaction follows a seven-step flow: command triggering, TypeScript core processing, bridge communication, Lua component rendering, user interaction, event system processing, and application state updates. This design creates a flexible, extensible foundation for UI component development.

### Project Structure
**Priority:** HIGH
**Tags:** Organization, Files

The codebase organizes files into distinct directories with clear responsibilities: compiled output in dist/ and lib/, Lua modules for Neovim integration in lua/vue-ui/ (with subdirectories for components, core functionality, events, and utilities), TypeScript source code in src/ (divided into bridge, core adapters/components/controllers/services/utils, demos, renderer, types, and Vim integration), and test files in test/ (including manual scripts and Vader tests). Key files include src/index.ts (main extension entry point), src/bridge/neovim-bridge.ts (TypeScript-Neovim bridge), src/renderer/vue-renderer.ts (Vue-specific rendering), and lua/vue-ui/init.lua (Lua integration entry point).

### Core Components
**Priority:** HIGH
**Tags:** Components, Implementation

The system's architecture divides core functionality between TypeScript and Lua components. TypeScript components include: VueNeovimIntegration (extension initialization, command registration, event listeners, lifecycle management), NeovimBridge (TypeScript-Neovim communication), VueRenderer (Vue component rendering in Neovim), and GlobalBufferManager (Neovim buffer management). Lua components include the Vue UI Module (library initialization), Core Event Module (inter-component event management), Core State Module (component state validation), and Core Validation Module (configuration validation). UI components include Button (clickable interface with styles), Input (text editing with validation), Modal (dialog windows with customizable content), and Select (dropdown selection with keyboard navigation).

### TypeScript to Lua Bridge
**Priority:** CRITICAL
**Tags:** Communication, Integration

The TypeScript-Lua bridge enables bidirectional communication through two primary components: NeovimBridge in TypeScript (handling command sending, expression evaluation, and event subscription) and Event Bridge in Lua (managing event emission and reception). Communication flows in both directions: TypeScript to Lua through nvim.command() executing Lua code, and Lua to TypeScript through vim.fn['coc#rpc#request'] sending events. Events follow a structured schema defined in lua/vue-ui/events/schema.lua, with TypeScript registering handlers for these events while Lua components emit them upon state changes. This architecture enables seamless interaction between the COC extension and Neovim UI components.

### Command Registration and Execution
**Priority:** HIGH
**Tags:** Workflow, Implementation

The command flow follows a three-stage process. First, during extension activation, the activate function in src/index.ts initializes VueNeovimIntegration. Second, command registration occurs in two parallel systems: TypeScript registers commands with COC.nvim (defining command behavior in registerCommands), while Lua registers Vim user commands in lua/vue-ui/init.lua. Third, command execution flows through five sequential steps: user invocation of a COC command, TypeScript command handler execution, Neovim command execution through the bridge, Lua command reception and parsing, and component creation/rendering with event binding. This pipeline creates a seamless interface between user actions and component visualization.

### Adding New UI Components
**Priority:** HIGH
**Tags:** Development, Components

Adding new UI components follows a five-step process. First, create the component file in lua/vue-ui/components/ with required functions (create, open, close) and appropriate validation. Second, register the component in lua/vue-ui/init.lua by adding it to the returned table. Third, register a COC command in src/index.ts to invoke the component. Fourth, create TypeScript types in src/types/ for API consistency. Fifth, test the component through build verification, direct Lua testing, COC command integration validation, and command registration confirmation. This standardized approach ensures component quality and seamless integration within the existing architecture.

### Testing and Debugging
**Priority:** MEDIUM
**Tags:** Testing, Troubleshooting

The testing framework includes infrastructure for both automated and manual testing. For automated testing, use 'npm test' for all tests or run component-specific tests with specified scripts. For manual testing, follow procedures for environment preparation, component testing, and result validation. Debugging employs four key techniques: enabling debug mode to output detailed logs, checking Neovim messages for errors, examining COC logs for extension issues, and verifying component logs for state problems. Specific troubleshooting procedures target initialization failures, component rendering issues, event handling problems, and bridge communication failures. For demo components, debugging focuses on configuration validation, log analysis, and interactive testing.

### Prerequisites and Configuration
**Priority:** MEDIUM
**Tags:** Setup, Environment

Successful development requires specific prerequisites and configuration. Required dependencies include Node.js (v14+), npm (v6+), Neovim (v0.5+), COC.nvim (v0.0.82+), and basic Vim/Neovim knowledge. For local development, configure the environment by cloning the repository, installing dependencies with 'npm install', building the extension with 'npm run build', and creating symbolic links to ensure proper loading. COC configuration requires adding coc-vue to the extensions list and defining initial settings. The architecture leverages Vue.js concepts like reactivity and component lifecycle, while adhering to Vim/Neovim UI conventions including buffer management, window handling, and event processing within the editor's constraints.

