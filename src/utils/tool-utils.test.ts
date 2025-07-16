import { z } from 'zod';
import { formatToolInputSchema } from './tool-utils';
import { Tool } from '../tools';

describe('tool-utils', () => {
  describe('formatToolInputSchema', () => {
    it('should format simple object schema correctly', () => {
      const mockTool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        input_schema: z.object({
          file: z.string().describe('File path'),
          content: z.string().describe('File content')
        }),
        execute: jest.fn()
      };

      const result = formatToolInputSchema(mockTool);

      expect(result.type).toBe('object');
      expect(result.properties).toBeDefined();
      expect(result.required).toEqual(['file', 'content']);
    });

    it('should handle optional properties correctly', () => {
      const mockTool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        input_schema: z.object({
          required_field: z.string(),
          optional_field: z.string().optional()
        }),
        execute: jest.fn()
      };

      const result = formatToolInputSchema(mockTool);

      expect(result.type).toBe('object');
      expect(result.required).toEqual(['required_field']);
    });

    it('should wrap non-object schemas in input property', () => {
      const mockTool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        input_schema: z.string().describe('Simple string input'),
        execute: jest.fn()
      };

      const result = formatToolInputSchema(mockTool);

      expect(result.type).toBe('object');
      expect(result.properties).toEqual({
        input: expect.objectContaining({
          type: 'string'
        })
      });
      expect(result.required).toEqual(['input']);
    });

    it('should preserve additional schema properties', () => {
      const mockTool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        input_schema: z.object({
          field: z.string()
        }).describe('Custom description'),
        execute: jest.fn()
      };

      const result = formatToolInputSchema(mockTool);

      expect(result.type).toBe('object');
      expect(result.description).toBe('Custom description');
    });

    it('should handle nested object schemas', () => {
      const mockTool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        input_schema: z.object({
          config: z.object({
            host: z.string(),
            port: z.number()
          }),
          options: z.array(z.string()).optional()
        }),
        execute: jest.fn()
      };

      const result = formatToolInputSchema(mockTool);

      expect(result.type).toBe('object');
      expect(result.properties).toBeDefined();
      expect(result.required).toEqual(['config']);
    });

    it('should handle array schemas', () => {
      const mockTool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        input_schema: z.array(z.string()),
        execute: jest.fn()
      };

      const result = formatToolInputSchema(mockTool);

      expect(result.type).toBe('object');
      expect(result.properties).toEqual({
        input: expect.objectContaining({
          type: 'array'
        })
      });
      expect(result.required).toEqual(['input']);
    });

    it('should handle union schemas', () => {
      const mockTool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        input_schema: z.union([z.string(), z.number()]),
        execute: jest.fn()
      };

      const result = formatToolInputSchema(mockTool);

      expect(result.type).toBe('object');
      expect(result.properties).toBeDefined();
      expect(result.required).toEqual(['input']);
    });

    it('should handle enum schemas', () => {
      const mockTool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        input_schema: z.enum(['option1', 'option2', 'option3']),
        execute: jest.fn()
      };

      const result = formatToolInputSchema(mockTool);

      expect(result.type).toBe('object');
      expect(result.properties).toBeDefined();
      expect(result.required).toEqual(['input']);
    });
  });
});