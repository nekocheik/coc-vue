# CI_TESTING
**Path:** /docs/CI_TESTING.md
**Priority:** HIGH
**Tags:** CI/CD, Testing, Documentation
**Summary:** Comprehensive guide explaining the CI testing pipeline for coc-vue, including test types, configuration, troubleshooting, and maintenance procedures.

## Sections

### Overview
**Priority:** HIGH
**Tags:** Testing, CI/CD

The coc-vue project implements two complementary testing frameworks to ensure code quality. TypeScript Tests using Jest provide unit, component, and integration testing for TypeScript code, while VADER Tests execute Vim script tests for components within a Vim/Neovim environment. Both systems are fully integrated into the CI/CD pipeline through GitHub Actions, creating a comprehensive testing ecosystem that validates both the TypeScript and Vim aspects of the extension.

### CI Pipeline Structure
**Priority:** HIGH
**Tags:** CI/CD, DevOps

The continuous integration pipeline defined in .github/workflows/test.yml executes tests in a Docker container to ensure consistent environments across all test runs. This containerized approach follows a four-step workflow: building a Docker image from the project's Dockerfile, running all tests using the scripts/docker-run-tests.sh script, generating comprehensive test reports and execution summaries, and uploading all test artifacts to GitHub Actions for review and analysis.

### Running Tests Locally
**Priority:** MEDIUM
**Tags:** Testing, Development

Developers can execute tests locally using various npm commands for TypeScript tests: 'npm test' runs all tests, 'npm run test:watch' enables watch mode for continuous testing during development, 'npm run test:coverage' generates coverage reports, 'npm run test:legacy' executes legacy tests, and 'npm run test:integration' focuses on integration tests. For VADER tests, the scripts/run-vader-tests.sh script provides a streamlined execution of all Vim component tests with automatic report generation.

### Test Configuration
**Priority:** MEDIUM
**Tags:** Testing, Configuration

TypeScript tests use the jest.config.js file in the project root for configuration, with test files located in the __tests__/ directory and mocks in __tests__/mocks/ and helper-test/mocks/. VADER tests are organized in test/vader/components/, executed through the scripts/run-vader-tests.sh runner, with reports automatically generated in test/coverage/reports/. This structured approach ensures consistent test execution and reporting across both test frameworks.

### Common Issues and Solutions
**Priority:** HIGH
**Tags:** Testing, Troubleshooting

Four common testing issues have been identified with corresponding solutions. Jest configuration path errors ('Can't find a root directory while resolving a config file path') require verification of the path in scripts/docker-run-tests.sh, ensuring it points to /app/jest.config.js. VADER test script errors ('[: -gt: unary operator expected') indicate variable handling issues that need default values through parameter expansion (${var:-0}). Missing dependencies require package.json verification, npm install execution, and Docker image dependency audits. Language Check limitations represent a non-blocking issue where technical terms may be incorrectly flagged as non-English words, solvable through --legacy-peer-deps flags, term whitelisting, and focused file scanning.

### Adding New Tests
**Priority:** MEDIUM
**Tags:** Testing, Development

When extending the test suite with TypeScript tests, developers should create new files in the __tests__/ directory using the *.test.ts naming convention, implement tests with the Jest framework, and validate them locally before committing. For VADER tests, new files should be added to test/vader/components/ following the component-name.vader convention, utilizing the mock-based approach described in test/vader/README.md, and testing locally with the run-vader-tests.sh script. These guidelines ensure consistent test implementation across the project.

### Maintaining the CI Pipeline
**Priority:** MEDIUM
**Tags:** CI/CD, DevOps

When modifying the CI pipeline, four best practices should be followed: always test changes locally before pushing to the repository, maintain the existing project structure to avoid breaking dependent processes, document all changes in the CI_TESTING.md file to ensure knowledge transfer, and update Docker configurations when introducing new dependencies or environment requirements. These practices ensure pipeline stability while allowing for necessary evolution.

