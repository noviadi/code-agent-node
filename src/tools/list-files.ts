import { Tool } from '../tools';
import { z } from 'zod';
import { readdir } from 'fs/promises';

const listFileInputSchema = z.object({
    path: z.string().optional().describe('Optional relative path to list files from. Defaults to current directory if not provided.')
});

export const listFiles: Tool<typeof listFileInputSchema> = {
    name: 'list_files',
    description: 'List files and directories at a given path. If no path is provided, lists files in the current directory.',
    input_schema: listFileInputSchema,
    execute: async (input) => {
        const { path: inputPath = '.' } = input;

        try {
            let result: string[] = [];

            const entries = await readdir(inputPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    result.push(`${entry.name}/`);
                } else {
                    result.push(`${entry.name}`);
                }
            }
            return result.join('\n');
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return `Error: Path not found - ${inputPath}`;
            }
            return `Error listing files: ${error.message}`;
        }
    }
}