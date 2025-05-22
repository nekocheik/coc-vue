import { workspace, commands, window, ExtensionContext } from 'coc.nvim';
import { registerBufferCommands } from '../../src/commands/bufferCommands';
import { BufferRouter } from '../../src/bufferRouter';

// Mock coc.nvim
jest.mock('coc.nvim', () => ({
  workspace: {
    nvim: {
      command: jest.fn(),
      lua: jest.fn(),
    },
  },
  window: {
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    showQuickPick: jest.fn(),
  },
  commands: {
    registerCommand: jest.fn((name, callback) => {
      // Save the callback for testing
      registeredCommands[name] = callback;
      return { dispose: jest.fn() };
    }),
    executeCommand: jest.fn(),
  },
}));

// Mock BufferRouter
jest.mock('../../src/bufferRouter');

// Store registered commands for testing
const registeredCommands: Record<string, Function> = {};

describe('Buffer Commands', () => {
  let context: Partial<ExtensionContext>;
  let bufferRouter: jest.Mocked<BufferRouter>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear registered commands
    Object.keys(registeredCommands).forEach(key => {
      delete registeredCommands[key];
    });
    
    // Setup test context
    context = {
      subscriptions: []
    };
    
    // Setup buffer router mock
    bufferRouter = new BufferRouter() as jest.Mocked<BufferRouter>;
    (BufferRouter as jest.Mock).mockImplementation(() => bufferRouter);
    
    // Mock router methods
    bufferRouter.createBuffer = jest.fn();
    bufferRouter.switchBuffer = jest.fn();
    bufferRouter.deleteBuffer = jest.fn();
    bufferRouter.getCurrentBuffer = jest.fn();
    bufferRouter.dispose = jest.fn();
  });
  
  test('registerBufferCommands registers all commands', () => {
    // Act
    registerBufferCommands(context as ExtensionContext);
    
    // Assert
    expect(commands.registerCommand).toHaveBeenCalledWith('vue.component.open', expect.any(Function));
    expect(commands.registerCommand).toHaveBeenCalledWith('vue.component.switchView', expect.any(Function));
    expect(commands.registerCommand).toHaveBeenCalledWith('vue.buffer.list', expect.any(Function));
    
    // Check that the buffer router is added to subscriptions
    expect(context.subscriptions).toContain(bufferRouter);
  });
  
  test('vue.component.open command creates and switches to a buffer', async () => {
    // Arrange
    registerBufferCommands(context as ExtensionContext);
    const openCommand = registeredCommands['vue.component.open'];
    const mockBufferId = 'buffer-123';
    const componentPath = '/path/to/component.vue';
    
    bufferRouter.createBuffer.mockResolvedValue(mockBufferId);
    bufferRouter.switchBuffer.mockResolvedValue(true);
    
    // Act
    const result = await openCommand(componentPath, { prop: 'value' });
    
    // Assert
    expect(bufferRouter.createBuffer).toHaveBeenCalledWith(componentPath, { prop: 'value' });
    expect(bufferRouter.switchBuffer).toHaveBeenCalledWith(mockBufferId);
    expect(result).toBe(mockBufferId);
  });
  
  test('vue.component.open command handles switch failure', async () => {
    // Arrange
    registerBufferCommands(context as ExtensionContext);
    const openCommand = registeredCommands['vue.component.open'];
    const mockBufferId = 'buffer-123';
    const componentPath = '/path/to/component.vue';
    
    bufferRouter.createBuffer.mockResolvedValue(mockBufferId);
    bufferRouter.switchBuffer.mockResolvedValue(false); // Switch failure
    
    // Act
    const result = await openCommand(componentPath);
    
    // Assert
    expect(bufferRouter.createBuffer).toHaveBeenCalledWith(componentPath, undefined);
    expect(bufferRouter.switchBuffer).toHaveBeenCalledWith(mockBufferId);
    expect(window.showErrorMessage).toHaveBeenCalledWith(`Failed to open component: ${componentPath}`);
    expect(result).toBeNull();
  });
  
  test('vue.component.open command handles errors', async () => {
    // Arrange
    registerBufferCommands(context as ExtensionContext);
    const openCommand = registeredCommands['vue.component.open'];
    const componentPath = '/path/to/component.vue';
    const error = new Error('Test error');
    
    bufferRouter.createBuffer.mockRejectedValue(error);
    
    // Act
    const result = await openCommand(componentPath);
    
    // Assert
    expect(bufferRouter.createBuffer).toHaveBeenCalledWith(componentPath, undefined);
    expect(window.showErrorMessage).toHaveBeenCalledWith(`Error opening component: ${error}`);
    expect(result).toBeNull();
  });
  
  test('vue.component.switchView command switches between related files', async () => {
    // Arrange
    registerBufferCommands(context as ExtensionContext);
    const switchViewCommand = registeredCommands['vue.component.switchView'];
    const relatedPaths = [
      '/path/to/component.vue',
      '/path/to/component.spec.js',
      '/path/to/component.scss'
    ];
    
    const currentBuffer = {
      id: 'buffer-123',
      path: relatedPaths[0],
      query: {},
      createdAt: Date.now()
    };
    
    bufferRouter.getCurrentBuffer.mockResolvedValue(currentBuffer);
    bufferRouter.switchBuffer.mockResolvedValue(true);
    
    // Act
    const result = await switchViewCommand(relatedPaths);
    
    // Assert
    expect(bufferRouter.getCurrentBuffer).toHaveBeenCalled();
    expect(bufferRouter.switchBuffer).toHaveBeenCalledWith(relatedPaths[1]); // Should switch to next path
    expect(result).toBe(true);
  });
  
  test('vue.component.switchView command creates a buffer if it does not exist', async () => {
    // Arrange
    registerBufferCommands(context as ExtensionContext);
    const switchViewCommand = registeredCommands['vue.component.switchView'];
    const relatedPaths = [
      '/path/to/component.vue',
      '/path/to/component.spec.js'
    ];
    
    const currentBuffer = {
      id: 'buffer-123',
      path: relatedPaths[0],
      query: {},
      createdAt: Date.now()
    };
    
    const mockBufferId = 'new-buffer-456';
    
    bufferRouter.getCurrentBuffer.mockResolvedValue(currentBuffer);
    bufferRouter.switchBuffer.mockImplementation(async (path) => {
      // First call will fail (buffer doesn't exist), second will succeed
      if (path === relatedPaths[1]) {
        return false; // First attempt fails
      }
      return true; // Second attempt succeeds
    });
    bufferRouter.createBuffer.mockResolvedValue(mockBufferId);
    
    // Act
    const result = await switchViewCommand(relatedPaths);
    
    // Assert
    expect(bufferRouter.getCurrentBuffer).toHaveBeenCalled();
    expect(bufferRouter.switchBuffer).toHaveBeenCalledWith(relatedPaths[1]); // First attempt
    expect(bufferRouter.createBuffer).toHaveBeenCalledWith(relatedPaths[1]); // Create since it doesn't exist
    expect(bufferRouter.switchBuffer).toHaveBeenCalledWith(mockBufferId); // Second attempt with buffer ID
    expect(result).toBe(true);
  });
  
  test('vue.component.switchView command handles no current buffer', async () => {
    // Arrange
    registerBufferCommands(context as ExtensionContext);
    const switchViewCommand = registeredCommands['vue.component.switchView'];
    const relatedPaths = [
      '/path/to/component.vue',
      '/path/to/component.spec.js'
    ];
    
    bufferRouter.getCurrentBuffer.mockResolvedValue(null); // No current buffer
    
    // Act
    const result = await switchViewCommand(relatedPaths);
    
    // Assert
    expect(bufferRouter.getCurrentBuffer).toHaveBeenCalled();
    expect(window.showWarningMessage).toHaveBeenCalledWith('No active Vue component buffer found');
    expect(result).toBe(false);
  });
  
  test('vue.component.switchView command handles errors', async () => {
    // Arrange
    registerBufferCommands(context as ExtensionContext);
    const switchViewCommand = registeredCommands['vue.component.switchView'];
    const relatedPaths = [
      '/path/to/component.vue',
      '/path/to/component.spec.js'
    ];
    const error = new Error('Test error');
    
    bufferRouter.getCurrentBuffer.mockRejectedValue(error);
    
    // Act
    const result = await switchViewCommand(relatedPaths);
    
    // Assert
    expect(bufferRouter.getCurrentBuffer).toHaveBeenCalled();
    expect(window.showErrorMessage).toHaveBeenCalledWith(`Error switching component view: ${error}`);
    expect(result).toBe(false);
  });
  
  test('vue.buffer.list command lists and switches buffers', async () => {
    // Arrange
    registerBufferCommands(context as ExtensionContext);
    const listCommand = registeredCommands['vue.buffer.list'];
    
    const mockBuffers = [
      { id: 'buffer-1', path: '/path/to/component1.vue', query_string: 'prop=value' },
      { id: 'buffer-2', path: '/path/to/component2.vue', query_string: '' }
    ];
    
    workspace.nvim.lua.mockResolvedValue(mockBuffers);
    window.showQuickPick.mockResolvedValue({
      label: '/path/to/component1.vue?prop=value',
      description: 'ID: buffer-1',
      data: 'buffer-1'
    });
    
    bufferRouter.switchBuffer.mockResolvedValue(true);
    
    // Act
    const result = await listCommand();
    
    // Assert
    expect(workspace.nvim.lua).toHaveBeenCalledWith('return require(\'buffer_router\'):list_buffers()');
    expect(window.showQuickPick).toHaveBeenCalled();
    expect(bufferRouter.switchBuffer).toHaveBeenCalledWith('buffer-1');
    expect(result).toEqual(mockBuffers);
  });
  
  test('vue.buffer.list command handles no buffers', async () => {
    // Arrange
    registerBufferCommands(context as ExtensionContext);
    const listCommand = registeredCommands['vue.buffer.list'];
    
    workspace.nvim.lua.mockResolvedValue([]);
    
    // Act
    const result = await listCommand();
    
    // Assert
    expect(workspace.nvim.lua).toHaveBeenCalledWith('return require(\'buffer_router\'):list_buffers()');
    expect(window.showInformationMessage).toHaveBeenCalledWith('No managed buffers found');
    expect(result).toEqual([]);
  });
  
  test('vue.buffer.list command handles no selection', async () => {
    // Arrange
    registerBufferCommands(context as ExtensionContext);
    const listCommand = registeredCommands['vue.buffer.list'];
    
    const mockBuffers = [
      { id: 'buffer-1', path: '/path/to/component1.vue', query_string: 'prop=value' },
      { id: 'buffer-2', path: '/path/to/component2.vue', query_string: '' }
    ];
    
    workspace.nvim.lua.mockResolvedValue(mockBuffers);
    window.showQuickPick.mockResolvedValue(null); // No selection made
    
    // Act
    const result = await listCommand();
    
    // Assert
    expect(workspace.nvim.lua).toHaveBeenCalledWith('return require(\'buffer_router\'):list_buffers()');
    expect(window.showQuickPick).toHaveBeenCalled();
    expect(bufferRouter.switchBuffer).not.toHaveBeenCalled(); // Should not switch if no selection
    expect(result).toEqual(mockBuffers);
  });
  
  test('vue.buffer.list command handles errors', async () => {
    // Arrange
    registerBufferCommands(context as ExtensionContext);
    const listCommand = registeredCommands['vue.buffer.list'];
    const error = new Error('Test error');
    
    workspace.nvim.lua.mockRejectedValue(error);
    
    // Act
    const result = await listCommand();
    
    // Assert
    expect(workspace.nvim.lua).toHaveBeenCalledWith('return require(\'buffer_router\'):list_buffers()');
    expect(window.showErrorMessage).toHaveBeenCalledWith(`Error listing buffers: ${error}`);
    expect(result).toEqual([]);
  });
});
