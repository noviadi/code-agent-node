import { z } from 'zod';
import { readFile as fsReadFile } from 'fs/promises';

const readFileInputSchema = z.object({
    path: z.string().describe('The relative path of a file in the working directory.')
});

/**
 * AI SDK tool export for Vercel AI SDK integration.
 * This follows the AI SDK tool pattern as documented in Context7 MCP.
 * 
 * Based on patterns from:
 * - https://github.com/vercel/ai/blob/main/content/docs/03-ai-sdk-core/15-tools-and-tool-calling.mdx
 * - https://github.com/vercel/ai/blob/main/content/cookbook/05-node/50-call-tools.mdx
 * 
 * Usage with AI SDK:
 * ```ts
 * import { readFileAi } from './tools/read-file';
 * 
 * const result = await generateText({
 *   model: openai('gpt-4o'),
 *   tools: { readFile: readFileAi },
 *   prompt: 'Read the file test.txt'
 * });
 * ```
 */
export const readFileAi = {
    description: 'Read the contents of a given relative file path. Use this when you want to see what\'s inside a file. Do not use this with directory names.',
    inputSchema: readFileInputSchema,
    execute: async (input: any) => {
        const { path } = input as { path: string };
        try {
            const content = await fsReadFile(path, 'utf-8');
            return `File content of ${path}:\n\`\`\`\n${content}\n\`\`\``;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return `Error: File not found at path "${path}"`;
            }
            return `Error reading file "${path}": ${error.message}`;
        }
    }
};