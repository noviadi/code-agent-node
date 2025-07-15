import { Tool } from '../tools';
import { z } from 'zod';
import { readFile as fsReadFile } from 'fs/promises';

const readFileInputSchema = z.object({
    path: z.string().describe('The relative path of a file in the working directory.')
})

export const readFile: Tool<typeof readFileInputSchema> = {
    name: 'read_file',
    description: `Read the contents of a given relative file path. Use this when you want to see what's inside a file. Do not use this with directory names.`,
    input_schema: readFileInputSchema,
    execute: async (input) => {
        try {
            const content = await fsReadFile(input.path, 'utf-8');
            return `File content of ${input.path}:\n\`\`\`\n${content}\n\`\`\``;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return `Error: File not found at path "${input.path}"`;
            }
            return `Error reading file "${input.path}": ${error.message}`;
        }
    }
}