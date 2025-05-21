# TypeScript Test Structure Overhaul

## Step 1: Legacy Test Migration (Completed)

As the first step in overhauling our TypeScript test structure, all existing test files have been moved to a hidden archive folder. This preserves the original test logic while allowing us to implement a cleaner, more maintainable structure.

### Commands and Scripts Identified

The following commands and scripts were used to run TypeScript tests in the original structure:

1. **Package.json scripts:**
   ```json
   "scripts": {
     "test": "jest --config config/jest.config.js",
     "test:watch": "jest --config config/jest.config.js --watch",
     "test:integration": "./coc-vue-cli.sh test:component",
     "test:bridge": "jest --config config/jest.config.js __tests__/integration/select-bridge-integration.test.ts"
   }
   ```

2. **Test runner scripts:**
   - `./test-improved/scripts/run-unit-tests.sh`
   - `./test-improved/scripts/run-integration-tests.sh`
   - `./test-improved/scripts/run-all-tests.sh`
   - `./test-improved/scripts/watch-tests.sh`

3. **Jest configurations:**
   - `config/jest.config.js` (original configuration)
   - `test-improved/jest.config.js` (improved configuration)

### Files Moved

All TypeScript test files have been moved to the `.legacy_ts_tests` directory, preserving their original structure:

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

### Why and How

- `/jest.config.js` - Configures Jest to run the new test structure

## New Test Structure Rules

1. **Mirrored Structure**: Each `.ts` source file should have a corresponding `.test.ts` file in the same directory.
2. **Naming Convention**: Test files should be named `<filename>.test.ts`.
3. **Helper Directory**: All test utilities, mocks, and contexts should be placed in the `helper-test/` directory.
4. **Test Organization**: Tests should be organized using `describe` blocks for logical grouping.
5. **Test Coverage**: Tests should aim to cover all public methods and edge cases.

## Running Tests

To run the new tests, use the following command:

```bash
npm test
```

Or to run tests with coverage:

```bash
npm run test:coverage
```

## Next Steps

- Update the package.json scripts to use the new Jest configuration.
- Add more comprehensive tests for remaining TypeScript files.
- Integrate the new test structure with the CI/CD pipeline.
- Update the project README.md with the new test structure information.
