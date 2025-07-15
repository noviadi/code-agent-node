import { SessionManager } from './session-manager';
import { ConversationStorage } from './components/conversation-storage';
import { InteractiveCLIConfig, ConversationMetadata } from './types';

// Mock the ConversationStorage
jest.mock('./components/conversation-storage');

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let mockStorage: jest.Mocked<ConversationStorage>;
  let mockConfig: InteractiveCLIConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock config
    mockConfig = {
      theme: 'default',
      historySize: 100,
      autoSave: true,
      progressIndicators: true,
      multiLineEditor: true
    };

    // Create SessionManager instance
    sessionManager = new SessionManager(mockConfig, './test-conversations');

    // Get the mocked storage instance
    mockStorage = (sessionManager as any).storage as jest.Mocked<ConversationStorage>;
  });

  describe('constructor', () => {
    it('should initialize with provided config and storage directory', () => {
      expect(ConversationStorage).toHaveBeenCalledWith('./test-conversations');
      expect(sessionManager.getCurrentConversationName()).toBeNull();
      expect(sessionManager.getCurrentMessages()).toEqual([]);
    });

    it('should use default storage directory when not provided', () => {
      new SessionManager(mockConfig);
      expect(ConversationStorage).toHaveBeenCalledWith(undefined);
    });
  });

  describe('saveConversation', () => {
    const testMessages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ];

    it('should save conversation successfully', async () => {
      mockStorage.save.mockResolvedValue();

      await sessionManager.saveConversation('test-conversation', testMessages);

      expect(mockStorage.save).toHaveBeenCalledWith('test-conversation', testMessages);
      expect(sessionManager.getCurrentConversationName()).toBe('test-conversation');
      expect(sessionManager.getCurrentMessages()).toEqual(testMessages);
    });

    it('should trim conversation name', async () => {
      mockStorage.save.mockResolvedValue();

      await sessionManager.saveConversation('  test-conversation  ', testMessages);

      expect(mockStorage.save).toHaveBeenCalledWith('test-conversation', testMessages);
      expect(sessionManager.getCurrentConversationName()).toBe('test-conversation');
    });

    it('should throw error for empty conversation name', async () => {
      await expect(sessionManager.saveConversation('', testMessages))
        .rejects.toThrow('Conversation name cannot be empty');

      await expect(sessionManager.saveConversation('   ', testMessages))
        .rejects.toThrow('Conversation name cannot be empty');
    });

    it('should throw error for empty messages', async () => {
      await expect(sessionManager.saveConversation('test', []))
        .rejects.toThrow('Cannot save empty conversation');

      await expect(sessionManager.saveConversation('test', null as any))
        .rejects.toThrow('Cannot save empty conversation');
    });

    it('should handle storage errors', async () => {
      const storageError = new Error('Storage failed');
      mockStorage.save.mockRejectedValue(storageError);

      await expect(sessionManager.saveConversation('test', testMessages))
        .rejects.toThrow('Failed to save conversation \'test\': Storage failed');
    });
  });

  describe('loadConversation', () => {
    const testMessages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ];

    it('should load conversation successfully', async () => {
      mockStorage.load.mockResolvedValue(testMessages);

      const result = await sessionManager.loadConversation('test-conversation');

      expect(mockStorage.load).toHaveBeenCalledWith('test-conversation');
      expect(result).toEqual(testMessages);
      expect(sessionManager.getCurrentConversationName()).toBe('test-conversation');
      expect(sessionManager.getCurrentMessages()).toEqual(testMessages);
    });

    it('should trim conversation name', async () => {
      mockStorage.load.mockResolvedValue(testMessages);

      await sessionManager.loadConversation('  test-conversation  ');

      expect(mockStorage.load).toHaveBeenCalledWith('test-conversation');
      expect(sessionManager.getCurrentConversationName()).toBe('test-conversation');
    });

    it('should throw error for empty conversation name', async () => {
      await expect(sessionManager.loadConversation(''))
        .rejects.toThrow('Conversation name cannot be empty');

      await expect(sessionManager.loadConversation('   '))
        .rejects.toThrow('Conversation name cannot be empty');
    });

    it('should handle storage errors', async () => {
      const storageError = new Error('Conversation not found');
      mockStorage.load.mockRejectedValue(storageError);

      await expect(sessionManager.loadConversation('test'))
        .rejects.toThrow('Failed to load conversation \'test\': Conversation not found');
    });
  });

  describe('listConversations', () => {
    const testMetadata: ConversationMetadata[] = [
      {
        id: 'conv1',
        name: 'conversation-1',
        created: new Date('2023-01-01'),
        lastModified: new Date('2023-01-02'),
        messageCount: 5
      },
      {
        id: 'conv2',
        name: 'conversation-2',
        created: new Date('2023-01-03'),
        lastModified: new Date('2023-01-04'),
        messageCount: 3
      }
    ];

    it('should list conversations successfully', async () => {
      mockStorage.list.mockResolvedValue(testMetadata);

      const result = await sessionManager.listConversations();

      expect(mockStorage.list).toHaveBeenCalled();
      expect(result).toEqual(testMetadata);
    });

    it('should handle storage errors', async () => {
      const storageError = new Error('Failed to read directory');
      mockStorage.list.mockRejectedValue(storageError);

      await expect(sessionManager.listConversations())
        .rejects.toThrow('Failed to list conversations: Failed to read directory');
    });
  });

  describe('exportConversation', () => {
    const exportedData = '{"metadata":{},"messages":[]}';

    it('should export conversation in JSON format', async () => {
      mockStorage.export.mockResolvedValue(exportedData);

      const result = await sessionManager.exportConversation('test', 'json');

      expect(mockStorage.export).toHaveBeenCalledWith('test', 'json');
      expect(result).toBe(exportedData);
    });

    it('should export conversation in Markdown format', async () => {
      const markdownData = '# Conversation: test\n\n## User\n\nHello';
      mockStorage.export.mockResolvedValue(markdownData);

      const result = await sessionManager.exportConversation('test', 'markdown');

      expect(mockStorage.export).toHaveBeenCalledWith('test', 'markdown');
      expect(result).toBe(markdownData);
    });

    it('should trim conversation name', async () => {
      mockStorage.export.mockResolvedValue(exportedData);

      await sessionManager.exportConversation('  test  ', 'json');

      expect(mockStorage.export).toHaveBeenCalledWith('test', 'json');
    });

    it('should throw error for empty conversation name', async () => {
      await expect(sessionManager.exportConversation('', 'json'))
        .rejects.toThrow('Conversation name cannot be empty');
    });

    it('should throw error for unsupported format', async () => {
      await expect(sessionManager.exportConversation('test', 'xml' as any))
        .rejects.toThrow('Unsupported export format: xml. Supported formats: json, markdown');
    });

    it('should handle storage errors', async () => {
      const storageError = new Error('Export failed');
      mockStorage.export.mockRejectedValue(storageError);

      await expect(sessionManager.exportConversation('test', 'json'))
        .rejects.toThrow('Failed to export conversation \'test\': Export failed');
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation successfully', async () => {
      mockStorage.delete.mockResolvedValue();

      await sessionManager.deleteConversation('test-conversation');

      expect(mockStorage.delete).toHaveBeenCalledWith('test-conversation');
    });

    it('should clear current conversation if deleted', async () => {
      mockStorage.delete.mockResolvedValue();
      
      // Set current conversation
      (sessionManager as any).currentConversation = 'test-conversation';
      (sessionManager as any).currentMessages = [{ role: 'user', content: 'test' }];

      await sessionManager.deleteConversation('test-conversation');

      expect(sessionManager.getCurrentConversationName()).toBeNull();
      expect(sessionManager.getCurrentMessages()).toEqual([]);
    });

    it('should not clear current conversation if different one deleted', async () => {
      mockStorage.delete.mockResolvedValue();
      
      // Set current conversation
      (sessionManager as any).currentConversation = 'current-conversation';
      (sessionManager as any).currentMessages = [{ role: 'user', content: 'test' }];

      await sessionManager.deleteConversation('other-conversation');

      expect(sessionManager.getCurrentConversationName()).toBe('current-conversation');
      expect(sessionManager.getCurrentMessages()).toEqual([{ role: 'user', content: 'test' }]);
    });

    it('should throw error for empty conversation name', async () => {
      await expect(sessionManager.deleteConversation(''))
        .rejects.toThrow('Conversation name cannot be empty');
    });

    it('should handle storage errors', async () => {
      const storageError = new Error('Delete failed');
      mockStorage.delete.mockRejectedValue(storageError);

      await expect(sessionManager.deleteConversation('test'))
        .rejects.toThrow('Failed to delete conversation \'test\': Delete failed');
    });
  });

  describe('conversationExists', () => {
    it('should return true if conversation exists', async () => {
      mockStorage.exists.mockResolvedValue(true);

      const result = await sessionManager.conversationExists('test');

      expect(mockStorage.exists).toHaveBeenCalledWith('test');
      expect(result).toBe(true);
    });

    it('should return false if conversation does not exist', async () => {
      mockStorage.exists.mockResolvedValue(false);

      const result = await sessionManager.conversationExists('test');

      expect(result).toBe(false);
    });

    it('should return false for empty name', async () => {
      const result = await sessionManager.conversationExists('');

      expect(result).toBe(false);
      expect(mockStorage.exists).not.toHaveBeenCalled();
    });

    it('should return false on storage errors', async () => {
      mockStorage.exists.mockRejectedValue(new Error('Storage error'));

      const result = await sessionManager.conversationExists('test');

      expect(result).toBe(false);
    });
  });

  describe('startNewConversation', () => {
    it('should clear current conversation state', async () => {
      // Set current conversation
      (sessionManager as any).currentConversation = 'old-conversation';
      (sessionManager as any).currentMessages = [{ role: 'user', content: 'test' }];

      await sessionManager.startNewConversation();

      expect(sessionManager.getCurrentConversationName()).toBeNull();
      expect(sessionManager.getCurrentMessages()).toEqual([]);
    });

    it('should save current conversation if requested', async () => {
      mockStorage.save.mockResolvedValue();
      
      // Set current conversation with messages
      (sessionManager as any).currentMessages = [{ role: 'user', content: 'test' }];

      await sessionManager.startNewConversation('saved-conversation');

      expect(mockStorage.save).toHaveBeenCalledWith('saved-conversation', [{ role: 'user', content: 'test' }]);
      expect(sessionManager.getCurrentConversationName()).toBeNull();
      expect(sessionManager.getCurrentMessages()).toEqual([]);
    });

    it('should not save if no messages exist', async () => {
      await sessionManager.startNewConversation('saved-conversation');

      expect(mockStorage.save).not.toHaveBeenCalled();
    });
  });

  describe('message management', () => {
    const testMessage = { role: 'user', content: 'Hello' };
    const testMessages = [testMessage, { role: 'assistant', content: 'Hi!' }];

    it('should update current messages', () => {
      sessionManager.updateCurrentMessages(testMessages);

      expect(sessionManager.getCurrentMessages()).toEqual(testMessages);
    });

    it('should add message to current conversation', () => {
      sessionManager.addMessageToCurrentConversation(testMessage);

      expect(sessionManager.getCurrentMessages()).toEqual([testMessage]);
    });

    it('should return copy of messages to prevent mutation', () => {
      sessionManager.updateCurrentMessages(testMessages);
      
      const messages = sessionManager.getCurrentMessages();
      messages.push({ role: 'user', content: 'Modified' });

      expect(sessionManager.getCurrentMessages()).toEqual(testMessages);
    });
  });

  describe('autoSaveIfEnabled', () => {
    beforeEach(() => {
      // Set up current conversation
      (sessionManager as any).currentConversation = 'test-conversation';
      (sessionManager as any).currentMessages = [{ role: 'user', content: 'test' }];
    });

    it('should auto-save when enabled and conversation exists', async () => {
      mockStorage.save.mockResolvedValue();
      mockConfig.autoSave = true;

      await sessionManager.autoSaveIfEnabled();

      expect(mockStorage.save).toHaveBeenCalledWith('test-conversation', [{ role: 'user', content: 'test' }]);
    });

    it('should not auto-save when disabled', async () => {
      mockConfig.autoSave = false;

      await sessionManager.autoSaveIfEnabled();

      expect(mockStorage.save).not.toHaveBeenCalled();
    });

    it('should not auto-save when no current conversation', async () => {
      mockConfig.autoSave = true;
      (sessionManager as any).currentConversation = null;

      await sessionManager.autoSaveIfEnabled();

      expect(mockStorage.save).not.toHaveBeenCalled();
    });

    it('should not auto-save when no messages', async () => {
      mockConfig.autoSave = true;
      (sessionManager as any).currentMessages = [];

      await sessionManager.autoSaveIfEnabled();

      expect(mockStorage.save).not.toHaveBeenCalled();
    });

    it('should handle auto-save errors gracefully', async () => {
      mockConfig.autoSave = true;
      mockStorage.save.mockRejectedValue(new Error('Save failed'));
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await expect(sessionManager.autoSaveIfEnabled()).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Auto-save failed: Failed to save conversation \'test-conversation\': Save failed');
      
      consoleSpy.mockRestore();
    });
  });
});