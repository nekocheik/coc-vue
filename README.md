<div align="center">

# 🔌 CoC Vue Integration

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Neovim: v0.5.0+](https://img.shields.io/badge/Neovim-v0.5.0%2B-green.svg)](https://neovim.io)
[![Vue.js: v3.x](https://img.shields.io/badge/Vue.js-v3.x-41b883.svg)](https://vuejs.org)
[![Tests: Passing](https://img.shields.io/badge/Tests-Passing-brightgreen.svg)]()

**Powerful and agnostic Vue.js integration for Neovim via coc.nvim**

<img src="https://raw.githubusercontent.com/neoclide/coc.nvim/master/doc/coc-logo.png" alt="CoC Logo" width="200"/>

*Develop Vue.js applications directly in your favorite editor with an interactive and fluid experience*

[Installation](#installation) • 
[Features](#features) • 
[Usage](#usage) • 
[Documentation](#documentation) • 
[Contributing](#contributing)

</div>

## 🚀 Vue.js in Neovim Like Never Before

Coc-Vue transforms Neovim into a true Vue.js development environment, offering an interactive and reactive experience directly in your editor. Manipulate Vue components, test their behavior, and develop faster thanks to this advanced integration.

### ✨ Key Features

- **100% Agnostic Architecture** - Works with any Vue component without specific configuration
- **Reactive System** - Real-time interaction with your Vue components
- **Dynamic Mappings** - Automatically generated based on available methods
- **Robust Testing** - Comprehensive test suite ensuring reliability and stability
- **Unified CLI** - Simple command line interface for all operations
- **Bidirectional Communication** - Seamless integration between TypeScript and Lua

## 💻 Innovative Architecture

The extension is built on a sophisticated client-server architecture with bidirectional communication between TypeScript (Node.js) and Lua (Neovim):

### Bridge Communication Protocol

At the core of coc-vue is a robust bridge that enables seamless communication between the TypeScript and Lua layers. This protocol implements the following message types:

1. **Component Management**
   - Load and initialize Vue components dynamically
   - Unload components when they're no longer needed
   - Maintain component lifecycle (mount, update, destroy)

2. **Method Invocation**
   - Call methods on Vue components from Neovim
   - Pass arguments and receive results
   - Handle asynchronous operations

3. **State Management**
   - Get and set component state
   - Update component properties
   - Synchronize state between TypeScript and Lua

4. **Event Handling**
   - Register event listeners
   - Emit events from components
   - Process user interactions

### Agnostic Component Architecture

The architecture has been completely refactored to be component-agnostic:

- **Dynamic Method Detection**: Automatically detects and implements standard component methods
- **Automatic Property Mapping**: Adds methods to components based on their properties
- **Component Discovery**: Implements multiple search strategies to find Vue components
- **Unified API**: Harmonized method calls across the codebase

This design allows the extension to work with any Vue component without requiring hardcoded references or specific configurations.

## 🧪 Testing Framework

### Comprehensive Test Suite

The project includes a robust testing framework that ensures reliability and stability. The test suite is designed to be modular, allowing developers to run specific test sections based on their needs.

### Selective Test Execution

```bash
# Run all component tests
make test-component

# Run a specific test section
./scripts/test/runners/run-component-tests.sh --section component-loading

# Run tests progressively (section by section)
./scripts/test/runners/run-component-tests.sh --progressive
```

### Available Test Sections

| Test Section | Description |
|--------------|-------------|
| `component-loading` | Tests for loading components (valid and invalid) |
| `component-state` | Tests for getting component state |
| `dropdown-control` | Tests for opening/closing the dropdown |
| `option-selection` | Tests for selecting options |
| `props-update` | Tests for updating component properties |
| `multi-select` | Tests for multi-select mode |
| `navigation` | Tests for navigating through options |
| `error-handling` | Tests for error handling |
| `cleanup` | Tests for unloading components |

## 🧩 Component Library

### Select Component

The Select component is a fully-featured dropdown selector that can be used in both single and multi-select modes. It provides a rich API for interacting with the component:

#### Core Methods

| Method | Description |
|--------|-------------|
| `open()` | Open the dropdown menu |
| `close()` | Close the dropdown menu |
| `focus_option(index)` | Focus a specific option by index |
| `focus_next_option()` | Focus the next option in the list |
| `focus_prev_option()` | Focus the previous option in the list |
| `select_option(index)` | Select an option by its index |
| `select_current_option()` | Select the currently focused option |
| `select_by_value(value)` | Select an option by its value |
| `confirm()` | Confirm the current selection |
| `cancel()` | Cancel the selection and close the menu |
| `update_options(options)` | Update the list of available options |
| `set_disabled(disabled)` | Enable or disable the component |

## 💻 Server Operations

### Starting the Command Server

The extension uses a command server to handle communication between TypeScript and Lua. To start the server:

```bash
# Start the Node.js command server
./scripts/test/runners/run-command-tests.sh --node
```

The server will start on `127.0.0.1:9999` and log all commands and responses for monitoring and debugging purposes.

### Running Command Tests

To verify that the command server is functioning correctly, you can run the command tests:

```bash
# Run the command tests against the server
make test-command

# Or directly using the script
./scripts/test/runners/run-command-tests.sh
```

This script performs the following operations:
1. Starts the command server in the background
2. Runs all the command tests against the live server
3. Displays the test results and server logs for analysis
4. Automatically cleans up the server process when done

## 🔧 Debugging

### Checking Errors in Neovim

When encountering issues with the extension, it's important to check for errors in Neovim. Use the following commands:

```vim
:messages       " Display Neovim error messages
:CocOpenLog     " Open the Coc.nvim log file
```

These commands are essential for identifying problems during test execution or development. Always check these logs if you encounter unexpected behavior.

### Common Troubleshooting

- **"Component not found" error**: Ensure that the component has been properly loaded before attempting to interact with it.
- **Server connection issues**: Verify that port 9999 is not already in use by another process.
- **Asynchronous errors**: If asynchronous operations don't complete correctly, use the `--detectOpenHandles` option with Jest to identify the issues.
- **Bridge communication failures**: Check both TypeScript and Lua logs to identify where the communication is breaking down.

## 👨‍💻 Development

The coc-vue extension is built with a modular architecture that makes it easy to extend with new components and features. The current implementation provides a stable foundation for communication between TypeScript and Lua, with a robust bridge for bidirectional messaging.

### Development Workflow

1. Clone the repository
2. Install dependencies with `npm install`
3. Make your changes to the TypeScript or Lua code
4. Build the extension with `npm run build`
5. Test your changes with `npm test`

### Adding New Components

Thanks to the agnostic architecture, adding new components is straightforward:

1. Create a new component class in `src/components/`
2. Implement the required methods and properties
3. Register the component in the component registry

No hardcoded references are needed - the extension will automatically detect and implement the component's methods.

## 📦 Installation

### Via Vim-Plug

```vim
" Add coc.nvim
Plug 'neoclide/coc.nvim', {'branch': 'release'}

" Then install the extension
:CocInstall coc-vue
```

### Manual Installation

```bash
# Navigate to your coc extensions directory
cd ~/.config/coc/extensions/

# Install the extension
npm install --global-style --ignore-scripts --no-bin-links coc-vue
```

## 🔧 Configuration

### Basic Setup

Add these lines to your `init.vim` or `.vimrc`:

```vim
" Enable coc-vue integration
let g:coc_vue_enable = 1

" Debug mode (set to 1 for verbose logging)
let g:coc_vue_debug = 0

" Recommended key mappings
nmap <silent> <leader>vc :CocCommand vue.showComponentsDemo<CR>
nmap <silent> <leader>vw :CocCommand vue.showWindowDemo<CR>
nmap <silent> <leader>ve :CocCommand vue.showEditorDemo<CR>
```

### Advanced Configuration

You can customize the behavior of specific components by adding these settings:

```vim
" Select component configuration
let g:coc_vue_select_style = 'default'
let g:coc_vue_select_max_height = 10

" Editor integration
let g:coc_vue_editor_integration = 1
```

## 💻 Using the Integrated CLI

The extension comes with a powerful command-line interface that simplifies development, testing, and debugging tasks. This unified CLI provides a consistent interface for all operations.

### Available Commands

```bash
# Get help and see all available commands
./coc-vue-cli.sh help

# Server Management
./coc-vue-cli.sh server:start      # Start the component server
./coc-vue-cli.sh server:stop       # Stop the component server
./coc-vue-cli.sh server:restart    # Restart the component server
./coc-vue-cli.sh server:status     # Check server status

# Testing
./coc-vue-cli.sh test:component                    # Run all component tests
./coc-vue-cli.sh test:component component-loading  # Run specific test section
./coc-vue-cli.sh test:bridge                       # Run bridge tests

# Logging and Debugging
./coc-vue-cli.sh logs:check server_startup  # Check logs for a specific step
./coc-vue-cli.sh logs:tail                  # Follow logs in real-time
./coc-vue-cli.sh logs:analyze               # Analyze test results
./coc-vue-cli.sh logs:clear                 # Clear all logs

# Development
./coc-vue-cli.sh dev:build      # Build the extension
./coc-vue-cli.sh dev:watch      # Watch for changes and rebuild
./coc-vue-cli.sh dev:lint       # Run linting
```

## 📂 Project Structure

The project follows a modular architecture with clear separation of concerns:

```
coc-vue/
├─ coc-vue-cli.sh            # Unified CLI for all commands
├─ config/                   # Configuration files
│   ├─ babel.config.js       # Babel configuration
│   ├─ jest.config.js        # Jest configuration
│   ├─ tsconfig.json         # TypeScript configuration
│   └─ webpack.config.js     # Webpack configuration
├─ docs/                     # Documentation
│   ├─ api/                  # API documentation
│   ├─ components/           # Component documentation
│   ├─ DOCUMENTATION.md      # User guide
│   └─ technical/            # Technical documentation
├─ logs/                     # Log file storage
├─ scripts/                   # Shell scripts
│   ├─ js/                   # JavaScript utilities
│   ├─ lua/                  # Lua integration for Neovim
│   ├─ server/               # Server management
│   ├─ setup/                # Setup scripts
│   ├─ test/                 # Test framework
│   │   ├─ core/             # Core test utilities
│   │   ├─ runners/          # Test runner scripts
│   │   └─ utils/            # Test utilities
│   ├─ utils/                # Various utilities
│   └─ vim/                  # Vim/Neovim configuration
├─ src/                      # TypeScript source code
│   ├─ bridge/               # TypeScript-Lua bridge
│   ├─ components/           # Vue component implementations
│   ├─ events/               # Event system
│   ├─ reactivity/           # Reactive state management
│   └─ index.ts              # Main entry point
├─ lua/                      # Lua source code
│   ├─ vue-ui/               # Lua-side UI components
│   ├─ bridge/               # Lua-side bridge implementation
│   └─ init.lua              # Lua entry point
└─ __tests__/                # Test suite
    ├─ integration/          # Integration tests
    ├─ unit/                 # Unit tests
    └─ mocks/                # Test mocks
```

## 🧪 Testing and Quality Assurance

The project maintains a comprehensive test suite to ensure stability, reliability, and correctness. The tests are organized into different categories for better maintainability and faster execution.

### Running Tests

You can run tests using the Makefile for a more streamlined experience:

```bash
# Run unit and integration tests
make test

# Run all tests (unit, integration, component, command, ping)
make test-all

# Run specific test categories
make test-unit
make test-integration
make test-component
make test-command
make test-ping

# Run tests with verbose output
make test VERBOSE=true

# Run tests with custom timeout
make test TIMEOUT=600

# Clean up test resources
make clean
```

Alternatively, you can use the test scripts directly:

```bash
# Run all tests
./scripts/test/run-all-tests.sh

# Run unit tests only
./scripts/test/run-all-tests.sh --unit-only

# Run with verbose logging
VERBOSE_LOGS=true ./scripts/test/run-all-tests.sh
```

### Test Categories

| Category | Description | Command |
|----------|-------------|--------|
| **Unit Tests** | Tests for individual functions and classes | `npm test` |
| **Integration Tests** | Tests for component interactions | `npm run test:integration` |
| **Bridge Tests** | Tests for TypeScript-Lua communication | `npm run test:bridge` |
| **End-to-End Tests** | Tests for complete workflows | `./coc-vue-cli.sh test:e2e` |

### Code Quality

The project uses several tools to maintain high code quality:

- **TypeScript** for static type checking
- **ESLint** for code style and quality
- **Jest** for testing
- **Webpack** for bundling

## 🔍 Debugging Guide

### In-Editor Debugging

If you encounter issues while using the extension, these Neovim commands will help you diagnose the problem:

```vim
:messages       " Display Neovim error messages
:CocOpenLog     " Open Coc.nvim log file
:CocCommand workspace.showOutput vue  " Show Vue extension output
```

### Advanced Diagnostics

The extension provides comprehensive diagnostic tools:

```bash
# Check all logs
./coc-vue-cli.sh logs:check all

# Check specific component logs
./coc-vue-cli.sh logs:check select

# Analyze recent errors
./coc-vue-cli.sh logs:analyze errors

# Generate diagnostic report
./coc-vue-cli.sh diagnostics:report

# Clean up test ports and processes
make clean
```

### Troubleshooting Common Issues

| Issue | Solution |
|-------|----------|
| Component not loading | Check that the component file exists and is properly exported |
| Bridge communication errors | Verify that both TypeScript and Lua services are running |
| Method not found | Ensure the component implements the method you're trying to call |
| Performance issues | Check the logs for slow operations and consider optimizing |

## 👥 Contributing

We welcome contributions from the community! Here's how you can help improve coc-vue:

### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/coc-vue.git`
3. Create a feature branch: `git checkout -b feature/amazing-feature`
4. Make your changes
5. Run tests: `npm test`
6. Commit your changes: `git commit -m 'feat: add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Contribution Guidelines

- Follow the existing code style and conventions
- Add tests for new features
- Update documentation for any changes
- Use semantic commit messages

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Coc-Vue** • Developed with ❤️ for the Vue.js and Neovim community

</div>
