/**
 * Mock for coc.nvim API
 * 
 * This file provides mock implementations of the coc.nvim API for testing.
 * It simulates the behavior of coc.nvim without requiring an actual Neovim instance.
 */

const cocWorkspace = {
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
};

const cocWindow = {
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
};

const cocCommands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn(),
  getCommands: jest.fn(() => []),
};

const CocLanguageClient = jest.fn(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  onReady: jest.fn(() => Promise.resolve()),
  sendRequest: jest.fn(),
  sendNotification: jest.fn(),
}));

const CocExtensionContext = jest.fn(() => ({
  subscriptions: [],
  extensionPath: '/path/to/extension',
  storagePath: '/path/to/storage',
  globalStoragePath: '/path/to/global/storage',
  asAbsolutePath: jest.fn((relativePath) => `/absolute/path/${relativePath}`),
}));

// Export as a module
export default {
  workspace: cocWorkspace,
  window: cocWindow,
  commands: cocCommands,
  LanguageClient: CocLanguageClient,
  ExtensionContext: CocExtensionContext,
};
