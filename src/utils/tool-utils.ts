import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { Tool } from '../tools';

export function formatToolInputSchema(tool: Tool): Anthropic.Tool['input_schema'] {
  const jsonSchema = z.toJSONSchema(tool.input_schema);

  // Ensure the schema is always an object type as required by Anthropic SDK
  const inputSchema: { type: 'object'; properties?: unknown; required?: Array<string>; [k: string]: unknown } = {
    type: 'object',
    properties: jsonSchema.type === 'object' ? jsonSchema.properties : { input: jsonSchema },
    required: jsonSchema.type === 'object' ? jsonSchema.required : ['input']
  };

  // Add other properties from the original schema (excluding type)
  if (jsonSchema.type === 'object') {
    Object.keys(jsonSchema).forEach(key => {
      if (key !== 'type' && key !== 'properties' && key !== 'required') {
        inputSchema[key] = (jsonSchema as any)[key];
      }
    });
  }
  return inputSchema;
}