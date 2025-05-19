/**
 * Type declarations for coc.nvim
 * This is a simplified version with only the types needed for our Vue.js integration
 */

declare module 'coc.nvim' {
  // Basic types
  export interface CancellationToken {
    isCancellationRequested: boolean;
    onCancellationRequested: Event<any>;
  }

  export interface Disposable {
    dispose(): void;
  }

  export interface Event<T> {
    (listener: (e: T) => any, thisArgs?: any, disposables?: Disposable[]): Disposable;
  }

  // Neovim types
  export interface Neovim {
    command(command: string): Promise<void>;
    eval(expr: string): Promise<any>;
    call(method: string, args?: any[]): Promise<any>;
    createBuffer(listed: boolean, scratch: boolean): Promise<Buffer>;
    getOption(name: string): Promise<any>;
  }

  // Buffer types
  export interface Buffer {
    id: number;
    getLines(start?: number, end?: number, strict?: boolean): Promise<string[]>;
    setLines(lines: string[], options: { start: number; end: number }): Promise<void>;
    getInfo(): Promise<any>;
  }

  // Window types
  export interface Window {
    id: number;
    buffer: Promise<Buffer>;
    close(force?: boolean): Promise<void>;
  }

  // Document types
  export interface Document {
    uri: string;
    languageId: string;
    buffer: Buffer;
  }

  // Extension context
  export interface ExtensionContext {
    subscriptions: Disposable[];
    extensionPath: string;
    asAbsolutePath(path: string): string;
    storagePath: string | undefined;
    globalStoragePath: string;
    workspaceState: Memento;
    globalState: Memento;
    logPath: string;
    nvim: Neovim;
  }

  export interface Memento {
    get<T>(key: string): T | undefined;
    get<T>(key: string, defaultValue: T): T;
    update(key: string, value: any): Promise<void>;
    keys(): readonly string[];
  }

  // Workspace types
  export namespace workspace {
    export const nvim: Neovim;
    export function createFloatWindow(buffer: Buffer | Promise<Buffer>, options: any): Promise<Window>;
    export function showMessage(message: string, severity?: any): void;
    export function showInformationMessage(message: string): Promise<void>;
    export const document: Promise<Document>;
    export function onDidChangeTextDocument(handler: (e: any) => void): Disposable;
    export function onDidChangeCursorPosition(handler: (e: any) => void): Disposable;
    export function getConfiguration(section?: string): any;
  }

  // Commands types
  export namespace commands {
    export function registerCommand(name: string, callback: (...args: any[]) => any, thisArg?: any): Disposable;
    export function executeCommand(command: string, ...args: any[]): Promise<any>;
  }

  // Window types
  export namespace window {
    export function createFloatWindow(buffer: Buffer | Promise<Buffer>, options: any): Promise<Window>;
    export function showInformationMessage(message: string): Promise<void>;
  }

  // Languages types
  export namespace languages {
    export function registerDocumentSelector(selector: string | string[]): void;
  }

  // Services types
  export namespace services {
    export function registLanguageClient(client: any): Disposable;
  }
}
