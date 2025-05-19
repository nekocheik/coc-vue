// Mock implementation of coc.nvim
export const mockWorkspace = {
  nvim: {
    call: jest.fn(),
    command: jest.fn(),
    createBuffer: jest.fn(),
  },
  onDidOpenTextDocument: jest.fn(),
  onDidChangeTextDocument: jest.fn(),
  onDidCloseTextDocument: jest.fn(),
  registerKeymap: jest.fn(),
};

export const mockWindow = {
  showMessage: jest.fn(),
  createOutputChannel: jest.fn().mockReturnValue({
    appendLine: jest.fn(),
    show: jest.fn(),
  }),
};

// Export the mock module
const cocMock = {
  workspace: mockWorkspace,
  window: mockWindow,
};

export default cocMock;
