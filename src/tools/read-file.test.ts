import { readFile, readFileAi } from './read-file';
import { readFile as fsReadFile } from 'fs/promises';

// Mock the fs/promises module
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

const mockFsReadFile = fsReadFile as jest.Mock;

describe('readFile tool', () => {
  beforeEach(() => {
    mockFsReadFile.mockClear();
  });

  describe('legacy Tool interface', () => {
    it('should return file content on successful read', async () => {
      const mockContent = 'This is the file content.';
      mockFsReadFile.mockResolvedValue(mockContent);

      const result = await readFile.execute({ path: 'test/path/to/file.txt' });

      expect(mockFsReadFile).toHaveBeenCalledWith('test/path/to/file.txt', 'utf-8');
      expect(result).toBe(`File content of test/path/to/file.txt:\n\`\`\`\n${mockContent}\n\`\`\``);
    });

    it('should return an error message if file not found (ENOENT)', async () => {
      const error = new Error('File not found');
      (error as any).code = 'ENOENT';
      mockFsReadFile.mockRejectedValue(error);

      const result = await readFile.execute({ path: 'nonexistent/file.txt' });

      expect(mockFsReadFile).toHaveBeenCalledWith('nonexistent/file.txt', 'utf-8');
      expect(result).toBe('Error: File not found at path "nonexistent/file.txt"');
    });

    it('should return a generic error message for other errors', async () => {
      const errorMessage = 'Permission denied';
      const error = new Error(errorMessage);
      mockFsReadFile.mockRejectedValue(error);

      const result = await readFile.execute({ path: 'protected/file.txt' });

      expect(mockFsReadFile).toHaveBeenCalledWith('protected/file.txt', 'utf-8');
      expect(result).toBe(`Error reading file "protected/file.txt": ${errorMessage}`);
    });
  });

  describe('AI SDK tool interface', () => {
    it('should expose name and schema for AI SDK registration', () => {
      // Optional sanity checks for PoC
      expect((readFileAi as any).name).toBe('read_file');
      expect((readFileAi as any).inputSchema).toBeDefined();
      expect(typeof (readFileAi as any).execute).toBe('function');
    });

    it('should return file content on successful read', async () => {
      const mockContent = 'This is the file content.';
      mockFsReadFile.mockResolvedValue(mockContent);

      const result = await (readFileAi as any).execute({ path: 'test/path/to/file.txt' });

      expect(mockFsReadFile).toHaveBeenCalledWith('test/path/to/file.txt', 'utf-8');
      expect(result).toBe(`File content of test/path/to/file.txt:\n\`\`\`\n${mockContent}\n\`\`\``);
    });

    it('should return an error message if file not found (ENOENT)', async () => {
      const error = new Error('File not found');
      (error as any).code = 'ENOENT';
      mockFsReadFile.mockRejectedValue(error);

      const result = await (readFileAi as any).execute({ path: 'nonexistent/file.txt' });

      expect(mockFsReadFile).toHaveBeenCalledWith('nonexistent/file.txt', 'utf-8');
      expect(result).toBe('Error: File not found at path "nonexistent/file.txt"');
    });

    it('should return a generic error message for other errors', async () => {
      const errorMessage = 'Permission denied';
      const error = new Error(errorMessage);
      mockFsReadFile.mockRejectedValue(error);

      const result = await (readFileAi as any).execute({ path: 'protected/file.txt' });

      expect(mockFsReadFile).toHaveBeenCalledWith('protected/file.txt', 'utf-8');
      expect(result).toBe(`Error reading file "protected/file.txt": ${errorMessage}`);
    });
  });
});