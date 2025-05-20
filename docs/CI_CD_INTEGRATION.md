# Continuous Integration and Deployment (CI/CD)

This document describes the configuration and usage of continuous integration (CI) and continuous deployment (CD) systems for the coc-vue project.

## Table of Contents

- [Introduction](#introduction)
- [Docker Environments](#docker-environments)
- [GitHub Actions CI](#github-actions-ci)
- [Test Execution](#test-execution)
  - [Jest Tests](#jest-tests)
  - [Vader Component Tests](#vader-component-tests)
  - [Test Reports](#test-reports)
- [Secret Management](#secret-management)
- [Troubleshooting](#troubleshooting)

## Introduction

The coc-vue project uses several continuous integration systems to ensure code quality and automate testing. These systems allow:

- Automatic test execution on each commit
- Verification of compatibility with different environments
- Generation of test reports
- Automatic deployment of new versions

## Docker Environments

### Docker Configuration

The project uses Docker to create an isolated and reproducible test environment. The main configuration files are:

- `Dockerfile`: Defines the Docker image for tests
- `docker-compose.yml`: Configures Docker services for different types of tests
- `scripts/docker-run-tests.sh`: Script to run tests in Docker
- `scripts/setup-github-ci.sh`: Script to configure GitHub CI integration

### Docker Image Structure

```dockerfile
FROM node:18-slim

# Install necessary dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    lsof \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Configure working directory
WORKDIR /app

# Copy dependency files
COPY package.json ./
COPY package-lock.json* bun.lock* ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Make scripts executable
RUN chmod +x scripts/docker-run-tests.sh

# Default command
CMD ["./scripts/docker-run-tests.sh"]
```

### Local Execution with Docker

To run tests locally with Docker:

```bash
# Build Docker image
docker build -t coc-vue-test .

# Run simplified tests
docker run --rm coc-vue-test

# Or use the dedicated script
./scripts/run-docker-tests.sh
```

## GitHub Actions CI

GitHub Actions is configured to automatically run tests on each commit on any branch.

### Workflow Configuration

The configuration file is located in `.github/workflows/test.yml`:

```yaml
name: Docker Tests

on:
  push: # Run on each push to any branch
  pull_request: # Run on all pull requests
  workflow_dispatch: # Allow manual triggering

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Set up Docker
        run: |
          docker --version
      
      - name: Build Docker image
        run: |
          docker build -t coc-vue-test .
      
      - name: Run tests in Docker
        run: |
          mkdir -p test-results
          docker run --rm coc-vue-test ./scripts/docker-run-tests.sh | tee test-output.log
          echo "Test execution completed with exit code ${PIPESTATUS[0]}"
        env:
          MOCK_NEOVIM: true
          NODE_ENV: test
          CI: true
      
      # Create test summary
      - name: Create test summary
        if: always()
        continue-on-error: true
        run: |
          echo "## Test Results Summary" >> $GITHUB_STEP_SUMMARY
          if [ -f test-output.log ]; then
            if grep -q "All tests passed" test-output.log; then
              echo "✅ All tests passed successfully!" >> $GITHUB_STEP_SUMMARY
            else
              echo "❌ Some tests failed. See logs for details." >> $GITHUB_STEP_SUMMARY
            fi
            echo "\n### Test Output" >> $GITHUB_STEP_SUMMARY
            echo '```' >> $GITHUB_STEP_SUMMARY
            cat test-output.log >> $GITHUB_STEP_SUMMARY
            echo '```' >> $GITHUB_STEP_SUMMARY
          else
            echo "❌ No test output log found." >> $GITHUB_STEP_SUMMARY
          fi
```

### Configuration and Usage

To configure GitHub Actions CI:

1. Make sure the `.github/workflows/test.yml` file exists
2. Use the `scripts/setup-github-ci.sh` script to configure secrets

```bash
# Make the script executable
chmod +x scripts/setup-github-ci.sh

# Run the configuration script
./scripts/setup-github-ci.sh
```

### Monitoring Workflow Runs

To monitor GitHub Actions workflow runs:

```bash
# List recent runs
gh run list

# View details of a specific run
gh run view [RUN_ID]

# Watch a run's progress
gh run watch [RUN_ID]
```

## Test Execution

The coc-vue project uses several types of tests to ensure code quality. These tests are automatically executed in the CI environment.

### Jest Tests

Jest tests are used for unit tests, component tests, and integration tests.

```bash
# Run unit tests
npx jest --config /app/test/simplified-jest.config.js --testPathPattern="__tests__/(?!integration)" --passWithNoTests

# Run component tests
npx jest --config /app/test/simplified-jest.config.js --testPathPattern="__tests__/components" --passWithNoTests

# Run integration tests
npx jest --config /app/test/simplified-jest.config.js --testPathPattern="__tests__/integration" --passWithNoTests
```

### Vader Component Tests

Vader tests are used to test Vim/Neovim components. These tests verify the behavior of UI components in a Vim environment.

#### Vader Test Structure

Vader tests are located in the `test/vader/` directory and use the `.vader` extension. Each test file contains a series of blocks that define the test setup, execution, and verification.

#### Running Vader Tests

The script `scripts/run-vader-tests.sh` has been created to run Vader tests and generate detailed reports in JSON and HTML formats. This script is automatically executed by the CI pipeline.

```bash
# Run Vader tests
./scripts/run-vader-tests.sh
```

The script performs the following operations:
1. Starts Neovim in headless mode
2. Loads the Vader plugin
3. Runs the specified Vader test files
4. Generates a report in JSON format
5. Converts the JSON report to HTML for better readability

### Test Reports

Test reports are generated for both Jest and Vader tests. These reports are available in the CI pipeline:

1. **Jest Reports**: Located in the `test-results/` directory
   - `jest-results.json`: JSON report of Jest test results
   - `coverage/`: Code coverage report

2. **Vader Reports**: Located in the `test-results/vader/` directory
   - `vader-results.json`: JSON report of Vader test results
   - `vader-report.html`: HTML report of Vader test results

## Secret Management

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
