# Coverage Plan for coc-vue

This document outlines the plan to achieve 100% test coverage across all code in the src/ directory.

## Current Coverage Status (Initial)

| File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                                                                                          |
|-------------------|---------|----------|---------|---------|---------------------------------------------------------------------------------------------------------------|
| All files          | 53.53   | 30.88    | 53.57   | 54.72   |                                                                                                             |
| src/index.ts       | 76.92   | 10       | 66.66   | 76.92   | 40,64-66,77-79,129-131,145-151                                                                              |
| src/bridge/core.ts | 82.25   | 72.72    | 72.72   | 82.25   | 78,120,129,148,175-200                                                                                      |
| src/bridge/index.ts| 88.46   | 80       | 100     | 88.46   | 28,55-56                                                                                                    |
| src/components/select.ts | 26.56 | 21.23 | 26.31 | 27.47 | 93-136,149,186-227,240-249,280-284,292,308-309,327-441,468-528,545-601,628-642,657,672-704,713,723,738-759 |
| src/components/vim-component.ts | 38.88 | 24 | 53.33 | 40.38 | 145,173-423,441,448,457,478,499-520                                                                        |
| src/events/index.ts | 92     | 60       | 100     | 91.66   | 14,21                                                                                                       |
| src/reactivity/index.ts | 76.19 | 71.42 | 82.6 | 77.77 | 78-81,108-109,115-120,156-159,197-206,265,270-271                                                             |

## Test Plan

### 1. src/index.ts

#### Uncovered Code:
- Line 40: Error handling in activation
- Lines 64-66: Error handling in command registration
- Lines 77-79: Error handling in bridge test command
- Lines 129-131: Error handling in component destruction
- Lines 145-151: Error handling in deactivation

#### Test Cases to Add:
- [x] Test error handling in activation
- [x] Test error handling in command registration
- [x] Test error handling in bridge test command
- [x] Test error handling in component destruction
- [x] Test error handling in deactivation

#### Test Cases Added:
- Added test for error handling in activation - Added test that mocks a rejected promise from nvim.command
- Added test for error handling in command registration - Added test that simulates an error during command registration
- Added test for error handling in bridge test command - Added test that mocks a rejected promise from bridgeCore.sendMessage
- Added test for error handling in select demo command - Added test that mocks a rejected promise from nvim.command
- Added test for error handling in component destruction - Added test with a component that throws an error during destruction
- Added test for handling components without destroy method - Added test with a component that doesn't have a destroy method

### 2. src/bridge/core.ts

#### Uncovered Code:
- ✅ Line 78: Error handling in setupMessageReceiver
- ✅ Lines 118-120: Error handling in receiveMessage
- ✅ Lines 127-129: Early return in processMessageQueue
- ✅ Lines 173-175: Early return in unregisterHandler
- Line 150: Error handling in processMessageQueue

#### Test Cases Added:
- [x] Test error handling in receiveMessage - Added test for invalid JSON
- [x] Test early return in processMessageQueue - Added tests for empty queue and already processing
- [x] Test early return in unregisterHandler - Added test for non-existent action
- [x] Added tests for handler management (register/unregister handlers and global handlers)

#### Test Cases to Add:
- [ ] Test error handling in setupMessageReceiver
- [ ] Test error handling in processMessageQueue

### 3. src/bridge/index.ts

#### Uncovered Code:
- ✅ Line 28: Non-string, non-object arguments in sendCommand
- ✅ Lines 55-56: Error handling in sendEvent

#### Test Cases Added:
- [x] Test non-string, non-object arguments in sendCommand - Added test with number and boolean arguments
- [x] Test error handling in sendEvent - Added test for error handling when sending events

### 4. src/components/select.ts

#### Uncovered Code:
- Lines 93-136: Various methods and properties
- Line 149: Error handling
- Lines 186-227: Component lifecycle methods
- Lines 240-249: Event handling
- Lines 280-284: Option selection
- Line 292: Error handling
- Lines 308-309: Option validation
- Lines 327-441: UI rendering
- Lines 468-528: Event handling
- Lines 545-601: Component state management
- Lines 628-642: Component destruction
- Line 657: Error handling
- Lines 672-704: Component interaction
- Line 713: Error handling
- Line 723: Error handling
- Lines 738-759: Component cleanup

#### Test Cases to Add:
- [ ] Test component initialization with various options
- [ ] Test component lifecycle methods
- [ ] Test event handling
- [ ] Test option selection and validation
- [ ] Test UI rendering
- [ ] Test component state management
- [ ] Test component destruction
- [ ] Test error handling
- [ ] Test component interaction
- [ ] Test component cleanup

### 5. src/components/vim-component.ts

#### Uncovered Code:
- Line 145: Error handling
- Lines 173-423: Various component methods
- Line 441: Error handling
- Line 448: Error handling
- Line 457: Error handling
- Line 478: Error handling
- Lines 499-520: Component state management

#### Test Cases to Add:
- [ ] Test error handling in component methods
- [ ] Test component lifecycle methods
- [ ] Test component state management
- [ ] Test component interaction
- [ ] Test component destruction

### 6. src/events/index.ts

#### Uncovered Code:
- ✅ Line 14: Error handling in event registration
- ✅ Line 21: Error handling in event removal

#### Test Cases Added:
- [x] Test error handling in event registration - Added test for emitting an event with no listeners
- [x] Test error handling in event removal - Added test for removing a listener from a non-existent event

### 7. src/reactivity/index.ts

#### Uncovered Code:
- Lines 110-112: Early return in runner function when effect is inactive
- Line 271: Cleanup execution in watch
- Lines 277-278: Watch with immediate option

#### Test Cases Added:
- [x] Test onStop callback execution - Added test that verifies the onStop callback is called
- [x] Test stopping an already stopped effect - Added test that calls stop twice on the same effect
- [x] Test delete property in reactive objects - Added test that deletes a property from a reactive object and verifies the effect is triggered
- [x] Test error handling in effect execution - Added test for error handling in effects with onStop callback
- [x] Test lazy option in effect - Added basic test that verifies the lazy option is accepted

#### Test Cases to Add:
- [ ] Test early return in runner function when effect is inactive
- [ ] Test cleanup function in watch
- [ ] Test watch with immediate option

#### Notes on Testing Challenges:
- Some aspects of the reactivity system are difficult to test directly because they involve internal implementation details
- The watch cleanup functionality is not directly exposed through the public API
- The lazy option test was simplified due to challenges with the current implementation in the test environment
- For the Select component, certain methods are difficult to test because they rely on internal state or the Vim/Neovim environment
- Some methods in the Select component interact with the UI or bridge in ways that are challenging to mock completely

#### VimComponent Testing Limitations:
- **Computed Properties**: The implementation of computed properties in the VimComponent class uses `Object.defineProperty` on internal state objects, which is difficult to test through the public API.
- **Split Window Creation**: The code paths for creating split windows (non-floating) are difficult to test because they involve complex Vim commands and window management.
- **Reactivity Integration**: The integration between the VimComponent class and the reactivity system involves internal implementation details that can't be directly tested through the public API.
- **Buffer Content Updates**: Testing buffer content updates requires complex mocking of the Neovim API, which is challenging to do comprehensively.
- **Error Handling in Buffer Operations**: Some error handling paths in buffer and window operations are difficult to trigger in tests without complex mocking.

## Progress Tracking

We'll update this section as we add tests and improve coverage.

### Current Status
- [x] src/index.ts: 86.15% statements, 30% branches, 66.66% functions, 86.15% lines
- [x] src/bridge/core.ts: 96.77% statements, 100% branches, 100% functions, 96.77% lines
- [x] src/bridge/index.ts: 100% statements, 100% branches, 100% functions, 100% lines
- [x] src/components/select.ts: 46.87% statements, 41.59% branches, 43.85% functions, 47.80% lines
- [x] src/components/vim-component.ts: 76.54% statements, 63% branches, 66.66% functions, 76.92% lines
- [x] src/events/index.ts: 100% statements, 100% branches, 100% functions, 100% lines
- [x] src/reactivity/index.ts: 93.33% statements, 89.28% branches, 91.30% functions, 94.94% lines

### Overall Coverage
- [ ] All files: 16.46% statements, 23.16% branches, 11.76% functions, 16.50% lines

*Note: The overall coverage appears to have decreased because we're now including more files in the coverage report, including the test files themselves.*

### Target
- [ ] All files: 100% statements, 100% branches, 100% functions, 100% lines

### Next Steps
1. Implement tests for src/index.ts (especially branch coverage)
2. Continue improving coverage for src/components/select.ts
3. Complete remaining tests for src/reactivity/index.ts
