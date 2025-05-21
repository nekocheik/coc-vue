# Legacy TypeScript Tests

This directory contains the legacy TypeScript test files that were part of the original test structure for the coc-vue project. These files have been preserved for reference while a new, more structured testing approach is implemented.

## Test Commands

The following commands were used to run TypeScript tests in the original structure:

1. **Main test command (package.json):**
   ```bash
   npm test
   # or
   yarn test
   # Runs: jest --config config/jest.config.js
   ```

2. **Watch mode:**
   ```bash
   npm run test:watch
   # or
   yarn test:watch
   # Runs: jest --config config/jest.config.js --watch
   ```

3. **Integration tests:**
   ```bash
   npm run test:integration
   # or
   yarn test:integration
   # Runs: ./coc-vue-cli.sh test:component
   ```

4. **Bridge tests:**
   ```bash
   npm run test:bridge
   # or
   yarn test:bridge
   # Runs: jest --config config/jest.config.js __tests__/integration/select-bridge-integration.test.ts
   ```

5. **Improved test structure commands:**
   ```bash
   # Run unit tests
   ./test-improved/scripts/run-unit-tests.sh
   # Runs: npx jest --config ./test-improved/jest.config.js --selectProjects UNIT

   # Run integration tests
   ./test-improved/scripts/run-integration-tests.sh
   # Runs: npx jest --config ./test-improved/jest.config.js --selectProjects INTEGRATION

   # Run all tests
   ./test-improved/scripts/run-all-tests.sh
   # Runs both unit and integration tests with coverage
   ```

## Files Moved

The following files were moved from their original locations to this archive:

| Original Path | New Path |
|---------------|----------|
| `__tests__/bridge/core.test.ts` | `.legacy_ts_tests/__tests__/bridge/core.test.ts` |
| `__tests__/bridge/select-bridge.test.ts` | `.legacy_ts_tests/__tests__/bridge/select-bridge.test.ts` |
| `__tests__/components/select.test.ts` | `.legacy_ts_tests/__tests__/components/select.test.ts` |
| `__tests__/components/vim-component.test.ts` | `.legacy_ts_tests/__tests__/components/vim-component.test.ts` |
| `__tests__/integration/select-bridge-integration.test.ts` | `.legacy_ts_tests/__tests__/integration/select-bridge-integration.test.ts` |
| `__tests__/integration/select-component-integration.test.ts` | `.legacy_ts_tests/__tests__/integration/select-component-integration.test.ts` |
| `__tests__/integration/select-integration.test.ts` | `.legacy_ts_tests/__tests__/integration/select-integration.test.ts` |
| `test-improved/integration/select.test.ts` | `.legacy_ts_tests/test-improved/integration/select.test.ts` |
| `test-improved/unit/vim-component.test.ts` | `.legacy_ts_tests/test-improved/unit/vim-component.test.ts` |

## Why This Archive Was Created

This archive was created as part of a TypeScript test structure overhaul for the coc-vue project. The goals of this overhaul are:

1. Create a clearer, more maintainable test structure
2. Ensure each TypeScript file has a corresponding test file
3. Implement a consistent naming convention and folder hierarchy
4. Make it easier for developers to add new tests

The legacy tests have been preserved rather than deleted to:
- Maintain a reference for the test logic and assertions
- Ensure no test coverage is lost during the transition
- Allow for gradual migration to the new structure

The new test structure will be implemented in the main project directory with a clearer organization and documentation.

## Legacy Test Structure

The original test structure had two parallel testing approaches:

1. **`__tests__` directory:** The original test structure with subdirectories for:
   - `bridge`: Tests for the bridge between TypeScript and Lua
   - `components`: Tests for Vue components
   - `integration`: Integration tests for various features

2. **`test-improved` directory:** A newer test structure with:
   - `integration`: Integration tests
   - `unit`: Unit tests
   - Better configuration and helper utilities

Both structures used Jest as the test runner but with different configurations.
