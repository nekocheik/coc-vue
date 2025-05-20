// Mock implementation of coc.nvim
export const mockWorkspace = {
  nvim: {
    call: jest.fn().mockResolvedValue(null),
    command: jest.fn().mockResolvedValue(null),
    createBuffer: jest.fn().mockResolvedValue(1),
    eval: jest.fn().mockResolvedValue(null),
    request: jest.fn().mockResolvedValue(null),
    createNamespace: jest.fn().mockReturnValue('namespace-1'),
    resumeNotification: jest.fn(),
  },
  onDidOpenTextDocument: jest.fn().mockReturnValue({ dispose: jest.fn() }),
  onDidChangeTextDocument: jest.fn().mockReturnValue({ dispose: jest.fn() }),
  onDidCloseTextDocument: jest.fn().mockReturnValue({ dispose: jest.fn() }),
  registerKeymap: jest.fn().mockReturnValue({ dispose: jest.fn() }),
  registerAutocmd: jest.fn().mockReturnValue({ dispose: jest.fn() }),
  createFile: jest.fn().mockResolvedValue(true),
  getConfiguration: jest.fn().mockReturnValue({
    get: jest.fn().mockReturnValue(null),
    update: jest.fn().mockResolvedValue(true),
    has: jest.fn().mockReturnValue(false),
  }),
};

export const mockWindow = {
  showMessage: jest.fn(),
  createOutputChannel: jest.fn().mockReturnValue({
    appendLine: jest.fn(),
    show: jest.fn(),
    clear: jest.fn(),
    dispose: jest.fn(),
  }),
  createStatusBarItem: jest.fn().mockReturnValue({
    text: '',
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
  }),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showInformationMessage: jest.fn(),
};

// Export the mock module
const cocMock = {
  workspace: mockWorkspace,
  window: mockWindow,
  // Ajouter d'autres propriétés si nécessaire
  commands: {
    registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    executeCommand: jest.fn().mockResolvedValue(null),
  },
  languages: {
    registerCompletionItemProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
  },
};

export default cocMock;
