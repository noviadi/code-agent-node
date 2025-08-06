import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Agent } from './agent';
import { Tool } from './tools';
import { z } from 'zod';

const createMock = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      create: createMock,
    },
  })),
}));

describe('Agent', () => {
  let mockGetUserInput: ReturnType<typeof vi.fn>;
  let mockHandleResponse: ReturnType<typeof vi.fn>;
  let mockTool: Tool;
  let agent: Agent;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserInput = vi.fn();
    mockHandleResponse = vi.fn();
    const testToolInputSchema = z.object({
      query: z.string(),
    });

    mockTool = {
      name: 'test_tool',
      description: 'A tool for testing',
      input_schema: testToolInputSchema,
      execute: vi.fn(async (input: unknown) => {
        const parsedInput = testToolInputSchema.parse(input);
        return `Tool result for ${parsedInput.query}`;
      }),
    };

    agent = new Agent(mockGetUserInput, mockHandleResponse, [mockTool]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle a simple text conversation', async () => {
    mockGetUserInput.mockResolvedValueOnce('Hello Claude').mockResolvedValueOnce('exit');
    createMock.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Hi there!' }],
    } as any);

    await agent.start();

    expect(mockGetUserInput).toHaveBeenCalledTimes(2);
    expect(mockHandleResponse).toHaveBeenCalledWith('Hi there!');
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          { role: 'user', content: 'Hello Claude' },
          { role: 'assistant', content: [{ type: 'text', text: 'Hi there!' }] },
        ]),
      })
    );
  });

  it('should handle a tool use scenario', async () => {
    mockGetUserInput.mockResolvedValueOnce('Use the tool').mockResolvedValueOnce('exit');
    createMock
      .mockResolvedValueOnce({
        content: [{
          type: 'tool_use',
          id: 'toolu_123',
          name: 'test_tool',
          input: { query: 'some data' },
        }],
      } as any)
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Tool executed successfully.' }],
      } as any);

    await agent.start();

    expect(mockGetUserInput).toHaveBeenCalledTimes(2);
    expect(mockTool.execute).toHaveBeenCalledWith({ query: 'some data' });
    expect(mockHandleResponse).toHaveBeenCalledWith('Tool executed successfully.');
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          { role: 'user', content: 'Use the tool' },
          {
            role: 'assistant',
            content: [{
              type: 'tool_use',
              id: 'toolu_123',
              name: 'test_tool',
              input: { query: 'some data' },
            }],
          },
          {
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: 'toolu_123',
              content: JSON.stringify('Tool result for some data'),
            }],
          },
        ]),
      })
    );
  });

  it('should handle tool not found error', async () => {
    agent = new Agent(mockGetUserInput, mockHandleResponse, []); // Agent with no tools
    mockGetUserInput.mockResolvedValueOnce('Use a non-existent tool').mockResolvedValueOnce('exit');
    createMock
      .mockResolvedValueOnce({
        content: [{
          type: 'tool_use',
          id: 'toolu_456',
          name: 'non_existent_tool',
          input: {},
        }],
      } as any)
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Understood, tool not found.' }],
      } as any);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await agent.start();

    expect(mockGetUserInput).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Tool non_existent_tool not found.');
    expect(mockHandleResponse).toHaveBeenCalledWith('Understood, tool not found.');
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          { role: 'user', content: 'Use a non-existent tool' },
          {
            role: 'assistant',
            content: [{
              type: 'tool_use',
              id: 'toolu_456',
              name: 'non_existent_tool',
              input: {},
            }],
          },
          {
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: 'toolu_456',
              content: 'Error: Tool non_existent_tool not found.',
            }],
          },
          { role: 'assistant', content: [{ type: 'text', text: 'Understood, tool not found.' }] },
        ]),
      })
    );
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('should handle API errors gracefully', async () => {
    mockGetUserInput.mockResolvedValueOnce('Trigger error').mockResolvedValueOnce('exit');
    const apiError = new Error('Anthropic API error');
    createMock.mockRejectedValueOnce(apiError);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await agent.start();

    expect(mockGetUserInput).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', apiError);
    expect(mockHandleResponse).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('should log tool use when config.logToolUse is true', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation((...args: any[]) => {
      const strippedArgs = args.map(arg =>
        typeof arg === 'string' ? arg.replace(/\x1b\[[0-9;]*m/g, '') : arg
      );
      // push stripped args for assertions
      (consoleLogSpy as any).mock.calls.push(strippedArgs);
    });
    mockGetUserInput.mockResolvedValueOnce('Hello Claude').mockResolvedValueOnce('exit');
    createMock
      .mockResolvedValueOnce({
        content: [{
          type: 'tool_use',
          id: 'toolu_123',
          name: 'test_tool',
          input: { query: 'some data' },
        }],
      } as any)
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Tool executed successfully.' }],
      } as any);

    await agent.start();

    expect(consoleLogSpy.mock.calls.flat()).toContain('Chat with Claude (type \'exit\' to quit)');
    expect(consoleLogSpy.mock.calls.flat()).toContain('Claude is using tool: test_tool with input {"query":"some data"}');
    expect(consoleLogSpy.mock.calls.flat()).toContain('Tool result: "Tool result for some data"');
    consoleLogSpy.mockRestore();
  });

  it('should not log tool use when config.logToolUse is false', async () => {
    agent = new Agent(mockGetUserInput, mockHandleResponse, [mockTool], { logToolUse: false });
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation((...args: any[]) => {
      const strippedArgs = args.map(arg =>
        typeof arg === 'string' ? arg.replace(/\x1b\[[0-9;]*m/g, '') : arg
      );
      (consoleLogSpy as any).mock.calls.push(strippedArgs);
    });
    mockGetUserInput.mockResolvedValueOnce('Use the tool').mockResolvedValueOnce('exit');
    createMock
      .mockResolvedValueOnce({
        content: [{
          type: 'tool_use',
          id: 'toolu_123',
          name: 'test_tool',
          input: { query: 'some data' },
        }],
      } as any)
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Tool executed successfully.' }],
      } as any);

    await agent.start();

    expect(consoleLogSpy.mock.calls.flat()).toContain('Chat with Claude (type \'exit\' to quit)');
    expect(consoleLogSpy.mock.calls.flat()).not.toContain(expect.stringContaining('Claude is using tool:'));
    expect(consoleLogSpy.mock.calls.flat()).not.toContain(expect.stringContaining('Tool result:'));
    consoleLogSpy.mockRestore();
  });
});