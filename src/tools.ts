import { z } from 'zod';

export interface Tool<TInput = z.ZodTypeAny, TOutput = any> {
  name: string;
  description: string;
  input_schema: TInput;
  execute: (input: z.infer<TInput>) => Promise<TOutput>;
}