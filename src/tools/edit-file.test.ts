import { editFile } from './edit-file';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('editFile', () => {
    const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
    const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
    const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should replace old_str with new_str in an existing file', async () => {
        mockReadFile.mockResolvedValueOnce('This is the old content.');
        const input = { path: 'test.txt', old_str: 'old', new_str: 'new' };
        const result = await editFile.execute(input);

        expect(mockReadFile).toHaveBeenCalledWith('test.txt', 'utf-8');
        expect(mockWriteFile).toHaveBeenCalledWith('test.txt', 'This is the new content.', 'utf-8');
        expect(result).toBe('File edited: test.txt');
    });

    it('should create a new file with new_str content if file does not exist', async () => {
        mockReadFile.mockRejectedValueOnce({ code: 'ENOENT' });
        const input = { path: 'newfile.txt', old_str: 'old', new_str: 'new content' };
        const result = await editFile.execute(input);

        expect(mockReadFile).toHaveBeenCalledWith('newfile.txt', 'utf-8');
        expect(mockWriteFile).toHaveBeenCalledWith('newfile.txt', 'new content', 'utf-8');
        expect(result).toBe('File created: newfile.txt');
    });

    it('should create directories recursively if path points to a new file in a new directory', async () => {
        mockReadFile.mockRejectedValueOnce({ code: 'ENOENT' });
        const input = { path: 'src/scripts/migration/db.ts', old_str: 'old', new_str: 'console.log("new db script");' };
        const result = await editFile.execute(input);

        expect(mockReadFile).toHaveBeenCalledWith('src/scripts/migration/db.ts', 'utf-8');
        expect(mockMkdir).toHaveBeenCalledWith('src/scripts/migration', { recursive: true });
        expect(mockWriteFile).toHaveBeenCalledWith('src/scripts/migration/db.ts', 'console.log("new db script");', 'utf-8');
        expect(result).toBe('File created: src/scripts/migration/db.ts');
    });

    it('should return an error string if directory creation fails', async () => {
        mockReadFile.mockRejectedValueOnce({ code: 'ENOENT' });
        const mockError = new Error('Permission denied for directory');
        (mockError as any).code = 'EACCES';
        mockMkdir.mockRejectedValueOnce(mockError);

        const input = { path: 'src/newdir/file.ts', old_str: 'old', new_str: 'content' };
        const result = await editFile.execute(input);

        expect(mockReadFile).toHaveBeenCalledWith('src/newdir/file.ts', 'utf-8');
        expect(mockMkdir).toHaveBeenCalledWith('src/newdir', { recursive: true });
        expect(mockWriteFile).not.toHaveBeenCalled();
        expect(result).toBe('Error: Failed to create directory src/newdir. Permission denied for directory');
    });

    it('should return an error string if path is empty', async () => {
        const input = { path: '', old_str: 'old', new_str: 'new' };
        const result = await editFile.execute(input);
        expect(result).toBe('Error: Invalid input parameters. Path cannot be empty, and old_str must be different from new_str.');
        expect(mockReadFile).not.toHaveBeenCalled();
        expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('should return an error string if old_str and new_str are similar', async () => {
        const input = { path: 'test.txt', old_str: 'same', new_str: 'same' };
        const result = await editFile.execute(input);
        expect(result).toBe('Error: Invalid input parameters. Path cannot be empty, and old_str must be different from new_str.');
        expect(mockReadFile).not.toHaveBeenCalled();
        expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('should return an error string if old_str is not found in the file', async () => {
        mockReadFile.mockResolvedValueOnce('This is some content.');
        const input = { path: 'test.txt', old_str: 'nonexistent', new_str: 'new' };
        const result = await editFile.execute(input);
        expect(result).toBe("Error: 'nonexistent' not found in file test.txt.");
        expect(mockReadFile).toHaveBeenCalledWith('test.txt', 'utf-8');
        expect(mockWriteFile).not.toHaveBeenCalled(); // Should not write if old_str not found
    });

    it('should return an error string for other file system errors', async () => {
        const mockError = new Error('Permission denied');
        (mockError as any).code = 'EACCES';
        mockReadFile.mockRejectedValueOnce(mockError);

        const input = { path: 'test.txt', old_str: 'old', new_str: 'new' };
        const result = await editFile.execute(input);
        expect(result).toBe('Error: Failed to read file test.txt. Permission denied');
        expect(mockReadFile).toHaveBeenCalledWith('test.txt', 'utf-8');
        expect(mockWriteFile).not.toHaveBeenCalled();
    });
});