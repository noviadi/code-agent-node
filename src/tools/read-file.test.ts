import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileAi } from './read-file';
import { readFile as fsReadFile } from 'fs/promises';

// Mock the fs/promises module with Vitest
import { NodeError } from '../types';

vi.mock('fs/promises');

describe('readFileAi', () => {
  const mockFsReadFile = fsReadFile as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Vercel AI SDK tool interface', () => {
    it('should expose required properties for AI SDK registration', () => {
      expect(readFileAi.description).toBeDefined();
      expect(readFileAi.inputSchema).toBeDefined();
      expect(typeof readFileAi.execute).toBe('function');
    });
  });

  describe('execute', () => {
    it('should read file content successfully', async () => {
      const mockContent = 'Hello, World!';
      mockFsReadFile.mockResolvedValue(mockContent);

      const result = await readFileAi.execute({ path: 'test.txt' });

      expect(mockFsReadFile).toHaveBeenCalledWith('test.txt', 'utf-8');
      expect(result).toContain(mockContent);
      expect(result).toContain('File content of test.txt:');
    });

    it('should return error message if file does not exist', async () => {
      const error = new Error('ENOENT: no such file or directory') as NodeError;
      error.code = 'ENOENT';
      mockFsReadFile.mockRejectedValue(error);

      const result = await readFileAi.execute({ path: 'nonexistent/file.txt' });

      expect(result).toBe('Error: File not found at path "nonexistent/file.txt"');
    });

    it('should return generic error message for other errors', async () => {
      const error = new Error('Permission denied');
      mockFsReadFile.mockRejectedValue(error);

      const result = await readFileAi.execute({ path: 'protected/file.txt' });

      expect(result).toContain('Error reading file "protected/file.txt": Permission denied');
    });
  });
});