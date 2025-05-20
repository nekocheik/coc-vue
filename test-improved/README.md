# Improved Testing Framework for COC-Vue

This testing framework has been designed to address issues with the previous testing structure and provide a more robust, maintainable, and efficient testing environment for the COC-Vue project.

## Key Improvements

- **Reduced Log Noise**: Filtered logs for better readability
- **Faster Tests**: Optimized test execution and better mock management
- **Improved Stability**: More reliable test execution with proper error handling
- **Simplified Mocks**: Easier to maintain mock implementations
- **Better External Dependency Management**: Improved handling of Neovim dependencies

## Directory Structure

```
test-improved/
├── integration/       # Integration tests
├── jest.config.js     # Improved Jest configuration
├── mocks/             # Improved mocks
├── reports/           # Generated test reports
├── scripts/           # Test execution scripts
├── unit/              # Unit tests
└── utils/             # Test utilities
```

## Running Tests

### Unit Tests

Unit tests are fast and don't require a Neovim server:

```bash
./test-improved/scripts/run-unit-tests.sh
```

### Integration Tests

Integration tests require a Neovim server, which is automatically started and stopped:

```bash
./test-improved/scripts/run-integration-tests.sh
```

For detailed logs (in case of issues):

```bash
VERBOSE_LOGS=true ./test-improved/scripts/run-integration-tests.sh
```

### All Tests

To run all tests and generate a coverage report:

```bash
./test-improved/scripts/run-all-tests.sh
```

### Watch Mode (Development)

To run tests in watch mode (useful during development):

```bash
./test-improved/scripts/watch-tests.sh unit     # For unit tests
./test-improved/scripts/watch-tests.sh integration  # For integration tests
```

## Writing Tests

For more detailed information about writing tests with this framework, please refer to the [Improved Testing Documentation](../docs/IMPROVED_TESTING.md).

## Troubleshooting

If you encounter issues with the tests:

1. Check the logs in the `reports` directory
2. Try running with `VERBOSE_LOGS=true` for more detailed output
3. Verify that Neovim is properly installed and configured
4. Check that all dependencies are installed with `npm install`
5. Ensure that the test scripts have executable permissions (`chmod +x test-improved/scripts/*.sh`)

## Contributing

When adding new tests, please follow these guidelines:

1. Keep tests isolated and independent
2. Use the provided utilities to reduce code duplication
3. Minimize log output unless necessary for debugging
4. Include both success and error cases
5. Follow the existing test structure and naming conventions
