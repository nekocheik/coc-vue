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

## Step 2: Strict Mirrored Test Structure in `__tests__` (Completed)

To ensure a consistent and maintainable test structure, we have implemented a strict mirrored test structure rule. This means that for every source file in `src/`, there should be a corresponding test file in the `__tests__/` directory that mirrors the exact folder structure.

### Strict Mirrored Structure Rule

- For every source file `src/<path>/<filename>.ts`, there must be a test file `__tests__/<path>/<filename>.test.ts`.
- Example:
  ```
  src/
  ├── components/
  │   ├── select.ts
  │   └── vim-component.ts
  ├── bridge/
  │   ├── core.ts
  │   └── index.ts
  
  __tests__/
  ├── components/
  │   ├── select.test.ts
  │   └── vim-component.test.ts
  ├── bridge/
  │   ├── core.test.ts
  │   └── index.test.ts
  ```

### Test Files Moved

All test files have been moved from `src/` to the mirrored structure in `__tests__/`:

| Original Path | New Path |
|---------------|----------|
| `src/bridge/core.test.ts` | `__tests__/bridge/core.test.ts` |
| `src/bridge/index.test.ts` | `__tests__/bridge/index.test.ts` |
| `src/components/select.test.ts` | `__tests__/components/select.test.ts` |
| `src/components/vim-component.test.ts` | `__tests__/components/vim-component.test.ts` |
| `src/events/index.test.ts` | `__tests__/events/index.test.ts` |
| `src/index.test.ts` | `__tests__/index.test.ts` |
| `src/reactivity/index.test.ts` | `__tests__/reactivity/index.test.ts` |

### Test Utility Files

All test utility files remain in the `/helper-test/` directory to keep them separate from the actual test files:

| Path |
|------|
| `helper-test/mocks/bridge-core.ts` |
| `helper-test/mocks/coc-tests.ts` |
| `helper-test/mocks/neovim-mock.ts` |
| `helper-test/mocks/nvim.ts` |
| `helper-test/mocks/vim-component-tests.ts` |
| `helper-test/utils/neovim-client-factory.ts` |
| `helper-test/utils/neovim-test-client-mock.ts` |
| `helper-test/utils/neovim-test-client.ts` |
| `helper-test/mocks/bridge-core-improved.ts` |
| `helper-test/mocks/coc-improved.ts` |
| `helper-test/mocks/vim-component-improved.ts` |
| `helper-test/utils/neovim-client.ts` |
| `helper-test/utils/test-helpers.ts` |

### Current Test Structure

All source files now have their corresponding test files in the mirrored `__tests__` directory structure:

| Source File | Test File |
|-------------|-----------|
| `src/bridge/core.ts` | `__tests__/bridge/core.test.ts` |
| `src/bridge/index.ts` | `__tests__/bridge/index.test.ts` |
| `src/components/select.ts` | `__tests__/components/select.test.ts` |
| `src/components/vim-component.ts` | `__tests__/components/vim-component.test.ts` |
| `src/events/index.ts` | `__tests__/events/index.test.ts` |
| `src/index.ts` | `__tests__/index.test.ts` |
| `src/reactivity/index.ts` | `__tests__/reactivity/index.test.ts` |

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
