/**
 * Mock amélioré pour coc.nvim
 * Ce mock est plus propre et plus facile à maintenir
 */

// Créer un mock pour nvim
export const mockNvim = {
  call: jest.fn().mockImplementation((method, args) => {
    // Retourner des valeurs par défaut pour les méthodes courantes
    if (method === 'nvim_create_buf') return Promise.resolve(1);
    if (method === 'nvim_buf_set_lines') return Promise.resolve(null);
    if (method === 'nvim_open_win') return Promise.resolve(2);
    return Promise.resolve(null);
  }),
  command: jest.fn().mockResolvedValue(null),
  createNamespace: jest.fn().mockReturnValue(1),
  eval: jest.fn().mockImplementation((expr) => {
    if (expr === '&columns') return Promise.resolve(80);
    if (expr === '&lines') return Promise.resolve(24);
    return Promise.resolve(null);
  }),
  getVar: jest.fn().mockResolvedValue(null),
  getOption: jest.fn().mockImplementation((option) => {
    if (option === 'columns') return Promise.resolve(80);
    if (option === 'lines') return Promise.resolve(24);
    return Promise.resolve(null);
  }),
  createBuffer: jest.fn().mockResolvedValue({
    id: 1,
    name: 'test-buffer',
    getLines: jest.fn().mockResolvedValue(['test']),
    setLines: jest.fn().mockResolvedValue(null),
    getVar: jest.fn().mockResolvedValue(null),
    setVar: jest.fn().mockResolvedValue(null),
    attach: jest.fn().mockResolvedValue(null),
    detach: jest.fn().mockResolvedValue(null),
  }),
  createWindow: jest.fn().mockResolvedValue({
    id: 2,
    buffer: 1,
    position: { line: 0, character: 0 },
    close: jest.fn().mockResolvedValue(null),
  }),
  // Méthode pour réinitialiser tous les mocks
  clearAllMocks: () => {
    mockNvim.call.mockClear();
    mockNvim.command.mockClear();
    mockNvim.createNamespace.mockClear();
    mockNvim.eval.mockClear();
    mockNvim.getVar.mockClear();
    mockNvim.getOption.mockClear();
    mockNvim.createBuffer.mockClear();
    mockNvim.createWindow.mockClear();
  }
};

// Créer un mock pour workspace
export const mockWorkspace = {
  nvim: mockNvim,
  createOutputChannel: jest.fn().mockReturnValue({
    name: 'test-channel',
    append: jest.fn(),
    appendLine: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    clear: jest.fn(),
    dispose: jest.fn(),
  }),
  onDidOpenTextDocument: jest.fn(),
  onDidCloseTextDocument: jest.fn(),
  onDidChangeTextDocument: jest.fn(),
  registerKeymap: jest.fn(),
  registerAutocmd: jest.fn(),
  registerExprKeymap: jest.fn(),
  showMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showInformationMessage: jest.fn(),
  showQuickpick: jest.fn().mockResolvedValue(null),
  showPrompt: jest.fn().mockResolvedValue(''),
  showInputBox: jest.fn().mockResolvedValue(''),
  openResource: jest.fn(),
  jumpTo: jest.fn(),
  getConfiguration: jest.fn().mockReturnValue({
    get: jest.fn().mockImplementation((key, defaultValue) => defaultValue),
    update: jest.fn().mockResolvedValue(null),
    inspect: jest.fn().mockReturnValue(null),
  }),
  // Méthode pour réinitialiser tous les mocks
  clearAllMocks: () => {
    mockWorkspace.createOutputChannel.mockClear();
    mockWorkspace.onDidOpenTextDocument.mockClear();
    mockWorkspace.onDidCloseTextDocument.mockClear();
    mockWorkspace.onDidChangeTextDocument.mockClear();
    mockWorkspace.registerKeymap.mockClear();
    mockWorkspace.registerAutocmd.mockClear();
    mockWorkspace.registerExprKeymap.mockClear();
    mockWorkspace.showMessage.mockClear();
    mockWorkspace.showErrorMessage.mockClear();
    mockWorkspace.showWarningMessage.mockClear();
    mockWorkspace.showInformationMessage.mockClear();
    mockWorkspace.showQuickpick.mockClear();
    mockWorkspace.showPrompt.mockClear();
    mockWorkspace.showInputBox.mockClear();
    mockWorkspace.openResource.mockClear();
    mockWorkspace.jumpTo.mockClear();
    mockWorkspace.getConfiguration.mockClear();
  }
};

// Fonction utilitaire pour réinitialiser tous les mocks
export function resetAllMocks() {
  mockNvim.clearAllMocks();
  mockWorkspace.clearAllMocks();
}

// Exporter le module coc.nvim mocké
export default {
  workspace: mockWorkspace,
  Disposable: class Disposable {
    dispose: () => void;
    
    constructor(fn?: () => void) {
      this.dispose = fn || (() => {});
    }
    
    static create(fn?: () => void): Disposable {
      return new Disposable(fn);
    }
  },
  Uri: {
    parse: jest.fn().mockImplementation((uri) => ({ toString: () => uri })),
    file: jest.fn().mockImplementation((path) => ({ toString: () => `file://${path}` })),
  },
  events: {
    on: jest.fn(),
    off: jest.fn(),
    fire: jest.fn(),
  },
  window: {
    showMessage: mockWorkspace.showMessage,
    showErrorMessage: mockWorkspace.showErrorMessage,
    showWarningMessage: mockWorkspace.showWarningMessage,
    showInformationMessage: mockWorkspace.showInformationMessage,
    showQuickpick: mockWorkspace.showQuickpick,
    showPrompt: mockWorkspace.showPrompt,
    showInputBox: mockWorkspace.showInputBox,
    createOutputChannel: mockWorkspace.createOutputChannel,
    createTerminal: jest.fn().mockReturnValue({
      sendText: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    }),
  },
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn().mockResolvedValue(null),
  },
  languages: {
    registerCompletionItemProvider: jest.fn(),
    registerHoverProvider: jest.fn(),
    registerDefinitionProvider: jest.fn(),
    registerDocumentSymbolProvider: jest.fn(),
    registerWorkspaceSymbolProvider: jest.fn(),
    registerReferenceProvider: jest.fn(),
    registerDocumentFormatProvider: jest.fn(),
    registerDocumentRangeFormatProvider: jest.fn(),
    registerCodeActionProvider: jest.fn(),
    registerCodeLensProvider: jest.fn(),
    registerDocumentLinkProvider: jest.fn(),
    registerColorProvider: jest.fn(),
    registerFoldingRangeProvider: jest.fn(),
    registerSelectionRangeProvider: jest.fn(),
    registerCallHierarchyProvider: jest.fn(),
    registerSemanticTokensProvider: jest.fn(),
    registerInlayHintsProvider: jest.fn(),
  },
  CompletionItemKind: {
    Text: 1,
    Method: 2,
    Function: 3,
    Constructor: 4,
    Field: 5,
    Variable: 6,
    Class: 7,
    Interface: 8,
    Module: 9,
    Property: 10,
    Unit: 11,
    Value: 12,
    Enum: 13,
    Keyword: 14,
    Snippet: 15,
    Color: 16,
    File: 17,
    Reference: 18,
    Folder: 19,
    EnumMember: 20,
    Constant: 21,
    Struct: 22,
    Event: 23,
    Operator: 24,
    TypeParameter: 25,
  },
  CompletionItemTag: {
    Deprecated: 1,
  },
  DiagnosticSeverity: {
    Error: 1,
    Warning: 2,
    Information: 3,
    Hint: 4,
  },
  SymbolKind: {
    File: 1,
    Module: 2,
    Namespace: 3,
    Package: 4,
    Class: 5,
    Method: 6,
    Property: 7,
    Field: 8,
    Constructor: 9,
    Enum: 10,
    Interface: 11,
    Function: 12,
    Variable: 13,
    Constant: 14,
    String: 15,
    Number: 16,
    Boolean: 17,
    Array: 18,
    Object: 19,
    Key: 20,
    Null: 21,
    EnumMember: 22,
    Struct: 23,
    Event: 24,
    Operator: 25,
    TypeParameter: 26,
  },
};
