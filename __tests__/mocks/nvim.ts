// __tests__/mocks/nvim.ts
// Mock for Neovim API used in tests

export const mockNvim = {
  commandCalls: [] as string[],
  commandResults: new Map<string, any>(),
  callResults: new Map<string, any>(),
  buffers: new Map<number, string[]>(),
  shouldFailBufferCreation: false,
  
  // Reset the mock state
  reset() {
    this.commandCalls = [];
    this.commandResults.clear();
    this.callResults.clear();
    this.buffers.clear();
    this.shouldFailBufferCreation = false;
    (this.command as jest.Mock).mockClear();
    (this.call as jest.Mock).mockClear();
  },
  
  // Set up the mock to fail buffer creation
  setBufferCreationFailure(shouldFail: boolean) {
    this.shouldFailBufferCreation = shouldFail;
  },
  
  // Mock command execution
  command: jest.fn().mockImplementation(function(this: any, cmd: string): Promise<any> {
    this.commandCalls.push(cmd);
    
    // Check if we have a predefined result for this command
    if (this.commandResults.has(cmd)) {
      return Promise.resolve(this.commandResults.get(cmd));
    }
    
    // Default behavior for lua commands that call the bridge
    if (cmd.startsWith('lua return require(\'vue-ui.core.bridge\').receiveMessage')) {
      return Promise.resolve('{"success":true,"received":true}');
    }
    
    return Promise.resolve(null);
  }),
  
  // Mock function calling
  call: jest.fn().mockImplementation(function(this: any, method: string, args: any[]): Promise<any> {
    const key = `${method}:${JSON.stringify(args)}`;
    
    if (this.callResults.has(key)) {
      return Promise.resolve(this.callResults.get(key));
    }
    
    // Handle buffer creation
    if (method === 'nvim_create_buf') {
      if (this.shouldFailBufferCreation) {
        throw new Error('Buffer creation failed');
      }
      // Create a new buffer and store it
      const bufferId = 1; // Always use buffer ID 1 for simplicity in tests
      this.buffers.set(bufferId, []);
      return Promise.resolve(bufferId);
    }
    
    // Handle buffer line setting
    if (method === 'nvim_buf_set_lines') {
      const [bufferId, start, end, strict, lines] = args;
      if (this.buffers.has(bufferId)) {
        const buffer = this.buffers.get(bufferId) || [];
        // Replace the specified lines
        if (end === -1) {
          // Replace all lines
          this.buffers.set(bufferId, [...lines]);
        } else {
          // Replace specific lines
          const newBuffer = [...buffer];
          for (let i = start; i < (end === -1 ? newBuffer.length : end); i++) {
            newBuffer[i] = lines[i - start];
          }
          this.buffers.set(bufferId, newBuffer);
        }
      }
      return Promise.resolve(null);
    }
    
    // Handle window creation
    if (method === 'nvim_open_win') {
      return Promise.resolve(1); // Return window ID 1
    }
    
    if (method === 'nvim_buf_set_lines') {
      // Just return success
      return Promise.resolve(true);
    }
    
    if (method === 'nvim_buf_set_name') {
      // Just return success
      return Promise.resolve(true);
    }
    
    return Promise.resolve(null);
  }),
  
  // Set up a mock result for a specific command
  setCommandResult(cmd: string, result: any) {
    this.commandResults.set(cmd, result);
  },
  
  // Set up a mock result for a specific function call
  setCallResult(method: string, args: any[], result: any) {
    const key = `${method}:${JSON.stringify(args)}`;
    this.callResults.set(key, result);
  }
};

// Mock for coc.nvim workspace
export const mockWorkspace = {
  nvim: mockNvim
};

// Mock for coc.nvim window
export const mockWindow = {
  showMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showInformationMessage: jest.fn(),
  showWarningMessage: jest.fn()
};

// Mock for coc.nvim commands
export const mockCommands = {
  registerCommand: jest.fn().mockImplementation((name, callback) => {
    return { dispose: jest.fn() };
  }),
  executeCommand: jest.fn()
};

// Reset all mocks
export function resetAllMocks() {
  mockNvim.reset();
  mockWindow.showMessage.mockClear();
  mockWindow.showErrorMessage.mockClear();
  mockWindow.showInformationMessage.mockClear();
  mockWindow.showWarningMessage.mockClear();
  mockCommands.registerCommand.mockClear();
  mockCommands.executeCommand.mockClear();
}
