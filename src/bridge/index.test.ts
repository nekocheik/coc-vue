/**
 * Tests for Bridge Index
 * 
 * This file contains tests for the bridge index module that exports
 * the bridge functionality for coc-vue.
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

jest.mock('../events/index', () => ({
  EventType: {
    COMPONENT_CREATED: 'component_created',
    COMPONENT_UPDATED: 'component_updated',
    COMPONENT_DESTROYED: 'component_destroyed'
  },
  EventPayload: jest.fn()
}));

// Import test utilities after mocks
import { resetAllMocks } from '../../helper-test/utils/test-utils';

// Import the module to test after mocks
import { Bridge } from './index';

// Get the mocked modules
const coc = jest.requireMock('coc.nvim');
const events = jest.requireMock('../events/index');
const { EventType } = events;

// Define EventPayload interface for type checking
interface EventPayload {
  type: string;
  data: any;
}

describe('Bridge Index', () => {
  let bridge: Bridge;
  
  beforeEach(() => {
    resetAllMocks();
    // Get the singleton instance
    bridge = Bridge.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when getInstance is called multiple times', () => {
      // Act
      const instance1 = Bridge.getInstance();
      const instance2 = Bridge.getInstance();
      
      // Assert
      expect(instance1).toBe(instance2);
    });
  });

  describe('Command Execution', () => {
    it('should send commands to Lua', async () => {
      // Arrange
      const command = 'test_command';
      const args = ['arg1', { key: 'value' }];
      
      // Act
      await bridge.sendCommand(command, ...args);
      
      // Assert
      expect(coc.workspace.nvim.command).toHaveBeenCalledWith(
        expect.stringContaining("lua return require('vue-ui.core.bridge').execute_command('test_command'")
      );
    });

    it('should handle non-string, non-object arguments correctly', async () => {
      // Arrange
      const command = 'test_command';
      const args = [42, true]; // Number, boolean
      
      // Act
      await bridge.sendCommand(command, ...args);
      
      // Assert
      expect(coc.workspace.nvim.command).toHaveBeenCalledWith(
        expect.stringContaining("lua return require('vue-ui.core.bridge').execute_command('test_command', 42, true")
      );
    });

    it('should handle errors when sending commands', async () => {
      // Arrange
      coc.workspace.nvim.command.mockRejectedValueOnce(new Error('Command error'));
      
      // Act & Assert
      await expect(bridge.sendCommand('test_command')).rejects.toThrow('Command error');
    });
  });

  describe('Event Handling', () => {
    it('should send events to Lua', async () => {
      // Arrange
      const event = {
        type: events.EventType.COMPONENT_CREATED,
        data: {
          componentId: 'test-component',
          componentType: 'select',
          key: 'value'
        }
      };
      
      // Act
      await bridge.sendEvent(event);
      
      // Assert
      expect(coc.workspace.nvim.command).toHaveBeenCalledWith(
        expect.stringContaining("lua require('vue-ui.core.bridge').handle_event")
      );
    });

    it('should handle errors when sending events', async () => {
      // Arrange
      const event = {
        type: events.EventType.COMPONENT_CREATED,
        data: {
          componentId: 'test-component',
          componentType: 'select'
        }
      };
      coc.workspace.nvim.command.mockRejectedValueOnce(new Error('Event error'));
      
      // Act & Assert
      await expect(bridge.sendEvent(event)).rejects.toThrow('Event error');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(`[Bridge] Error sending event ${event.type}:`),
        expect.any(Error)
      );
    });

    it('should register event handlers', async () => {
      // Arrange
      const handler = jest.fn();
      
      // Act
      await bridge.registerEventHandler(handler);
      
      // Assert - This is a stub in the implementation, so we just verify it doesn't throw
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Event handler registered'));
    });
  });
});
