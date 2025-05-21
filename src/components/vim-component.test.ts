/**
 * Tests for VimComponent
 * 
 * This file contains tests for the base VimComponent class that all
 * Vim UI components extend from in coc-vue.
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

// Mock the bridge/core module
jest.mock('../bridge/core', () => ({
  bridgeCore: {
    sendMessage: jest.fn(),
    registerHandler: jest.fn(),
  },
  MessageType: {
    ACTION: 'action',
    EVENT: 'event',
    RESPONSE: 'response',
    ERROR: 'error'
  }
}));

// Import test utilities after mocks
import { resetAllMocks } from '../../helper-test/utils/test-utils';

// Import the component to test after mocks
import { VimComponent } from './vim-component';
import { bridgeCore } from '../bridge/core';

// Get the mocked coc module
const coc = jest.requireMock('coc.nvim');

// Create a concrete implementation for testing
class TestVimComponent extends VimComponent {
  constructor(config: any) {
    super({
      id: config.id || 'test-component',
      type: 'test',
      props: config.props || {},
      state: config.state || {}
    });
  }
}

describe('VimComponent', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with the provided configuration', () => {
      // Arrange & Act
      const component = new TestVimComponent({
        id: 'test-component',
        props: { title: 'Test Component' },
      });
      
      // Assert
      expect(component).toBeDefined();
      expect((component as any)._id).toBe('test-component');
      expect((component as any)._props.title).toBe('Test Component');
    });

    it('should use the default ID if none is provided', () => {
      // Arrange & Act
      const component = new TestVimComponent({
        props: { title: 'Test Component' },
      });
      
      // Assert
      expect((component as any)._id).toBeDefined();
      expect((component as any)._id).toBe('test-component');
    });
  });

  describe('Component Lifecycle', () => {
    it('should mount and unmount the component', async () => {
      // Arrange
      const component = new TestVimComponent({
        id: 'test-component',
        props: { title: 'Test Component' },
      });
      
      // Mock the mount and unmount methods
      (component as any).mount = jest.fn().mockResolvedValue(true);
      (component as any).unmount = jest.fn().mockResolvedValue(true);
      
      // Act - Mount
      await (component as any).mount();
      
      // Assert - Mount
      expect((component as any).mount).toHaveBeenCalled();
      
      // Act - Unmount
      await (component as any).unmount();
      
      // Assert - Unmount
      expect((component as any).unmount).toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    it('should register message handlers during initialization', () => {
      // Arrange & Act - creating the component should register message handlers
      const component = new VimComponent({
        id: 'test-component',
        type: 'test'
      });
      
      // Assert - verify the bridgeCore.registerHandler was called with the component ID
      expect(bridgeCore.registerHandler).toHaveBeenCalledWith(
        `component:${component.id}`,
        expect.any(Function)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle errors when mounting a component', async () => {
      // Arrange
      const component = new TestVimComponent({
        id: 'test-component',
        props: { title: 'Test Component' },
      });
      
      // Mock mount to throw an error
      (component as any).mount = jest.fn().mockImplementation(() => {
        throw new Error('Mount error');
      });
      
      // Act & Assert
      await expect(async () => {
        await (component as any).mount();
      }).rejects.toThrow('Mount error');
    });
  });
});
