# CONTEXT_documentation
**Path:** /doc/CONTEXT_documentation.yml
**Priority:** HIGH
**Tags:** Context, documentation
**Summary:** This file contains sections from all documents related to the context 'documentation'.

## Sections

### Overview
**Priority:** HIGH
**Tags:** documentation, Protocol, Bridge
**Source:** BRIDGE_PROTOCOL

Priority: HIGH Tags: Protocol, Bridge
The Vue-to-Lua Bridge establishes a generic, component-agnostic communication layer between TypeScript running in COC.nvim and Lua executing in Neovim. This architectural approach creates a standardized foundation for component development that maintains clear separation between the communication mechanism and component-specific implementations. The protocol documentation details message formats, categorization, usage patterns, and implementation examples necessary for developers to create new components that leverage this bridge infrastructure.

### Introduction
**Priority:** MEDIUM
**Tags:** documentation, CI/CD, Documentation
**Source:** CI_CD_INTEGRATION

Priority: MEDIUM Tags: CI/CD, Documentation
The coc-vue project implements multiple continuous integration systems to maintain code quality and automate testing processes. These systems provide four key benefits: automated test execution triggered on each commit, verification of environment compatibility across different systems, comprehensive test report generation, and streamlined deployment of new versions. This infrastructure ensures consistent quality standards throughout the development lifecycle.

### Purpose
**Priority:** HIGH
**Tags:** documentation, CI/CD, Documentation
**Source:** CI_VALIDATION

Priority: HIGH Tags: CI/CD, Documentation
This document establishes a systematic approach to validate continuous integration test reporting for accuracy and reliability. It provides a structured framework to verify that test results are correctly captured, reported, and interpreted within the CI pipeline, ensuring that the testing infrastructure delivers dependable quality metrics for the codebase.

### Notes
**Priority:** MEDIUM
**Tags:** documentation, CI/CD, Documentation
**Source:** CI_VALIDATION

Priority: MEDIUM Tags: CI/CD, Documentation
The validation protocol emphasizes that completion requires examining real CI run output rather than theoretical or simulated results. Four specific requirements must be satisfied: obtaining logs from an actual CI run to ensure authenticity, verifying the existence and completeness of test result files, validating that summary content accurately reflects test execution, and confirming that error handling properly manages exceptional conditions. This rigorous approach ensures the CI pipeline delivers reliable quality metrics.

### Overview
**Priority:** HIGH
**Tags:** documentation, Documentation, Architecture
**Source:** DOCUMENTATION

Priority: HIGH Tags: Documentation, Architecture
COC-VUE delivers Vue.js integration for COC.nvim, combining TypeScript core logic with Lua-based Neovim integration to create interactive UI components and features. The architecture implements a component-agnostic design that eliminates hardcoded component references, enabling dynamic component loading without global file modifications. This approach allows keyboard mappings to be automatically configured based on available component methods, creating a flexible and extensible framework for Neovim UI development.

### Introduction
**Priority:** CRITICAL
**Tags:** documentation, Documentation
**Source:** README

Priority: CRITICAL Tags: Documentation
CoC Vue Integration delivers a powerful, agnostic Vue.js integration for Neovim through coc.nvim. This extension transforms Neovim into a responsive Vue.js development environment with interactive features. Developers can directly manipulate Vue components, test component behavior, and accelerate development with this seamless integration.

### Debugging
**Priority:** MEDIUM
**Tags:** documentation, Documentation
**Source:** README

Priority: MEDIUM Tags: Documentation
When troubleshooting, check Neovim errors using ':messages' to view error messages and ':CocOpenLog' to access the Coc.nvim log file. Common issues include component loading failures, port conflicts, asynchronous operation timeouts, and bridge communication breakdowns. Each problem has specific verification steps detailed in the troubleshooting guide.

### Prerequisites
**Priority:** MEDIUM
**Tags:** documentation, Testing, Setup
**Source:** TESTS

Priority: MEDIUM Tags: Testing, Setup
Before implementing the testing environment, developers must verify installation of Docker and GitHub CLI. Docker provides the containerized test environment, while GitHub CLI facilitates integration with CI workflows. For macOS users, Docker can be installed from the official documentation, and GitHub CLI can be installed via Homebrew.

### Troubleshooting
**Priority:** MEDIUM
**Tags:** documentation, Testing, Documentation
**Source:** TESTS

Priority: MEDIUM Tags: Testing, Documentation
When encountering issues, developers can troubleshoot Docker problems by checking daemon status, cleaning resources with system prune, and verifying port availability. For GitHub CI issues, verify authentication status, check workflow permissions, and validate workflow files. When tests pass locally but fail in Docker, examine volume mounting configuration, environment variable settings, test logs in the results directory, and consider rebuilding the Docker image without cache.

