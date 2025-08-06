import { describe, it, expect, beforeEach, vi } from 'vitest';
import { editFile } from './edit-file';
import { editFileAi } from './edit-file';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

describe('editFile', () => {
    const mockReadFile = fs.readFile as unknown as ReturnType<typeof vi.fn>;
    const mockWriteFile = fs.writeFile as unknown as ReturnType<typeof vi.fn>;
    const mockMkdir = fs.mkdir as unknown as ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('legacy Tool interface', () => {
        it('should replace old_str with new_str in an existing file', async () => {
            (mockReadFile as any).mockResolvedValueOnce('This is the old content.');
            const input = { path: 'test.txt', old_str: 'old', new_str: 'new' };
            const result = await editFile.execute(input);

            expect(mockReadFile).toHaveBeenCalledWith('test.txt', 'utf-8');
            expect(mockWriteFile).toHaveBeenCalledWith('test.txt', 'This is the new content.', 'utf-8');
            expect(result).toBe('File edited: test.txt');
        });

        it('should create a new file with new_str content if file does not exist', async () => {
            (mockReadFile as any).mockRejectedValueOnce({ code: 'ENOENT' });
            const input = { path: 'newfile.txt', old_str: 'old', new_str: 'new content' };
            const result = await editFile.execute(input);

            expect(mockReadFile).toHaveBeenCalledWith('newfile.txt', 'utf-8');
            expect(mockWriteFile).toHaveBeenCalledWith('newfile.txt', 'new content', 'utf-8');
            expect(result).toBe('File created: newfile.txt');
        });

        it('should create directories recursively if path points to a new file in a new directory', async () => {
            (mockReadFile as any).mockRejectedValueOnce({ code: 'ENOENT' });
            const input = { path: 'src/scripts/migration/db.ts', old_str: 'old', new_str: 'console.log("new db script");' };
            const result = await editFile.execute(input);

            expect(mockReadFile).toHaveBeenCalledWith('src/scripts/migration/db.ts', 'utf-8');
            expect(mockMkdir).toHaveBeenCalledWith('src/scripts/migration', { recursive: true });
            expect(mockWriteFile).toHaveBeenCalledWith('src/scripts/migration/db.ts', 'console.log("new db script");', 'utf-8');
            expect(result).toBe('File created: src/scripts/migration/db.ts');
        });

        it('should return an error string if directory creation fails', async () => {
            (mockReadFile as any).mockRejectedValueOnce({ code: 'ENOENT' });
            const mockError = new Error('Permission denied for directory');
            (mockError as any).code = 'EACCES';
            (mockMkdir as any).mockRejectedValueOnce(mockError);

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
            (mockReadFile as any).mockResolvedValueOnce('This is some content.');
            const input = { path: 'test.txt', old_str: 'nonexistent', new_str: 'new' };
            const result = await editFile.execute(input);
            expect(result).toBe("Error: 'nonexistent' not found in file test.txt.");
            expect(mockReadFile).toHaveBeenCalledWith('test.txt', 'utf-8');
            expect(mockWriteFile).not.toHaveBeenCalled(); // Should not write if old_str not found
        });

        it('should return an error string for other file system errors', async () => {
            const mockError = new Error('Permission denied');
            (mockError as any).code = 'EACCES';
            (mockReadFile as any).mockRejectedValueOnce(mockError);

            const input = { path: 'test.txt', old_str: 'old', new_str: 'new' };
            const result = await editFile.execute(input);
            expect(result).toBe('Error: Failed to read file test.txt. Permission denied');
            expect(mockReadFile).toHaveBeenCalledWith('test.txt', 'utf-8');
            expect(mockWriteFile).not.toHaveBeenCalled();
        });
    });

    describe('AI SDK tool interface', () => {
        it('should expose name and schema for AI SDK registration', () => {
            expect((editFileAi as any).name).toBe('edit_file');
            expect((editFileAi as any).inputSchema).toBeDefined();
            expect(typeof (editFileAi as any).execute).toBe('function');
        });

        it('should replace old_str with new_str in an existing file', async () => {
            (mockReadFile as any).mockResolvedValueOnce('This is the old content.');
            const result = await (editFileAi as any).execute({ path: 'test.txt', old_str: 'old', new_str: 'new' });

            expect(mockReadFile).toHaveBeenCalledWith('test.txt', 'utf-8');
            expect(mockWriteFile).toHaveBeenCalledWith('test.txt', 'This is the new content.', 'utf-8');
            expect(result).toBe('File edited: test.txt');
        });

        it('should create a new file with new_str content if file does not exist', async () => {
            (mockReadFile as any).mockRejectedValueOnce({ code: 'ENOENT' });

            const result = await (editFileAi as any).execute({ path: 'newfile.txt', old_str: 'old', new_str: 'new content' });

            expect(mockReadFile).toHaveBeenCalledWith('newfile.txt', 'utf-8');
            expect(mockWriteFile).toHaveBeenCalledWith('newfile.txt', 'new content', 'utf-8');
            expect(result).toBe('File created: newfile.txt');
        });

        it('should create directories recursively if path points to a new file in a new directory', async () => {
            (mockReadFile as any).mockRejectedValueOnce({ code: 'ENOENT' });

            const result = await (editFileAi as any).execute({
                path: 'src/scripts/migration/db.ts',
                old_str: 'old',
                new_str: 'console.log("new db script");',
            });

            expect(mockReadFile).toHaveBeenCalledWith('src/scripts/migration/db.ts', 'utf-8');
            expect(mockMkdir).toHaveBeenCalledWith('src/scripts/migration', { recursive: true });
            expect(mockWriteFile).toHaveBeenCalledWith('src/scripts/migration/db.ts', 'console.log("new db script");', 'utf-8');
            expect(result).toBe('File created: src/scripts/migration/db.ts');
        });

        it('should return an error string if directory creation fails', async () => {
            (mockReadFile as any).mockRejectedValueOnce({ code: 'ENOENT' });
            const mockError = new Error('Permission denied for directory');
            (mockError as any).code = 'EACCES';
            (mockMkdir as any).mockRejectedValueOnce(mockError);

            const result = await (editFileAi as any).execute({
                path: 'src/newdir/file.ts',
                old_str: 'old',
                new_str: 'content',
            });

            expect(mockReadFile).toHaveBeenCalledWith('src/newdir/file.ts', 'utf-8');
            expect(mockMkdir).toHaveBeenCalledWith('src/newdir', { recursive: true });
            expect(mockWriteFile).not.toHaveBeenCalled();
            expect(result).toBe('Error: Failed to create directory src/newdir. Permission denied for directory');
        });

        it('should return an error string if path is empty', async () => {
            const result = await (editFileAi as any).execute({ path: '', old_str: 'old', new_str: 'new' });
            expect(result).toBe('Error: Invalid input parameters. Path cannot be empty, and old_str must be different from new_str.');
            expect(mockReadFile).not.toHaveBeenCalled();
            expect(mockWriteFile).not.toHaveBeenCalled();
        });

        it('should return an error string if old_str and new_str are similar', async () => {
            const result = await (editFileAi as any).execute({ path: 'test.txt', old_str: 'same', new_str: 'same' });
            expect(result).toBe('Error: Invalid input parameters. Path cannot be empty, and old_str must be different from new_str.');
            expect(mockReadFile).not.toHaveBeenCalled();
            expect(mockWriteFile).not.toHaveBeenCalled();
        });

        it('should return an error string if old_str is not found in the file', async () => {
            (mockReadFile as any).mockResolvedValueOnce('This is some content.');
            const result = await (editFileAi as any).execute({ path: 'test.txt', old_str: 'nonexistent', new_str: 'new' });
            expect(result).toBe("Error: 'nonexistent' not found in file test.txt.");
            expect(mockReadFile).toHaveBeenCalledWith('test.txt', 'utf-8');
            expect(mockWriteFile).not.toHaveBeenCalled();
        });

        it('should return an error string for other file system errors', async () => {
            const mockError = new Error('Permission denied');
            (mockError as any).code = 'EACCES';
            (mockReadFile as any).mockRejectedValueOnce(mockError);

            const result = await (editFileAi as any).execute({ path: 'test.txt', old_str: 'old', new_str: 'new' });
            expect(result).toBe('Error: Failed to read file test.txt. Permission denied');
            expect(mockReadFile).toHaveBeenCalledWith('test.txt', 'utf-8');
            expect(mockWriteFile).not.toHaveBeenCalled();
        });
    });
});