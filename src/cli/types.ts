// Core CLI configuration interface
export interface InteractiveCLIConfig {
  theme: string;
  historySize: number;
  autoSave: boolean;
  progressIndicators: boolean;
  multiLineEditor: boolean;
}

// Input handling types
export interface InputOptions {
  multiLine?: boolean;
  autoComplete?: boolean;
  history?: boolean;
}

// Display types
export interface DisplayOptions {
  color?: string;
  prefix?: string;
  indent?: number;
  animate?: boolean;
}

export enum MessageType {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  ERROR = 'error',
  SUCCESS = 'success',
  WARNING = 'warning',
  TOOL = 'tool'
}

// Command types
export interface SpecialCommand {
  name: string;
  description: string;
  handler: (args: string[]) => Promise<void>;
  autoComplete?: () => string[];
}

// Theme types
export interface Theme {
  name: string;
  colors: {
    user: string;
    assistant: string;
    system: string;
    error: string;
    success: string;
    warning: string;
    tool: string;
    prompt: string;
  };
  symbols: {
    user: string;
    assistant: string;
    loading: string[];
    success: string;
    error: string;
  };
}

// History types
export interface HistoryEntry {
  command: string;
  timestamp: Date;
  success: boolean;
}

// Conversation types
export interface ConversationMetadata {
  id: string;
  name: string;
  created: Date;
  lastModified: Date;
  messageCount: number;
}

// Progress indicator interface
export interface ProgressIndicator {
  start(message: string): void;
  update(message: string): void;
  succeed(message?: string): void;
  fail(message?: string): void;
  stop(): void;
}