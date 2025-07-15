import { listFiles } from './list-files';
import { readdir } from 'fs/promises';

jest.mock('fs/promises');

describe('listFiles', () => {
    const mockReaddir = readdir as jest.MockedFunction<typeof readdir>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should list files and directories in the current directory by default', async () => {
        mockReaddir.mockResolvedValueOnce([
            { name: 'file1.txt', isDirectory: () => false } as any,
            { name: 'dir1', isDirectory: () => true } as any,
        ]);

        const result = await listFiles.execute({});
        expect(result).toBe('file1.txt\ndir1/');
        expect(mockReaddir).toHaveBeenCalledWith('.', { withFileTypes: true });
    });

    it('should list files and directories in a specified path', async () => {
        mockReaddir.mockResolvedValueOnce([
            { name: 'nested_file.js', isDirectory: () => false } as any,
        ]);

        const result = await listFiles.execute({ path: 'test_dir' });
        expect(result).toBe('nested_file.js');
        expect(mockReaddir).toHaveBeenCalledWith('test_dir', { withFileTypes: true });
    });


    it('should return an error message if the path does not exist (ENOENT)', async () => {
        const mockError = new Error('Path not found') as any;
        mockError.code = 'ENOENT';
        mockReaddir.mockRejectedValueOnce(mockError);

        const result = await listFiles.execute({ path: 'non_existent_dir' });
        expect(result).toBe('Error: Path not found - non_existent_dir');
    });

    it('should return a generic error message for other fs errors', async () => {
        const mockError = new Error('Permission denied');
        mockReaddir.mockRejectedValueOnce(mockError);

        const result = await listFiles.execute({ path: 'restricted_dir' });
        expect(result).toBe('Error listing files: Permission denied');
    });
});