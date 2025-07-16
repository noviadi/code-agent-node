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

// Error handling types
export enum ErrorCategory {
  INPUT_VALIDATION = 'input_validation',
  NETWORK = 'network',
  FILE_SYSTEM = 'file_system',
  TOOL_EXECUTION = 'tool_execution',
  CONFIGURATION = 'configuration',
  INITIALIZATION = 'initialization',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface CLIError extends Error {
  category: ErrorCategory;
  severity: ErrorSeverity;
  context?: string;
  recoverable: boolean;
  timestamp: Date;
  originalError?: Error;
  getDisplayMessage(): string;
  getDetailedInfo(): string;
}

export interface ErrorRecoveryStrategy {
  canRecover(error: CLIError): boolean;
  recover(error: CLIError): Promise<boolean>;
  getFallbackAction?(error: CLIError): () => Promise<void>;
}

export interface ErrorHandlerConfig {
  enableFallbacks: boolean;
  logErrors: boolean;
  showStackTrace: boolean;
  maxRetries: number;
  retryDelay: number;
}

// Fallback mode configuration
export interface FallbackConfig {
  useBasicReadline: boolean;
  disableColors: boolean;
  disableProgress: boolean;
  disableAutoComplete: boolean;
  disableHistory: boolean;
}