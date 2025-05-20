# Improved Testing Structure for COC-Vue

This testing structure has been designed to address issues with the previous structure, including:
- Excessive logs that reduce readability
- Slow and unreliable tests
- Difficulties maintaining mocks
- Connection problems with Neovim

## Folder Organization

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

## Key Features

1. **Log Reduction**
   - Logs are filtered to show only important information
   - Option to enable verbose logs when needed

2. **Improved Mocks**
   - Cleaner and easier-to-maintain implementations
   - Better error handling
   - Automatic reset between tests

3. **Robust Neovim Client**
   - Improved connection management
   - Automatic reconnection on failure
   - Timeout to prevent blocking

4. **Test Utilities**
   - Helper functions to reduce code duplication
   - Simplified assertions
   - Automatic resource management

5. **Execution Scripts**
   - Dedicated scripts for different test types
   - Watch mode for development
   - Code coverage reports

## How to Use

### Run Unit Tests

```bash
./test-improved/scripts/run-unit-tests.sh
```

### Run Integration Tests

```bash
./test-improved/scripts/run-integration-tests.sh
```

For detailed logs:

```bash
VERBOSE_LOGS=true ./test-improved/scripts/run-integration-tests.sh
```

### Run All Tests

```bash
./test-improved/scripts/run-all-tests.sh
```

### Watch Mode (Development)

```bash
./test-improved/scripts/watch-tests.sh unit     # For unit tests
./test-improved/scripts/watch-tests.sh integration  # For integration tests
```

## Writing New Tests

### Unit Tests

```typescript
// test-improved/unit/my-component.test.ts
import { MyComponent } from '../mocks/my-component';
import { mockNvim, resetAllMocks } from '../mocks/coc';

describe('MyComponent', () => {
  beforeEach(() => {
    resetAllMocks();
  });
  
  it('should do something', async () => {
    const component = new MyComponent({ id: 'test' });
    await component.mount();
    
    // Assertions...
    expect(mockNvim.call).toHaveBeenCalledWith(/* ... */);
  });
});
```

### Integration Tests

```typescript
// test-improved/integration/my-component.test.ts
import { withComponent, expectState } from '../utils/test-helpers';

describe('MyComponent Integration', () => {
  it('should do something', async () => {
    await withComponent('myComponent', async (helper) => {
      // Actions...
      await helper.callMethod('myMethod');
      
      // Assertions...
      const state = await helper.getState();
      expectState(state, { property: 'value' });
    });
  });
});
```

## Tips for Effective Tests

1. **Reduce Duplication**
   - Use the provided utilities to avoid repeating code
   - Create helper functions for common operations

2. **Isolated Tests**
   - Each test should be independent of others
   - Reset mocks before each test

3. **Readable Tests**
   - Use descriptive names for tests
   - Structure tests in phases: arrange, act, assert

4. **Avoid Unnecessary Logs**
   - Only add logs when necessary for debugging
   - Use VERBOSE_LOGS for detailed logs

5. **Error Handling**
   - Test error cases, not just success cases
   - Use try/catch to capture expected errors

## Comparison: Before/After

### Before

```typescript
// Old test with lots of logs and duplicated code
it('should handle method calls from bridge messages', async () => {
  const incrementMethod = jest.fn().mockImplementation(function(this: VimComponent, amount = 1) {
    this.updateState({ count: this.state.count + amount });
    return this.state.count;
  });
  
  const options: ComponentOptions = {
    id: 'bridge_methods_test',
    type: 'bridge_methods',
    state: { count: 0 },
    methods: {
      increment: incrementMethod
    },
    render: (state) => [`Count: ${state.count}`]
  };
  
  const component = new VimComponent(options);
  await component.mount();
  
  // Mock bridgeCore.registerHandler to capture the handler
  const registerHandlerSpy = jest.spyOn(bridgeCore, 'registerHandler');
  
  // Register the component with the bridge
  // This would normally be done in the component's constructor
  const registeredHandler = registerHandlerSpy.mock.calls[0]?.[1];
  
  // Create a bridge message
  const message: BridgeMessage = {
    id: 'bridge_methods_test',
    type: MessageType.ACTION,
    action: 'callMethod',
    payload: {
      method: 'increment',
      args: [5]
    },
    correlationId: 'test-correlation-id'
  };
  
  // Call the handler directly
  await registeredHandler!(message);
  
  // Verify method was called with correct arguments
  expect(incrementMethod).toHaveBeenCalledTimes(1);
  expect(incrementMethod).toHaveBeenCalledWith(5);
  
  // Verify state was updated and buffer re-rendered
  expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Count: 5']]);
  
  // Verify response was sent
  expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
    type: MessageType.RESPONSE,
    correlationId: 'test-correlation-id',
    payload: { result: 5 }
  }));
});
```

### After

```typescript
// New test with less code and more clarity
it('should handle method calls from bridge messages', async () => {
  // Reset mocks
  jest.clearAllMocks();
  
  // Create a mock for the method
  const incrementMethod = jest.fn().mockImplementation(function(this: VimComponent, amount = 1) {
    this.updateState({ count: this.state.count + amount });
    return this.state.count;
  });
  
  // Create component options with a method
  const options: ComponentOptions = {
    id: 'bridge_methods_test',
    type: 'bridge_methods',
    state: { count: 0 },
    methods: {
      increment: incrementMethod
    },
    render: (state) => [`Count: ${state.count}`]
  };
  
  // Create the component
  const component = new VimComponent(options);
  await component.mount();
  
  // Create a bridge message
  const message: BridgeMessage = {
    id: 'bridge_methods_test',
    type: MessageType.ACTION,
    action: 'callMethod',
    payload: {
      method: 'increment',
      args: [5]
    },
    correlationId: 'test-correlation-id'
  };
  
  // Simulate receiving the message
  await bridgeCore.receiveMessage(message);
  
  // Verify method was called with correct arguments
  expect(incrementMethod).toHaveBeenCalledTimes(1);
  expect(incrementMethod).toHaveBeenCalledWith(5);
  
  // Verify state was updated and buffer re-rendered
  expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', [1, 0, -1, false, ['Count: 5']]);
  
  // Verify response was sent
  expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
    type: MessageType.RESPONSE,
    action: 'methodResult',
    correlationId: 'test-correlation-id',
    payload: expect.objectContaining({ result: 5 })
  }));
});
```
