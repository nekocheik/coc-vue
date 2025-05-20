# COC-VUE Documentation

## Overview

COC-VUE is a Vue.js integration for COC.nvim, providing UI components and interactive features for Neovim. The project combines TypeScript for the core logic and Lua for the Neovim integration components.

The architecture has been refactored to be completely component-agnostic, eliminating hardcoded references to specific components. This allows for dynamic loading of any Vue component without requiring modifications to global files. Keyboard mappings are configured dynamically based on the methods available in each component.

## Documentation Structure

This documentation is organized into several sections:

### General Documentation
- [Developer Documentation](./COC_VUE_DEVELOPER_DOCUMENTATION.md) - Comprehensive guide for developers working on the project
- [Testing](../TESTS.md) - Information about testing the project

### Component Documentation
- [Select Component Integration](./SELECT_COMPONENT_INTEGRATION.md) - Guide for integrating the Select component
- [Select Component Testing](./SELECT_COMPONENT_TESTING.md) - Guide for testing the Select component

### Technical Documentation
- [Bridge Documentation](./technical/BRIDGE_DOCUMENTATION.md) - Documentation for the TypeScript-Lua bridge
- [Bridge Protocol](./technical/BRIDGE_PROTOCOL.md) - Detailed protocol specification for the bridge
- [Reactive Component System](./technical/REACTIVE_COMPONENT_SYSTEM.md) - Documentation for the reactive component system
- [Technical Handbook](./technical/TECHNICAL_HANDBOOK.md) - Comprehensive technical reference

## Getting Started

For new users and developers, we recommend starting with the [Developer Documentation](./COC_VUE_DEVELOPER_DOCUMENTATION.md) which provides an overview of the project architecture, structure, and key components.

For those interested in specific components, the component-specific documentation provides detailed information about implementation, integration, and testing.

For in-depth technical details, refer to the technical documentation section, which provides comprehensive information about the underlying architecture and protocols.
