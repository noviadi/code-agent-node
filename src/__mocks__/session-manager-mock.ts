import { SessionManager } from '../cli/session-manager';
import { InteractiveCLIConfig, ConversationMetadata } from '../cli/types';

/**
 * Creates a properly mocked SessionManager for testing
 */
export function createMockSessionManager(): jest.Mocked<SessionManager> {
  const defaultConfig: InteractiveCLIConfig = {
    theme: 'default',
    historySize: 100,
    autoSave: true,
    progressIndicators: true,
    multiLineEditor: true
  };

  const mock = {
    saveConversation: jest.fn().mockResolvedValue(undefined),
    loadConversation: jest.fn().mockResolvedValue([]),
    listConversations: jest.fn().mockResolvedValue([]),
    exportConversation: jest.fn().mockResolvedValue(''),
    getConfig: jest.fn().mockReturnValue(defaultConfig),
    updateConfig: jest.fn().mockResolvedValue(undefined),
    deleteConversation: jest.fn().mockResolvedValue(undefined),
    conversationExists: jest.fn().mockResolvedValue(false),
    startNewConversation: jest.fn(),
    getCurrentConversationName: jest.fn().mockReturnValue(''),
    getCurrentMessages: jest.fn().mockReturnValue([]),
    updateCurrentMessages: jest.fn(),
    addMessageToCurrentConversation: jest.fn(),
    getConversationStorage: jest.fn(),
    getConfigurationManager: jest.fn(),
    // Add any private properties that might be accessed
    configManager: {} as any,
    storageManager: {} as any
  };

  return mock as unknown as jest.Mocked<SessionManager>;
}

/**
 * Creates a mock SessionManager constructor
 */
export function mockSessionManagerConstructor() {
  return jest.fn().mockImplementation(() => createMockSessionManager());
}