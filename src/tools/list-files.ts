import { z } from 'zod';
import { readdir } from 'fs/promises';

const listFileInputSchema = z.object({
    path: z.string().optional().describe('Optional relative path to list files from. Defaults to current directory if not provided.')
});

export const listFilesAi = {
    description: 'List files and directories at a given path. If no path is provided, lists files in the current directory.',
    inputSchema: listFileInputSchema,
    execute: async (input: any) => {
        const { path: inputPath = '.' } = input as { path?: string };
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
};