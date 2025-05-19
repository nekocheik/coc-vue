// Types communs utilisés dans l'application
export interface BufferContent {
  lines: string[];
  uri: string;
  languageId: string;
  version: number;
}

export interface CursorPosition {
  line: number;
  character: number;
}

export interface EditorState {
  currentFile: string;
  cursorPosition: CursorPosition;
  mode: string;
  isInsertMode: boolean;
  isVisualMode: boolean;
  isCommandMode: boolean;
  selection: any;
}

export interface CommandResult {
  success: boolean;
  data?: any;
  error?: any;
}

export interface WindowOptions {
  width: number;
  height: number;
  title?: string;
  row?: number;
  col?: number;
  relative?: 'editor' | 'cursor' | 'win';
  border?: boolean | string[];
  focusable?: boolean;
}

export type EventHandler = (data: any) => void;

export interface Subscription {
  dispose: () => void;
}
