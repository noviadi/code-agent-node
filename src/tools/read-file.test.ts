import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileAi } from './read-file';
import { readFile as fsReadFile } from 'fs/promises';

// Mock the fs/promises module with Vitest
vi.mock('fs/promises', () => ({
  default: {},
  readFile: vi.fn(),
}));

const mockFsReadFile = fsReadFile as unknown as ReturnType<typeof vi.fn>;

describe('readFileAi tool', () => {
  beforeEach(() => {
    (mockFsReadFile as any).mockClear?.();
  });

  describe('Vercel AI SDK tool interface', () => {
    it('should expose required properties for AI SDK registration', () => {
      expect(readFileAi.description).toBeDefined();
      expect(readFileAi.inputSchema).toBeDefined();
      expect(typeof readFileAi.execute).toBe('function');
    });

    it('should return file content on successful read', async () => {
      const mockContent = 'This is the file content.';
      (mockFsReadFile as any).mockResolvedValue(mockContent);

      const result = await readFileAi.execute({ path: 'test/path/to/file.txt' });

      expect(mockFsReadFile).toHaveBeenCalledWith('test/path/to/file.txt', 'utf-8');
      expect(result).toBe(`File content of test/path/to/file.txt:\n\`\`\`\n${mockContent}\n\`\`\``);
    });

    it('should return an error message if file not found (ENOENT)', async () => {
      const error = new Error('File not found');
      (error as any).code = 'ENOENT';
      (mockFsReadFile as any).mockRejectedValue(error);

      const result = await (readFileAi as any).execute({ path: 'nonexistent/file.txt' });

      expect(mockFsReadFile).toHaveBeenCalledWith('nonexistent/file.txt', 'utf-8');
      expect(result).toBe('Error: File not found at path "nonexistent/file.txt"');
    });

    it('should return a generic error message for other errors', async () => {
      const errorMessage = 'Permission denied';
      const error = new Error(errorMessage);
      (mockFsReadFile as any).mockRejectedValue(error);

      const result = await (readFileAi as any).execute({ path: 'protected/file.txt' });

      expect(mockFsReadFile).toHaveBeenCalledWith('protected/file.txt', 'utf-8');
      expect(result).toBe(`Error reading file "protected/file.txt": ${errorMessage}`);
    });
  });
});