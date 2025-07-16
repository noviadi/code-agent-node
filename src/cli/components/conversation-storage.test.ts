import * as fs from 'fs/promises';
import * as path from 'path';
import { ConversationStorage } from './conversation-storage';
import { ConversationMetadata } from '../types';

// Mock fs/promises
jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

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
      mockedFs.access.mockRejectedValue(new Error('Directory does not exist'));
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);
    });

    it('should create storage directory if it does not exist', async () => {
      await storage.save('test-conversation', testMessages);
      
      expect(mockedFs.access).toHaveBeenCalledWith(testStorageDir);
      expect(mockedFs.mkdir).toHaveBeenCalledWith(testStorageDir, { recursive: true });
    });

    it('should not create directory if it already exists', async () => {
      mockedFs.access.mockResolvedValue(undefined);
      
      await storage.save('test-conversation', testMessages);
      
      expect(mockedFs.access).toHaveBeenCalledWith(testStorageDir);
      expect(mockedFs.mkdir).not.toHaveBeenCalled();
    });

    it('should save conversation with metadata', async () => {
      const mockDate = new Date('2023-01-01T00:00:00.000Z');
      jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());
      jest.spyOn(Math, 'random').mockReturnValue(0.123456789);

      await storage.save('test-conversation', testMessages);

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        path.join(testStorageDir, 'test-conversation.json'),
        expect.stringContaining('"name": "test-conversation"'),
        'utf-8'
      );

      const writeCall = mockedFs.writeFile.mock.calls[0];
      const savedData = JSON.parse(writeCall[1] as string);
      
      expect(savedData.metadata).toMatchObject({
        name: 'test-conversation',
        messageCount: 2
      });
      expect(savedData.messages).toEqual(testMessages);
    });

    it('should sanitize conversation name for file path', async () => {
      await storage.save('test/conversation with spaces!', testMessages);
      
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
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
      mockedFs.readFile.mockResolvedValue(JSON.stringify(existingConversation));

      await storage.save('test-conversation', testMessages);

      const writeCall = mockedFs.writeFile.mock.calls[0];
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
      mockedFs.readFile.mockResolvedValue(JSON.stringify(testConversation));

      const result = await storage.load('test-conversation');

      expect(mockedFs.readFile).toHaveBeenCalledWith(
        path.join(testStorageDir, 'test-conversation.json'),
        'utf-8'
      );
      expect(result).toEqual(testConversation.messages);
    });

    it('should throw error when conversation not found', async () => {
      const error = new Error('File not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockedFs.readFile.mockRejectedValue(error);

      await expect(storage.load('nonexistent')).rejects.toThrow(
        "Conversation 'nonexistent' not found"
      );
    });

    it('should throw error for other file system errors', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('Permission denied'));

      await expect(storage.load('test-conversation')).rejects.toThrow(
        "Failed to load conversation 'test-conversation': Permission denied"
      );
    });
  });

  describe('list', () => {
    beforeEach(() => {
      mockedFs.access.mockResolvedValue(undefined);
    });

    it('should return empty array when no conversations exist', async () => {
      mockedFs.readdir.mockResolvedValue([]);

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

      mockedFs.readdir.mockResolvedValue(['conversation1.json', 'conversation2.json', 'not-json.txt'] as any);
      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(conversation1))
        .mockResolvedValueOnce(JSON.stringify(conversation2));

      const result = await storage.list();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('conversation2'); // More recent first
      expect(result[1].name).toBe('conversation1');
    });

    it('should skip corrupted files and warn', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      mockedFs.readdir.mockResolvedValue(['good.json', 'corrupted.json'] as any);
      mockedFs.readFile
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
      mockedFs.access.mockRejectedValue(new Error('Directory does not exist'));
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.readdir.mockResolvedValue([]);

      await storage.list();

      expect(mockedFs.mkdir).toHaveBeenCalledWith(testStorageDir, { recursive: true });
    });
  });

  describe('delete', () => {
    it('should delete conversation successfully', async () => {
      mockedFs.unlink.mockResolvedValue(undefined);

      await storage.delete('test-conversation');

      expect(mockedFs.unlink).toHaveBeenCalledWith(
        path.join(testStorageDir, 'test-conversation.json')
      );
    });

    it('should throw error when conversation not found', async () => {
      const error = new Error('File not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockedFs.unlink.mockRejectedValue(error);

      await expect(storage.delete('nonexistent')).rejects.toThrow(
        "Conversation 'nonexistent' not found"
      );
    });

    it('should throw error for other file system errors', async () => {
      mockedFs.unlink.mockRejectedValue(new Error('Permission denied'));

      await expect(storage.delete('test-conversation')).rejects.toThrow(
        "Failed to delete conversation 'test-conversation': Permission denied"
      );
    });
  });

  describe('exists', () => {
    it('should return true when conversation exists', async () => {
      mockedFs.access.mockResolvedValue(undefined);

      const result = await storage.exists('test-conversation');

      expect(result).toBe(true);
      expect(mockedFs.access).toHaveBeenCalledWith(
        path.join(testStorageDir, 'test-conversation.json')
      );
    });

    it('should return false when conversation does not exist', async () => {
      mockedFs.access.mockRejectedValue(new Error('File not found'));

      const result = await storage.exists('nonexistent');

      expect(result).toBe(false);
    });
  });
});