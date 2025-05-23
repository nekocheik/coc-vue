# TESTS
**Path:** /TESTS.md
**Priority:** HIGH
**Tags:** Testing, CI/CD, Documentation
**Summary:** Comprehensive guide for running tests in Docker containers and integrating with GitHub CI, including environment setup, workflow configuration, and secrets management.

## Sections

### Prerequisites
**Priority:** MEDIUM
**Tags:** Testing, Setup

Before implementing the testing environment, developers must verify installation of Docker and GitHub CLI. Docker provides the containerized test environment, while GitHub CLI facilitates integration with CI workflows. For macOS users, Docker can be installed from the official documentation, and GitHub CLI can be installed via Homebrew.

### Docker Test Environment
**Priority:** HIGH
**Tags:** Testing, Docker

The project implements a Docker-based test environment ensuring consistent execution across different systems. Key components include the Dockerfile defining the Node.js environment, docker-compose.yml configuring test services, and scripts for test execution. The container architecture optimizes performance by mounting local source code, preserving node_modules within the container, exporting test results to the local filesystem, and using environment variables for configuration.

### Running Tests Locally
**Priority:** HIGH
**Tags:** Testing, Documentation

Developers can run tests locally using either the convenience script or direct Docker Compose commands. The convenience script provides a simplified interface, while Docker Compose offers more granular control. Tests can be configured through environment variables defined in a .env file based on the provided .env.example template. This file remains excluded from version control for security purposes and supports variables like MOCK_NEOVIM and NODE_ENV.

### GitHub CI Integration
**Priority:** HIGH
**Tags:** CI/CD, GitHub

GitHub Actions workflows enable continuous integration for the project. The setup script verifies GitHub CLI authentication, ensures workflow file existence, assists with repository secret configuration, enables GitHub Actions, and can trigger test workflows. The workflow defined in .github/workflows/test.yml executes on pushes to main/master branches and pull requests, builds the Docker test image, runs containerized tests, and uploads results as artifacts.

### Managing Secrets
**Priority:** CRITICAL
**Tags:** Security, CI/CD

The project implements secure secrets management for both local development and CI/CD processes. Locally, sensitive information resides in .env files excluded from version control via .gitignore. For GitHub Actions, secrets are managed through GitHub's secure storage system accessible via CLI. Best practices include environment variable usage for configuration, keeping secrets separate from code, utilizing GitHub's secret storage for CI/CD, regularly rotating credentials, and verifying .gitignore excludes all sensitive files.

### Troubleshooting
**Priority:** MEDIUM
**Tags:** Testing, Documentation

When encountering issues, developers can troubleshoot Docker problems by checking daemon status, cleaning resources with system prune, and verifying port availability. For GitHub CI issues, verify authentication status, check workflow permissions, and validate workflow files. When tests pass locally but fail in Docker, examine volume mounting configuration, environment variable settings, test logs in the results directory, and consider rebuilding the Docker image without cache.

