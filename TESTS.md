# Docker Testing & GitHub CI Integration

This document provides comprehensive instructions for running tests in Docker containers and integrating with GitHub CI.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Docker Test Environment](#docker-test-environment)
- [Running Tests Locally](#running-tests-locally)
- [GitHub CI Integration](#github-ci-integration)
- [Managing Secrets](#managing-secrets)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Ensure you have the following tools installed:

```bash
# Check Docker installation
docker --version

# Check GitHub CLI installation
gh --version

# If not installed, install them (macOS):
# Docker: https://docs.docker.com/desktop/install/mac-install/
# GitHub CLI:
brew install gh
```

## Docker Test Environment

The project includes a Docker-based test environment that ensures consistent test execution across different machines.

### Key Components

- `Dockerfile`: Defines the test environment with Node.js and required dependencies
- `docker-compose.yml`: Configures services for running different types of tests
- `scripts/docker-run-tests.sh`: Script for running tests in Docker containers
- `scripts/setup-github-ci.sh`: Script for setting up GitHub CI integration

### Container Architecture

The Docker test environment:
- Mounts local source code into the container
- Preserves node_modules in the container (performance optimization)
- Exports test results to the local filesystem
- Uses environment variables for configuration

## Running Tests Locally

You can run tests locally using Docker in two ways:

### Using the Convenience Script

```bash
# Make sure the script is executable
chmod +x scripts/run-docker-tests.sh

# Run the tests
./scripts/run-docker-tests.sh
```

### Using Docker Compose Directly

```bash
# Build and run simplified tests
docker-compose build test
docker-compose run --rm test

# Run full tests (may fail)
docker-compose run --rm test-full
```

### Environment Variables

Tests can be configured using environment variables:

- Create a `.env` file based on `.env.example`
- Variables in this file will be loaded automatically
- The `.env` file is excluded from version control for security

Example `.env` file:
```
MOCK_NEOVIM=true
NODE_ENV=test
# Add any other required variables here
```

## GitHub CI Integration

The project includes GitHub Actions workflows for continuous integration.

### Setting Up GitHub CI

```bash
# Make sure the script is executable
chmod +x scripts/setup-github-ci.sh

# Run the setup script
./scripts/setup-github-ci.sh
```

The setup script will:
1. Verify GitHub CLI authentication
2. Check for the existence of workflow files
3. Help you add secrets to your GitHub repository
4. Enable GitHub Actions for your repository
5. Optionally trigger a test workflow

### GitHub Workflow

The GitHub workflow (`.github/workflows/test.yml`):
- Runs on pushes to main/master branches and pull requests
- Sets up Docker and builds the test image
- Runs the tests in a Docker container
- Uploads test results as artifacts

### Monitoring Workflow Runs

```bash
# List recent workflow runs
gh run list

# View details of a specific run
gh run view [RUN_ID]

# Watch a run's progress
gh run watch [RUN_ID]
```

## Managing Secrets

The project is configured to handle secrets securely:

### Local Development

- Sensitive information is stored in `.env` files
- `.env` files are excluded from version control via `.gitignore`
- Example configurations are provided in `.env.example`

### GitHub Actions

Secrets in GitHub Actions are managed securely:

```bash
# Add a secret via GitHub CLI
gh secret set SECRET_NAME -b "secret_value"

# List existing secrets
gh secret list
```

**IMPORTANT: Never commit secrets to version control or expose them in logs!**

### Best Practices

1. Use environment variables for configuration
2. Keep secrets out of code and configuration files
3. Use GitHub's secret storage for CI/CD secrets
4. Regularly rotate sensitive credentials
5. Verify `.gitignore` excludes all sensitive files

## Troubleshooting

### Docker Issues

```bash
# Check Docker daemon status
docker info

# Clean up Docker resources
docker system prune -a

# Check for port conflicts
lsof -i :9999
```

### GitHub CI Issues

```bash
# Verify GitHub CLI authentication
gh auth status

# Check workflow permissions
gh api repos/:owner/:repo/actions/permissions

# Validate workflow file
gh workflow view test.yml
```

### Test Failures

If tests fail in Docker but pass locally:
1. Check volume mounting in `docker-compose.yml`
2. Verify environment variables are properly set
3. Examine test logs in the `test-results` directory
4. Try rebuilding the Docker image with `docker-compose build --no-cache test`
