import { readFile } from './read-file';
import { readFile as fsReadFile } from 'fs/promises';

// Mock the fs/promises module
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

const mockFsReadFile = jest.mocked(fsReadFile);

describe('readFile tool', () => {
  beforeEach(() => {
    mockFsReadFile.mockClear();
  });

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