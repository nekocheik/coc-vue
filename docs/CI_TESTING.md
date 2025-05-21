# CI Testing Guide for coc-vue

This document explains how the CI testing pipeline works for coc-vue and how to troubleshoot common issues.

## Overview

The coc-vue project uses two types of tests:

1. **TypeScript Tests (Jest)**: Unit, component, and integration tests for TypeScript code
2. **VADER Tests**: Vim script tests for components that run in a Vim/Neovim environment

Both test systems are integrated into the CI/CD pipeline via GitHub Actions.

## CI Pipeline Structure

The CI pipeline is defined in `.github/workflows/test.yml` and executes tests in a Docker container to ensure a consistent environment. The main steps are:

1. Build a Docker image from the project's Dockerfile
2. Run tests using `scripts/docker-run-tests.sh`
3. Generate test reports and summaries
4. Upload artifacts (test reports) to GitHub Actions

## Running Tests Locally

### TypeScript Tests

```bash
# Run all TypeScript tests
npm test

# Run with watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run legacy tests
npm run test:legacy

# Run integration tests
npm run test:integration
```

### VADER Tests

```bash
# Run all VADER component tests
./scripts/run-vader-tests.sh
```

## Test Configuration

### TypeScript Tests

- Main configuration: `jest.config.js` in the project root
- Test files location: `__tests__/` directory
- Mocks: Located in `__tests__/mocks/` and `helper-test/mocks/`

### VADER Tests

- Test files location: `test/vader/components/`
- Test runner: `scripts/run-vader-tests.sh`
- Reports: Generated in `test/coverage/reports/`

## Common Issues and Solutions

### 1. Jest Configuration Path

If you see errors like `Can't find a root directory while resolving a config file path`, check:

- The path to the Jest configuration file in `scripts/docker-run-tests.sh`
- Make sure it points to `/app/jest.config.js` (Docker container path)

### 2. VADER Test Script Errors

If you see errors like `line XX: [: -gt: unary operator expected`, check:

- Variable handling in the VADER test script
- Make sure variables have default values when used in comparisons
- Use parameter expansion with default values: `${var:-0}`

### 3. Missing Dependencies

If tests fail due to missing dependencies:

- Check the `package.json` file for required dependencies
- Run `npm install` to update dependencies
- Make sure the Docker image has all required system dependencies

### 4. French Language Check Limitations

The French Language Check job may fail even when all tests pass. This is a known limitation:

- The check scans for French words in both code and commit history
- It flags certain technical terms like "configuration" as French words
- This is a non-blocking issue for development but should be addressed for clean CI

**Solutions:**

- Use `--legacy-peer-deps` flag with npm install in the workflow
- Consider modifying the French check script to:
  - Only check the latest commit (not the entire history)
  - Whitelist common technical terms that are valid in English
  - Restrict the check to specific file types or directories

## Adding New Tests

### TypeScript Tests

1. Create a new test file in the `__tests__/` directory
2. Follow the naming convention: `*.test.ts`
3. Use the Jest testing framework
4. Run tests locally before committing

### VADER Tests

1. Create a new test file in `test/vader/components/`
2. Follow the naming convention: `component-name.vader`
3. Use the mock-based approach as described in `test/vader/README.md`
4. Test locally using `./scripts/run-vader-tests.sh`

## Maintaining the CI Pipeline

When making changes to the CI pipeline:

1. Always test changes locally first
2. Maintain the existing project structure
3. Document any changes in this file
4. Update the Docker configuration if needed
