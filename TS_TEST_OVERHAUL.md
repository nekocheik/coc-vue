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

The legacy test files were moved rather than deleted to:
1. Preserve all existing test logic and assertions
2. Provide reference material during the migration
3. Ensure no test coverage is lost during the transition

The migration was performed using the following process:
1. Created a hidden `.legacy_ts_tests` directory with the same structure as the original test directories
2. Copied all test files to the new location to ensure no data was lost
3. Moved the original files to the archive location
4. Created documentation explaining the original test structure and commands

A detailed README.md file has been added to the `.legacy_ts_tests` directory with complete information about the legacy test structure.

## Next Steps

The next steps in this overhaul will be:

1. Design a new, clearer TypeScript test structure
2. Create a template and documentation for the new structure
3. Implement a mechanism to ensure all TypeScript files have corresponding tests

These steps will be documented in future updates to this file.
