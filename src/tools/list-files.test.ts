import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listFilesAi } from './list-files';
import { readdir } from 'fs/promises';
import { NodeError } from '../types';

vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
}));

const mockReaddir = readdir as unknown as ReturnType<typeof vi.fn>;

function makeDirent(name: string, isDir: boolean) {
  return {
    name,
    isDirectory: () => isDir,
  } as unknown as import('fs').Dirent; // Corrected type to Dirent
}

describe('listFilesAi tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Vercel AI SDK tool interface', () => {
    it('should expose required properties for AI SDK registration', () => {
      expect(listFilesAi.description).toBeDefined();
      expect(listFilesAi.inputSchema).toBeDefined();
      expect(typeof listFilesAi.execute).toBe('function');
    });
  });

  describe('execute', () => { // Grouped execute tests
    it('lists files and directories in current directory when no path provided', async () => {
      (mockReaddir as any).mockResolvedValueOnce([
        makeDirent('src', true),
        makeDirent('package.json', false),
      ]);

      const result = await listFilesAi.execute({});

      expect(mockReaddir).toHaveBeenCalledWith('.', { withFileTypes: true });
      expect(result.split('\n')).toEqual(['src/', 'package.json']);
    });

    it('lists files and directories for a provided path', async () => {
      (mockReaddir as any).mockResolvedValueOnce([
        makeDirent('tools', true),
        makeDirent('readme.md', false),
      ]);

      const result = await listFilesAi.execute({ path: 'docs' });

      expect(mockReaddir).toHaveBeenCalledWith('docs', { withFileTypes: true });
      expect(result.split('\n')).toEqual(['tools/', 'readme.md']);
    });

    it('should return error message if path does not exist', async () => { // Updated test description
      const err = new Error('ENOENT: no such file or directory') as NodeError; // Used NodeError
      err.code = 'ENOENT';
      vi.mocked(readdir).mockRejectedValue(err);

      const result = await listFilesAi.execute({ path: 'missing' });

      expect(mockReaddir).toHaveBeenCalledWith('missing', { withFileTypes: true });
      expect(result).toBe('Error: Path not found - missing');
    });

    it('should return generic error message for other errors', async () => { // Updated test description
      const err = new Error('Permission denied');
      (mockReaddir as any).mockRejectedValueOnce(err);

      const result = await listFilesAi.execute({ path: 'protected' });

      expect(mockReaddir).toHaveBeenCalledWith('protected', { withFileTypes: true });
      expect(result).toBe('Error listing files: Permission denied');
    });
  });
});