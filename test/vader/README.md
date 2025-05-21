# VADER Tests for coc-vue

This directory contains VADER tests for the coc-vue project, structured to mirror the actual component organization of the codebase. All tests follow a standardized mock-based approach to ensure consistency and reliability.

## Directory Structure

```
test/vader/
├── components/       # Tests for UI components (button, modal, select, etc.)
├── core/             # Tests for core functionality (validation, state, etc.)
├── events/           # Tests for event handling
├── templates/        # Official templates for new tests
├── utils/            # Tests for utility functions
└── README.md         # This documentation file
```

## Test Standards and Guidelines

All VADER tests in this project MUST adhere to the following standards:

1. **Mock-Based Approach**: All tests must use mock implementations instead of requiring actual modules.
2. **One Test Per Component**: Each component must have exactly one test file.
3. **100% Pass Rate**: All tests must pass 100% before being merged.
4. **No Duplicates**: No duplicate or legacy test files are allowed.
5. **Follow Template**: All new tests must use the official template in `templates/component-test-template.vader`.

## Writing VADER Tests

VADER tests in this project follow a structure aligned with TypeScript tests, using the following pattern:

### Test File Structure

Each test file should follow this structure:

```vader
" Component Name Test
" Description of what this test verifies

" Global Setup
Execute (Global Setup):
  " Configure test environment
  let g:test_component_id = 'test_component_' . strftime('%s')
  
  " Create mock implementations here
  function! CreateComponent(...)
    " Component implementation
  endfunction
  
  " Create a test component
  let g:component = CreateComponent(...)

" Test Suite: Feature Area
Execute (Test Suite: Feature Area):
  " Description of this test suite

" Test Case: Specific Behavior
Execute (Test Case: Specific Behavior):
  " Test implementation
  
  " Assertions
  Assert condition, "Error message"

" Global Teardown
Execute (Global Teardown):
  " Clean up
  unlet g:component
  unlet g:test_component_id
```

### Mock Implementation Guidelines

1. **Self-Contained**: Tests should be completely self-contained and not rely on external modules.
2. **Event Tracking**: Implement a simple event tracking system in your mocks to verify events.
3. **State Management**: Track component state in your mocks to verify state changes.
4. **Mock Registry**: Implement a simple component registry if needed for your tests.

### Assertions

Use VimScript's `Assert` function for assertions in VADER tests:

```vim
Assert condition, "Error message if assertion fails"
```

Examples:
```vim
Assert g:component != {}, "Component was not created"
Assert g:component.props.title == "Test Title", "Component title does not match"
Assert len(render_result.lines) > 0, "Render contains no lines"
```

### Running Tests

Use the validated test runner script to run tests:

```bash
# Run all tests
./scripts/run-vader-tests.sh

# Run a specific component test
./scripts/run-vader-tests.sh test/vader/components/component-name.vader
```

## CI/CD Integration

The VADER tests are integrated into the CI/CD pipeline. The pipeline will:

1. Run all VADER tests
2. Generate a JSON report of test results
3. Generate an HTML report for easy viewing
4. Upload test artifacts

Tests are expected to pass with 100% success rate before merging.

## Adding New Tests

When adding a new component test:

1. Copy the template from `templates/component-test-template.vader`
2. Rename it to match your component name
3. Implement the necessary mock objects and test cases
4. Ensure all tests pass with 100% success rate
5. Submit for code review

## Code Review Guidelines

When reviewing VADER tests, ensure:

1. The test follows the mock-based approach
2. There is exactly one test file per component
3. All tests pass with 100% success rate
4. The test follows the official template structure
5. There are no duplicate or legacy test files

**IMPORTANT**: No test should be merged if it doesn't meet these standards.
