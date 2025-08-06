import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listFilesAi } from './list-files';
import { readdir } from 'fs/promises';

vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
}));

const mockReaddir = readdir as unknown as ReturnType<typeof vi.fn>;

function makeDirent(name: string, isDir: boolean) {
  return {
    name,
    isDirectory: () => isDir,
  } as unknown as import('fs').Dirent;
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

    it('returns not found error for ENOENT', async () => {
      const err: any = new Error('Not found');
      err.code = 'ENOENT';
      (mockReaddir as any).mockRejectedValueOnce(err);

      const result = await listFilesAi.execute({ path: 'missing' });

      expect(mockReaddir).toHaveBeenCalledWith('missing', { withFileTypes: true });
      expect(result).toBe('Error: Path not found - missing');
    });

    it('returns generic error for other fs errors', async () => {
      const err = new Error('Permission denied');
      (mockReaddir as any).mockRejectedValueOnce(err);

      const result = await listFilesAi.execute({ path: 'protected' });

      expect(mockReaddir).toHaveBeenCalledWith('protected', { withFileTypes: true });
      expect(result).toBe('Error listing files: Permission denied');
    });
  });
});