import { listFiles } from './list-files';
import { listFilesAi } from './list-files';
import { readdir } from 'fs/promises';

jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
}));

const mockReaddir = readdir as unknown as jest.Mock;

function makeDirent(name: string, isDir: boolean) {
  return {
    name,
    isDirectory: () => isDir,
  } as unknown as import('fs').Dirent;
}

describe('listFiles tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('legacy Tool interface', () => {
    it('lists files and directories in current directory when no path provided', async () => {
      mockReaddir.mockResolvedValueOnce([
        makeDirent('src', true),
        makeDirent('package.json', false),
      ]);

      const result = await listFiles.execute({});

      expect(mockReaddir).toHaveBeenCalledWith('.', { withFileTypes: true });
      expect(result.split('\n')).toEqual(['src/', 'package.json']);
    });

    it('lists files and directories for a provided path', async () => {
      mockReaddir.mockResolvedValueOnce([
        makeDirent('tools', true),
        makeDirent('readme.md', false),
      ]);

      const result = await listFiles.execute({ path: 'docs' });

      expect(mockReaddir).toHaveBeenCalledWith('docs', { withFileTypes: true });
      expect(result.split('\n')).toEqual(['tools/', 'readme.md']);
    });

    it('returns not found error for ENOENT', async () => {
      const err: any = new Error('Not found');
      err.code = 'ENOENT';
      mockReaddir.mockRejectedValueOnce(err);

      const result = await listFiles.execute({ path: 'missing' });

      expect(mockReaddir).toHaveBeenCalledWith('missing', { withFileTypes: true });
      expect(result).toBe('Error: Path not found - missing');
    });

    it('returns generic error for other fs errors', async () => {
      const err = new Error('Permission denied');
      mockReaddir.mockRejectedValueOnce(err);

      const result = await listFiles.execute({ path: 'protected' });

      expect(mockReaddir).toHaveBeenCalledWith('protected', { withFileTypes: true });
      expect(result).toBe('Error listing files: Permission denied');
    });
  });

  describe('AI SDK tool interface', () => {
    it('should expose name and schema for AI SDK registration', () => {
      expect((listFilesAi as any).name).toBe('list_files');
      expect((listFilesAi as any).inputSchema).toBeDefined();
      expect(typeof (listFilesAi as any).execute).toBe('function');
    });

    it('lists files and directories in current directory when no path provided', async () => {
      mockReaddir.mockResolvedValueOnce([
        makeDirent('src', true),
        makeDirent('package.json', false),
      ]);

      const result = await (listFilesAi as any).execute({});

      expect(mockReaddir).toHaveBeenCalledWith('.', { withFileTypes: true });
      expect(result.split('\n')).toEqual(['src/', 'package.json']);
    });

    it('lists files and directories for a provided path', async () => {
      mockReaddir.mockResolvedValueOnce([
        makeDirent('tools', true),
        makeDirent('readme.md', false),
      ]);

      const result = await (listFilesAi as any).execute({ path: 'docs' });

      expect(mockReaddir).toHaveBeenCalledWith('docs', { withFileTypes: true });
      expect(result.split('\n')).toEqual(['tools/', 'readme.md']);
    });

    it('returns not found error for ENOENT', async () => {
      const err: any = new Error('Not found');
      err.code = 'ENOENT';
      mockReaddir.mockRejectedValueOnce(err);

      const result = await (listFilesAi as any).execute({ path: 'missing' });

      expect(mockReaddir).toHaveBeenCalledWith('missing', { withFileTypes: true });
      expect(result).toBe('Error: Path not found - missing');
    });

    it('returns generic error for other fs errors', async () => {
      const err = new Error('Permission denied');
      mockReaddir.mockRejectedValueOnce(err);

      const result = await (listFilesAi as any).execute({ path: 'protected' });

      expect(mockReaddir).toHaveBeenCalledWith('protected', { withFileTypes: true });
      expect(result).toBe('Error listing files: Permission denied');
    });
  });
});