/**
 * Common test utilities for coc-vue
 * 
 * This file contains shared utility functions and helpers for testing
 * TypeScript components and modules in the coc-vue project.
 */

import { mocked } from 'jest-mock';

/**
 * Creates a mock for a given module with proper TypeScript typing
 * 
 * @template T The type of the module to mock
 * @param module The module to create a mock for
 * @returns A mocked version of the module with proper typing
 */
export function createTypedMock<T extends object>(module: T): jest.Mocked<T> {
  return mocked(module);
}

/**
 * Resets all mocks created with jest.mock()
 * This is useful to call in beforeEach() to ensure tests don't affect each other
 */
export function resetAllMocks(): void {
  jest.resetAllMocks();
  jest.clearAllMocks();
}

/**
 * Waits for a specified amount of time
 * Useful for testing asynchronous operations
 * 
 * @param ms Milliseconds to wait
 * @returns A promise that resolves after the specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a mock event object for testing event handlers
 * 
 * @template T The type of the event object
 * @param overrides Properties to override in the default event object
 * @returns A mock event object
 */
export function createMockEvent<T extends object>(overrides: Partial<T> = {}): T {
  const defaultEvent = {
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
  };
  
  return {
    ...defaultEvent,
    ...overrides,
  } as unknown as T;
}

/**
 * Asserts that a value is defined (not null or undefined)
 * Throws an error if the value is null or undefined
 * 
 * @template T The type of the value
 * @param value The value to check
 * @param message Optional error message
 * @returns The value if it's defined
 */
export function assertDefined<T>(value: T | null | undefined, message = 'Value is not defined'): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}
