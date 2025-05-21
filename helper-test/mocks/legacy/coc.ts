/**
 * Mock robuste for coc.nvim
 * Ce mock simule le comportement de coc.nvim pour les tests
 */

// Mock for events
const mockEvents: Record<string, Function[]> = {};

// Mock for workspace
const mockWorkspace = {
  // Event handler
  onDidOpenTextDocument: jest.fn((callback) => {
    if (!mockEvents['openTextDocument']) {
      mockEvents['openTextDocument'] = [];
    }
    mockEvents['openTextDocument'].push(callback);
    return { dispose: () => {} };
  }),
  
  onDidCloseTextDocument: jest.fn((callback) => {
    if (!mockEvents['closeTextDocument']) {
      mockEvents['closeTextDocument'] = [];
    }
    mockEvents['closeTextDocument'].push(callback);
    return { dispose: () => {} };
  }),
  
  onDidChangeTextDocument: jest.fn((callback) => {
    if (!mockEvents['changeTextDocument']) {
      mockEvents['changeTextDocument'] = [];
    }
    mockEvents['changeTextDocument'].push(callback);
    return { dispose: () => {} };
  }),
  
  // Methods for manipulating documents
  getDocument: jest.fn(() => ({
    uri: 'file:///test/document.vue',
    getLines: jest.fn(() => ['<template>', '  <div>', '  </div>', '</template>']),
    getText: jest.fn(() => '<template>\n  <div>\n  </div>\n</template>'),
    lineCount: 4,
    buffer: {
      name: '/test/document.vue',
      getLineCount: jest.fn(() => 4),
      getLines: jest.fn(() => ['<template>', '  <div>', '  </div>', '</template>']),
      append: jest.fn(),
      replace: jest.fn()
    }
  })),
  
  // Methods for creating documents
  createDocument: jest.fn(async (uri) => ({
    uri,
    getLines: jest.fn(() => []),
    getText: jest.fn(() => ''),
    lineCount: 0,
    buffer: {
      name: uri.replace('file://', ''),
      getLineCount: jest.fn(() => 0),
      getLines: jest.fn(() => []),
      append: jest.fn(),
      replace: jest.fn()
    }
  })),
  
  // Methods for working with Neovim
  nvim: {
    call: jest.fn(),
    command: jest.fn(),
    eval: jest.fn(),
    createBuffer: jest.fn(),
    createWindow: jest.fn(),
    createTabpage: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
  },
  
  // Methods for notifications
  showMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showInformationMessage: jest.fn(),
  
  // Methods for commands
  registerCommand: jest.fn(() => ({ dispose: () => {} })),
  executeCommand: jest.fn(),
  
  // Methods for configurations
  getConfiguration: jest.fn((section) => ({
    get: jest.fn((key, defaultValue) => defaultValue),
    update: jest.fn(),
    has: jest.fn(() => false)
  }))
};

// Utility methods for tests
const clearAllMocks = () => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Reset events
  Object.keys(mockEvents).forEach(key => {
    mockEvents[key] = [];
  });
};

// Methods for triggering events
const triggerEvent = (eventName: string, ...args: any[]) => {
  if (mockEvents[eventName]) {
    mockEvents[eventName].forEach(callback => {
      callback(...args);
    });
  }
};

// Expose the mock
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
    parse: jest.fn((uri) => uri),
    file: jest.fn((path) => `file://${path}`),
  },
  Position: class Position {
    line: number;
    character: number;
    
    constructor(line: number, character: number) {
      this.line = line;
      this.character = character;
    }
  },
  Range: class Range {
    start: { line: number, character: number };
    end: { line: number, character: number };
    
    constructor(
      startLine: number, 
      startCharacter: number, 
      endLine: number, 
      endCharacter: number
    ) {
      this.start = { line: startLine, character: startCharacter };
      this.end = { line: endLine, character: endCharacter };
    }
  },
  // Utility methods for tests
  __clearAllMocks: clearAllMocks,
  __triggerEvent: triggerEvent
};
