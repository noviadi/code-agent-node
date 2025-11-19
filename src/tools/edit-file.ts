import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

const editFileInputSchema = z.object({
    path: z.string().describe('The path to the file.'),
    old_str: z.string().describe('Text to search for - must match exactly and must only have one match exactly.'),
    new_str: z.string().describe('Text to replace old_str with')
});


import { NodeError } from '../types';

/** Tool that performs string replacement in files, handling file creation and directory structure generation if needed. */
export const editFileAi = {
    description: `Make edit to a text file.

Replace 'old_str' with 'new_str' in the given file. 'old_str' and 'new_str' MUST be different of each other.

If the file specified with path does not exist, it will be created.
    `,
    inputSchema: editFileInputSchema,
    execute: async (input: z.infer<typeof editFileInputSchema>) => {
        const { path: filePath, old_str, new_str } = input;
        if (!filePath || old_str === new_str) {
            return 'Error: Invalid input parameters. Path cannot be empty, and old_str must be different from new_str.';
        }

        let oldContent = '';
        try {
            oldContent = await fs.readFile(filePath, 'utf-8');
        } catch (error: unknown) {
            const nodeError = error as NodeError;
            if (nodeError.code === 'ENOENT') {
                const dirName = path.dirname(filePath);
                if (dirName !== '.') {
                    try {
                        await fs.mkdir(dirName, { recursive: true });
                    } catch (mkdirError: unknown) {
                        const nodeMkdirError = mkdirError as NodeError;
                        return `Error: Failed to create directory ${dirName}. ${nodeMkdirError.message}`;
                    }
                }
                await fs.writeFile(filePath, new_str, 'utf-8');
                return `File created: ${filePath}`;
            }
            return `Error: Failed to read file ${filePath}. ${nodeError.message}`;
        }

        const newContent = oldContent.replace(old_str, new_str);

        if (oldContent === newContent && old_str !== '') {
            return `Error: '${old_str}' not found in file ${filePath}.`;
        }

        await fs.writeFile(filePath, newContent, 'utf-8');
        return `File edited: ${filePath}`;
    }
};