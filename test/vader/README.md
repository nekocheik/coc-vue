# VADER Test Suite for coc-vue

This directory contains VADER tests for the coc-vue project, structured to mirror the actual component organization of the codebase.

## Directory Structure

```
test/vader/
├── components/       # Tests for UI components (button, modal, select, etc.)
├── core/             # Tests for core functionality (validation, state, etc.)
├── events/           # Tests for event handling
├── utils/            # Tests for utility functions
└── README.md         # This documentation file
```

## Writing VADER Tests

VADER tests in this project follow a structure aligned with TypeScript tests, using the following pattern:

### Test File Structure

```vim
" Component Name Test
" Description of what this test covers

" Global Setup - Similar to beforeAll in Jest
Execute (Global Setup):
  " Setup code that runs once before all tests
  let g:test_id = 'test_component_' . strftime('%s')
  lua require('vue-ui').setup({debug = true})

" Test Suite: Feature Name
Execute (Test Suite: Feature Name):
  " Test suite setup code

" Test Case: Should do something specific
Execute (Test Case: Should do something specific):
  " Arrange - Setup for this specific test
  lua local component = require('vue-ui.components.component').create(vim.g.test_id, 'Label')
  
  " Act - Perform the action being tested
  lua local result = component:someMethod()
  
  " Assert - Verify the expected outcome
  lua assert(result == expected, "Error message")

" Global Teardown - Similar to afterAll in Jest
Execute (Global Teardown):
  " Teardown code that runs once after all tests
  lua local component = require('vue-ui.utils.event_bridge').get_component(vim.g.test_id)
  lua if component then component:destroy() end
```

### Assertions

Use Lua's `assert()` function for assertions:

```lua
assert(condition, "Error message if assertion fails")
```

Examples:
```lua
assert(button ~= nil, "Button was not created")
assert(button.props.label == "Test Button", "Button label does not match")
assert(#render_result.lines > 0, "Render contains no lines")
```

## Running Tests

### Running a Single Test File

```bash
# From the project root
nvim -es -u NONE -c 'filetype plugin on' -c 'set rtp+=test/vader' -c "source test/vader.vim" -c "Vader! test/vader/components/button.vader"
```

### Running All Tests

```bash
# From the project root
bash scripts/run-vader-tests.sh
```

## Coverage Analysis

Coverage is tracked for each component. To generate a coverage report:

```bash
# From the project root
bash scripts/generate-coverage-report.sh
```

The coverage report will be available in `test/coverage/report.html`.

## Adding New Tests

1. Identify which component or feature you want to test
2. Create or modify the appropriate test file in the matching directory
3. Follow the test structure outlined above
4. Run the test to verify it passes
5. Check coverage to ensure your test covers the intended code paths

### Simplified Test Structure

For simpler components, you can use a more straightforward test structure that avoids complex Lua module dependencies:

```vim
" Component Name Test - Simplified Version

" Global Setup
Execute (Global Setup):
  " Configure test environment
  let g:test_component_id = 'test_component_' . strftime('%s')
  
  " Create a simple mock component
  function! CreateComponent(id, text, opts)
    let component = {'id': a:id, 'text': a:text, 'props': a:opts}
    return component
  endfunction
  
  " Create a test component
  let g:component = CreateComponent(g:test_component_id, 'Test Component', {'style': 'primary'})

" Test Case: Should create component with correct properties
Execute (Test Case: Should create component with correct properties):
  " Assert - Verify component was created with correct properties
  Assert g:component != {}, "Component was not created"
  Assert g:component.id == g:test_component_id, "Component ID does not match"
  Assert g:component.text == 'Test Component', "Component text does not match"
  Assert g:component.props.style == 'primary', "Component style does not match"

" Test Case: Should update component correctly
Execute (Test Case: Should update component correctly):
  " Act - Update component text
  let g:component.text = "New text"
  
  " Assert - Verify text was updated
  Assert g:component.text == "New text", "Component text was not updated"

" Global Teardown
Execute (Global Teardown):
  " Clean up
  unlet g:component
  unlet g:test_component_id
```

This simplified approach is particularly useful during the refactoring process, as it allows you to focus on testing the component's behavior without worrying about complex module dependencies.

## Debugging Tests

If a test fails, you can run it in interactive mode:

```bash
nvim -c 'filetype plugin on' -c 'set rtp+=test/vader' -c "source test/vader.vim" -c "Vader test/vader/components/button.vader"
```

This will open Vim and run the test, showing you exactly where it fails.

## Maintaining Tests

When modifying the codebase:

1. Run the affected tests to ensure they still pass
2. Update tests if the component behavior has changed
3. Add new tests for new functionality
4. Remove tests for removed functionality

## Component-Specific Test Guidelines

### Button Component

- Test creation with various properties
- Test rendering with different styles
- Test click events and focus handling
- Test disabled state behavior

### Modal Component

- Test opening and closing
- Test content rendering
- Test interaction with buttons inside the modal
- Test keyboard shortcuts

### Select Component

- Test option rendering
- Test selection behavior
- Test keyboard navigation
- Test search functionality if applicable

## Best Practices

1. **Keep tests focused**: Each test should verify one specific behavior
2. **Use descriptive names**: Test case names should clearly describe what is being tested
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Clean up after tests**: Ensure all components are destroyed after testing
5. **Avoid dependencies between tests**: Each test should be able to run independently
6. **Test edge cases**: Include tests for error conditions and boundary values
7. **Use Lua heredoc syntax**: When writing complex Lua code in tests, use the heredoc syntax (`lua << EOF ... EOF`) to ensure the Lua code runs as a single block
8. **Store components in global variables**: For components that need to be accessed across multiple test cases, store them in `_G` variables (e.g., `_G.test_button`)
9. **Mock dependencies**: Create mock implementations of dependencies to isolate the component being tested
