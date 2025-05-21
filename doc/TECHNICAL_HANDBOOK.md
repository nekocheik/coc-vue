# TECHNICAL_HANDBOOK
**Path:** /docs/technical/TECHNICAL_HANDBOOK.md
**Priority:** HIGH
**Tags:** Technical, Documentation, Architecture
**Summary:** Comprehensive technical handbook for the COC-VUE extension, detailing project structure, components, build processes, testing methods, and development workflows.

## Sections

### Overview and Project Structure
**Priority:** HIGH
**Tags:** Architecture, Structure

COC-VUE provides Vue.js integration for COC.nvim with UI components and interactive features for Neovim. The architecture has been refactored to be completely component-agnostic, eliminating hardcoded references and enabling dynamic component loading without global file modifications. The project is organized into multiple specialized directories: dist/ and lib/ for compiled output, lua/vue-ui/ for Neovim integration (with components, events, and utilities subdirectories), src/ for TypeScript source (containing bridge, core, demos, renderer, types, and vim integration), and test/ for verification (including manual and Vader components tests). This structure creates clear separation between TypeScript core logic and Lua integration components.

### Prerequisites and Build Process
**Priority:** MEDIUM
**Tags:** Setup, Build

The system requires Node.js (v14+), npm (v6+), Neovim (v0.5.0+), COC.nvim extension (v0.0.80+), and Vader.vim for testing. Installation follows a five-step process: repository cloning, dependency installation with npm install, project building with npm run build (compiling TypeScript to the lib directory), extension linking to COC.nvim's extensions directory, and installation verification through :CocList extensions. Development mode with hot reloading can be enabled through npm run watch. This streamlined setup process ensures consistent development environments while maintaining compatibility with the required Neovim ecosystem.

### Testing Framework
**Priority:** HIGH
**Tags:** Testing, Verification

The testing infrastructure incorporates multiple frameworks for comprehensive validation. JavaScript/TypeScript components are tested through Jest with npm test for all tests or npm run test:watch for continuous testing during development. Lua UI components are verified through Vader.vim tests, which can be run individually for specific components (select, button, modal) or collectively for all components. Manual testing is enabled through demonstration commands like vue.directBufferDemo, vue.enhancedInputDemo, vue.simpleFormDemo, and vue.basicFormDemo. The Vader tests are also integrated into the CI/CD pipeline through scripts/run-vader-tests.sh, which generates detailed JSON and HTML reports and is incorporated into the GitHub Actions workflow.

### Components and Modules
**Priority:** CRITICAL
**Tags:** Components, Implementation

The system implements multiple UI components and core modules. Lua UI components include Button (with styles and click handling), Input (supporting validation and text editing), Modal (providing customizable dialog windows), Select (offering dropdown functionality with selection modes), and Registry (managing component instances). Core TypeScript modules include Bridge (facilitating TypeScript-Neovim communication), Renderer (handling UI component display), Core Services (managing buffers and focus), Core Adapters (providing standardized Neovim interfaces), Core Components (implementing input fields), and Demo Implementations (showcasing usage patterns). This component ecosystem delivers a comprehensive UI toolkit for Neovim applications.

### Event System and Command Integration
**Priority:** MEDIUM
**Tags:** Events, Commands

The event-driven architecture consists of three key components: Event Schema defining system event types, Event Bridge handling emission and subscription, and Event Handlers processing events and triggering actions. Command integration registers multiple demos with COC.nvim: Direct Buffer Demo for basic functionality, Enhanced Input Demo with advanced input fields, and Form Demos for form implementations. This event system creates a reactive environment where components communicate through structured events while maintaining clear separation between event definition, transmission, and handling.

### Troubleshooting and Debugging
**Priority:** MEDIUM
**Tags:** Debugging, Maintenance

Three primary debugging tools are available: Event Logs containing detailed event information at ~/.local/share/nvim/ui_events_*.json, COC.nvim Logs accessible through :CocOpenLog, and Debug Mode enabling verbose output with require('vue-ui').setup({debug = true}). Common issues include component rendering failures (requiring unique IDs and log checking), event handling problems (necessitating schema and subscription verification), and build failures (requiring dependency and TypeScript error verification). These diagnostic approaches enable systematic identification and resolution of problems during development and production use.

### Development Workflow
**Priority:** HIGH
**Tags:** Development, Workflow

Adding new components follows a five-step workflow: creating Lua implementation in lua/vue-ui/components/, registering the component in lua/vue-ui/init.lua, creating Vader tests in test/vader/, adding necessary event types in the schema, and updating documentation. Modifying existing components requires implementation changes, Vader test execution, manual testing with demo commands, and documentation updates. Project conventions establish consistent naming (snake_case for Lua, camelCase/PascalCase for TypeScript), event handling patterns (defined in schema with timestamp and component ID), testing requirements (Vader tests covering rendering, interaction, edge cases), and component architecture principles (self-contained design, event emission, standard methods).

### Recent Architectural Changes
**Priority:** HIGH
**Tags:** Architecture, Refactoring

The project has undergone significant architectural refactoring with five major improvements: Component Instance Handling now detects and implements standard methods dynamically, Buffer Management automatically adds methods based on component properties, Template Compilation extracts component options agnostically, Component Discovery implements search strategies for multiple locations, and API Harmonization standardizes method calls throughout the codebase. These changes enable loading any Vue component without global file modifications while dynamically configuring keyboard mappings based on available methods, creating a more maintainable, extensible, and component-agnostic system.

