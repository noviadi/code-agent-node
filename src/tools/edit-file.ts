import { Tool } from '../tools';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

const editFileInputSchema = z.object({
    path: z.string().describe('The path to the file.'),
    old_str: z.string().describe('Text to search for - must match exactly and must only have one match exactly.'),
    new_str: z.string().describe('Text to replace old_str with')
});

export const editFile: Tool<typeof editFileInputSchema> = {
    name: 'edit_file',
    description: `Make edit to a text file.

Replace 'old_str' with 'new_str' in the given file. 'old_str' and 'new_str' MUST be different of each other.

If the file specified with path does not exist, it will be created.
    `,
    input_schema: editFileInputSchema,
    execute: async (input) => {
        const { path: filePath, old_str, new_str } = input;

        // if path is empty or old_str and new_str is similar return error invalid input parameters
        if (!filePath || old_str === new_str) {
            return 'Error: Invalid input parameters. Path cannot be empty, and old_str must be different from new_str.';
        }

        let oldContent = '';
        try {
            // read the file specified with the path
            oldContent = await fs.readFile(filePath, 'utf-8');
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                const dirName = path.dirname(filePath);
                // create directory if not exist
                if (dirName !== '.') {
                    try {
                        await fs.mkdir(dirName, { recursive: true });
                    } catch (mkdirError: any) {
                        return `Error: Failed to create directory ${dirName}. ${mkdirError.message}`;
                    }
                }
                // if file is not exist then create it with content from new_str
                await fs.writeFile(filePath, new_str, 'utf-8');
                return `File created: ${filePath}`;
            }
            return `Error: Failed to read file ${filePath}. ${error.message}`; // Return error message for other errors
        }

        // create store for new content containing with content where old_str has been replaced with new_str
        const newContent = oldContent.replace(old_str, new_str);

        // if old content is similar to the new content but old_str is not empty (should have been replaced) return error that operation failed with old_str is not found in the string
        if (oldContent === newContent && old_str !== '') {
            return `Error: '${old_str}' not found in file ${filePath}.`;
        }

        // write new content to the file specified with the path
        await fs.writeFile(filePath, newContent, 'utf-8');
        return `File edited: ${filePath}`;
    }
}