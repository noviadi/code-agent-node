import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Agent } from './agent';
import { z } from 'zod';

// Mock the modules before importing
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => 'mocked-model'),
}));

// Import the mocked functions after mocking
import { generateText } from 'ai';
const generateTextMock = vi.mocked(generateText);

describe('Agent', () => {
  let mockGetUserInput: ReturnType<typeof vi.fn>;
  let mockHandleResponse: ReturnType<typeof vi.fn>;
  let mockTool: any;
  let agent: Agent;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserInput = vi.fn();
    mockHandleResponse = vi.fn();
    const testToolInputSchema = z.object({
      query: z.string(),
    });

    mockTool = {
      description: 'A tool for testing',
      inputSchema: testToolInputSchema,
      execute: vi.fn(async (input: unknown) => {
        const parsedInput = testToolInputSchema.parse(input);
        return `Tool result for ${parsedInput.query}`;
      }),
    };

    agent = new Agent(mockGetUserInput, mockHandleResponse, { test_tool: mockTool });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle a simple text conversation', async () => {
    mockGetUserInput.mockResolvedValueOnce('Hello Claude').mockResolvedValueOnce('exit');
    generateTextMock.mockResolvedValueOnce({
      text: 'Hi there!',
      toolCalls: [],
      toolResults: [],
      response: {
        id: 'test-id',
        timestamp: new Date(),
        modelId: 'claude-3-5-sonnet-20240620',
        messages: [
          { role: 'assistant', content: 'Hi there!' }
        ]
      }
    } as any);

    await agent.start();

    expect(mockGetUserInput).toHaveBeenCalledTimes(2);
    expect(mockHandleResponse).toHaveBeenCalledWith('Hi there!');
    expect(generateTextMock).toHaveBeenCalledTimes(1);
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mocked-model',
        messages: expect.arrayContaining([
          { role: 'user', content: 'Hello Claude' }
        ]),
        tools: { test_tool: mockTool }
      })
    );
  });

  it('should handle API errors gracefully', async () => {
    mockGetUserInput.mockResolvedValueOnce('Trigger error').mockResolvedValueOnce('exit');
    const apiError = new Error('AI SDK error');
    generateTextMock.mockRejectedValueOnce(apiError);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await agent.start();

    expect(mockGetUserInput).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', apiError);
    expect(mockHandleResponse).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should create agent with tools', () => {
    expect(agent).toBeDefined();
    expect(typeof agent.start).toBe('function');
  });
});