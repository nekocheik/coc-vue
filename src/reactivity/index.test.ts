/**
 * Tests for Reactivity Module
 * 
 * This file contains tests for the reactivity module that provides
 * reactive state management for coc-vue.
 */

// Mock dependencies - must be before any imports that use them
jest.mock('coc.nvim', () => ({
  workspace: {
    nvim: {
      call: jest.fn(),
      command: jest.fn(),
      eval: jest.fn(),
      createBuffer: jest.fn(),
      createWindow: jest.fn(),
      lua: jest.fn(),
    },
    onDidOpenTextDocument: jest.fn(),
    onDidChangeTextDocument: jest.fn(),
    onDidCloseTextDocument: jest.fn(),
    registerKeymap: jest.fn(),
    registerAutocmd: jest.fn(),
    createOutputChannel: jest.fn(() => ({
      show: jest.fn(),
      append: jest.fn(),
      appendLine: jest.fn(),
      clear: jest.fn(),
      dispose: jest.fn(),
    })),
  },
  window: {
    showMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    createStatusBarItem: jest.fn(() => ({
      text: '',
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    })),
    createTerminal: jest.fn(),
    showQuickpick: jest.fn(),
    showInputBox: jest.fn(),
    showNotification: jest.fn(),
  },
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn(),
    getCommands: jest.fn(() => []),
  },
}));

// Import test utilities after mocks
import { resetAllMocks } from '../../helper-test/utils/test-utils';

// Import the module to test after mocks
import { reactive, effect, ref, computed, watch } from './index';

// Get the mocked coc module
const coc = jest.requireMock('coc.nvim');

describe('Reactivity Module', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Reactive State', () => {
    it('should create reactive state', () => {
      // Arrange & Act
      const state = reactive({
        count: 0,
        text: 'Hello'
      });
      
      // Assert
      expect(state).toBeDefined();
      expect(state.count).toBe(0);
      expect(state.text).toBe('Hello');
    });

    it('should track changes to reactive state', () => {
      // Arrange
      const state = reactive({
        count: 0,
        text: 'Hello'
      });
      
      const effectFn = jest.fn();
      
      // Act
      effect(() => {
        effectFn(state.count);
      });
      
      // Initial call
      expect(effectFn).toHaveBeenCalledWith(0);
      
      // Update state
      state.count = 1;
      
      // Assert
      expect(effectFn).toHaveBeenCalledWith(1);
      expect(effectFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Computed Properties', () => {
    it('should create computed properties', () => {
      // Arrange
      const state = reactive({
        firstName: 'John',
        lastName: 'Doe'
      });
      
      // Act
      const fullName = computed(() => {
        return `${state.firstName} ${state.lastName}`;
      });
      
      // Assert
      expect(fullName.value).toBe('John Doe');
    });

    it('should update computed properties when dependencies change', () => {
      // Arrange
      const state = reactive({
        firstName: 'John',
        lastName: 'Doe'
      });
      
      const fullName = computed(() => {
        return `${state.firstName} ${state.lastName}`;
      });
      
      // Act
      state.firstName = 'Jane';
      
      // Assert
      expect(fullName.value).toBe('Jane Doe');
    });
  });

  describe('Watch', () => {
    it('should watch for changes to reactive state', () => {
      // Arrange
      const state = reactive({
        count: 0
      });
      
      const callback = jest.fn();
      
      // Act
      watch(() => state.count, callback);
      
      // Update state
      state.count = 1;
      
      // Assert
      expect(callback).toHaveBeenCalledWith(1, 0);
    });

    it('should support immediate option', () => {
      // Arrange
      const state = reactive({
        count: 0
      });
      
      const callback = jest.fn();
      
      // Act
      watch(() => state.count, callback, { immediate: true });
      
      // Assert
      expect(callback).toHaveBeenCalledWith(0, undefined);
    });
  });

  describe('Ref', () => {
    it('should create a ref', () => {
      // Arrange & Act
      const count = ref(0);
      
      // Assert
      expect(count.value).toBe(0);
    });

    it('should track changes to ref value', () => {
      // Arrange
      const count = ref(0);
      const effectFn = jest.fn();
      
      // Act
      effect(() => {
        effectFn(count.value);
      });
      
      // Initial call
      expect(effectFn).toHaveBeenCalledWith(0);
      
      // Update value
      count.value = 1;
      
      // Assert
      expect(effectFn).toHaveBeenCalledWith(1);
      expect(effectFn).toHaveBeenCalledTimes(2);
    });
  });
});
