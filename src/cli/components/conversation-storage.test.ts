import * as fs from 'fs/promises';
import * as path from 'path';
import { ConversationStorage } from './conversation-storage';
import { ConversationMetadata } from '../types';

// Mock fs/promises
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ConversationStorage', () => {
  let storage: ConversationStorage;
  const testStorageDir = './test-conversations';
  
  beforeEach(() => {
    storage = new ConversationStorage(testStorageDir);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use default storage directory when none provided', () => {
      const defaultStorage = new ConversationStorage();
      expect(defaultStorage).toBeInstanceOf(ConversationStorage);
    });

    it('should use provided storage directory', () => {
      const customStorage = new ConversationStorage('/custom/path');
      expect(customStorage).toBeInstanceOf(ConversationStorage);
    });
  });

  describe('save', () => {
    const testMessages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ];

    beforeEach(() => {
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it('should create storage directory if it does not exist', async () => {
      await storage.save('test-conversation', testMessages);
      
      expect(mockFs.access).toHaveBeenCalledWith(testStorageDir);
      expect(mockFs.mkdir).toHaveBeenCalledWith(testStorageDir, { recursive: true });
    });

    it('should not create directory if it already exists', async () => {
      mockFs.access.mockResolvedValue(undefined);
      
      await storage.save('test-conversation', testMessages);
      
      expect(mockFs.access).toHaveBeenCalledWith(testStorageDir);
      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });

    it('should save conversation with metadata', async () => {
      const mockDate = new Date('2023-01-01T00:00:00.000Z');
      jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());
      jest.spyOn(Math, 'random').mockReturnValue(0.123456789);

      await storage.save('test-conversation', testMessages);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(testStorageDir, 'test-conversation.json'),
        expect.stringContaining('"name": "test-conversation"'),
        'utf-8'
      );

      const writeCall = mockFs.writeFile.mock.calls[0];
      const savedData = JSON.parse(writeCall[1] as string);
      
      expect(savedData.metadata).toMatchObject({
        name: 'test-conversation',
        messageCount: 2
      });
      expect(savedData.messages).toEqual(testMessages);
    });

    it('should sanitize conversation name for file path', async () => {
      await storage.save('test/conversation with spaces!', testMessages);
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(testStorageDir, 'test_conversation_with_spaces_.json'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should preserve creation date when updating existing conversation', async () => {
      const existingMetadata = {
        id: 'existing-id',
        name: 'test-conversation',
        created: new Date('2022-01-01T00:00:00.000Z'),
        lastModified: new Date('2022-01-01T00:00:00.000Z'),
        messageCount: 1
      };

      const existingConversation = {
        metadata: existingMetadata,
        messages: [{ role: 'user', content: 'Old message' }]
      };

      // Mock load to return existing conversation
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingConversation));

      await storage.save('test-conversation', testMessages);

      const writeCall = mockFs.writeFile.mock.calls[0];
      const savedData = JSON.parse(writeCall[1] as string);
      
      expect(savedData.metadata.id).toBe('existing-id');
      expect(savedData.metadata.created).toBe(existingMetadata.created.toISOString());
    });
  });

  describe('load', () => {
    const testConversation = {
      metadata: {
        id: 'test-id',
        name: 'test-conversation',
        created: new Date(),
        lastModified: new Date(),
        messageCount: 2
      },
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ]
    };

    it('should load conversation successfully', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(testConversation));

      const result = await storage.load('test-conversation');

      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.join(testStorageDir, 'test-conversation.json'),
        'utf-8'
      );
      expect(result).toEqual(testConversation.messages);
    });

    it('should throw error when conversation not found', async () => {
      const error = new Error('File not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);

      await expect(storage.load('nonexistent')).rejects.toThrow(
        "Conversation 'nonexistent' not found"
      );
    });

    it('should throw error for other file system errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

      await expect(storage.load('test-conversation')).rejects.toThrow(
        "Failed to load conversation 'test-conversation': Permission denied"
      );
    });
  });

  describe('list', () => {
    beforeEach(() => {
      mockFs.access.mockResolvedValue(undefined);
    });

    it('should return empty array when no conversations exist', async () => {
      mockFs.readdir.mockResolvedValue([]);

      const result = await storage.list();

      expect(result).toEqual([]);
    });

    it('should list all conversations sorted by last modified date', async () => {
      const conversation1 = {
        metadata: {
          id: 'conv1',
          name: 'conversation1',
          created: new Date('2023-01-01'),
          lastModified: new Date('2023-01-02'),
          messageCount: 1
        },
        messages: []
      };

      const conversation2 = {
        metadata: {
          id: 'conv2',
          name: 'conversation2',
          created: new Date('2023-01-01'),
          lastModified: new Date('2023-01-03'),
          messageCount: 2
        },
        messages: []
      };

      mockFs.readdir.mockResolvedValue(['conversation1.json', 'conversation2.json', 'not-json.txt'] as any);
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(conversation1))
        .mockResolvedValueOnce(JSON.stringify(conversation2));

      const result = await storage.list();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('conversation2'); // More recent first
      expect(result[1].name).toBe('conversation1');
    });

    it('should skip corrupted files and warn', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      mockFs.readdir.mockResolvedValue(['good.json', 'corrupted.json'] as any);
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify({
          metadata: { id: 'good', name: 'good', created: new Date(), lastModified: new Date(), messageCount: 0 },
          messages: []
        }))
        .mockRejectedValueOnce(new Error('Invalid JSON'));

      const result = await storage.list();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('good');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Could not read conversation file corrupted.json')
      );

      consoleSpy.mockRestore();
    });

    it('should create storage directory if it does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      await storage.list();

      expect(mockFs.mkdir).toHaveBeenCalledWith(testStorageDir, { recursive: true });
    });
  });

  describe('delete', () => {
    it('should delete conversation successfully', async () => {
      mockFs.unlink.mockResolvedValue(undefined);

      await storage.delete('test-conversation');

      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(testStorageDir, 'test-conversation.json')
      );
    });

    it('should throw error when conversation not found', async () => {
      const error = new Error('File not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.unlink.mockRejectedValue(error);

      await expect(storage.delete('nonexistent')).rejects.toThrow(
        "Conversation 'nonexistent' not found"
      );
    });

    it('should throw error for other file system errors', async () => {
      mockFs.unlink.mockRejectedValue(new Error('Permission denied'));

      await expect(storage.delete('test-conversation')).rejects.toThrow(
        "Failed to delete conversation 'test-conversation': Permission denied"
      );
    });
  });

  describe('export', () => {
    const testMetadata: ConversationMetadata = {
      id: 'test-id',
      name: 'test-conversation',
      created: new Date('2023-01-01T10:00:00.000Z'),
      lastModified: new Date('2023-01-02T15:30:00.000Z'),
      messageCount: 3
    };

    const testMessages = [
      { role: 'user', content: 'Hello Claude' },
      { 
        role: 'assistant', 
        content: 'Hello! How can I help?',
        tool_calls: [
          {
            function: {
              name: 'test_tool',
              arguments: { param: 'value' }
            }
          }
        ]
      },
      { 
        role: 'tool',
        content: 'Tool result',
        tool_call_id: 'call_123'
      }
    ];

    beforeEach(() => {
      // Mock load method
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        metadata: testMetadata,
        messages: testMessages
      }));

      // Mock list method
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(['test-conversation.json'] as any);
    });

    it('should export conversation as JSON', async () => {
      const result = await storage.export('test-conversation', 'json');

      const parsed = JSON.parse(result);
      expect(parsed.metadata.id).toBe(testMetadata.id);
      expect(parsed.metadata.name).toBe(testMetadata.name);
      expect(parsed.metadata.messageCount).toBe(testMetadata.messageCount);
      expect(new Date(parsed.metadata.created)).toEqual(testMetadata.created);
      expect(new Date(parsed.metadata.lastModified)).toEqual(testMetadata.lastModified);
      expect(parsed.messages).toEqual(testMessages);
    });

    it('should export conversation as Markdown', async () => {
      const result = await storage.export('test-conversation', 'markdown');

      expect(result).toContain('# Conversation: test-conversation');
      expect(result).toContain('**Created:**');
      expect(result).toContain('**Last Modified:**');
      expect(result).toContain('**Messages:** 3');
      expect(result).toContain('## User');
      expect(result).toContain('Hello Claude');
      expect(result).toContain('## Assistant');
      expect(result).toContain('Hello! How can I help?');
      expect(result).toContain('### Tool Calls');
      expect(result).toContain('**test_tool**');
      expect(result).toContain('*Tool Response (ID: call_123)*');
    });

    it('should throw error for unsupported format', async () => {
      await expect(storage.export('test-conversation', 'xml' as any)).rejects.toThrow(
        'Unsupported export format: xml'
      );
    });

    it('should throw error when conversation not found for export', async () => {
      mockFs.readdir.mockResolvedValue([]);

      await expect(storage.export('nonexistent', 'json')).rejects.toThrow(
        "Conversation 'nonexistent' not found"
      );
    });
  });

  describe('exists', () => {
    it('should return true when conversation exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await storage.exists('test-conversation');

      expect(result).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith(
        path.join(testStorageDir, 'test-conversation.json')
      );
    });

    it('should return false when conversation does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));

      const result = await storage.exists('nonexistent');

      expect(result).toBe(false);
    });
  });
});