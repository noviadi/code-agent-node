import { z } from 'zod';
import { readFile as fsReadFile } from 'fs/promises';

const readFileInputSchema = z.object({
    path: z.string().describe('The relative path of a file in the working directory.')
});


import { NodeError } from '../types';

/** Tool that safely reads file contents, providing formatted output and specific error handling for missing files. */
export const readFileAi = {
    description: 'Read the contents of a given relative file path. Use this when you want to see what\'s inside a file. Do not use this with directory names.',
    inputSchema: readFileInputSchema,
    execute: async (input: z.infer<typeof readFileInputSchema>) => {
        const { path } = input;
        try {
            const content = await fsReadFile(path, 'utf-8');
            return `File content of ${path}:\n\`\`\`\n${content}\n\`\`\``;
        } catch (error: unknown) {
            const nodeError = error as NodeError;
            if (nodeError.code === 'ENOENT') {
                return `Error: File not found at path "${path}"`;
            }
            return `Error reading file "${path}": ${nodeError.message}`;
        }
    }
};