import { Agent } from './agent';
import Anthropic from '@anthropic-ai/sdk';
import { Tool } from './tools';
import { z } from 'zod';

// Mock the Anthropic SDK
let mockMessagesCreate: jest.Mock;

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => {
    mockMessagesCreate = jest.fn(); // Capture the mock here
    return {
      messages: {
        create: mockMessagesCreate,
      },
    };
  });
});

const MockAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>;

describe('Agent', () => {
  let mockGetUserInput: jest.Mock;
  let mockHandleResponse: jest.Mock;
  let mockTool: Tool;
  let agent: Agent;

  beforeEach(() => {
    mockGetUserInput = jest.fn();
    mockHandleResponse = jest.fn();
    const testToolInputSchema = z.object({
      query: z.string(),
    });

    mockTool = {
      name: 'test_tool',
      description: 'A tool for testing',
      input_schema: testToolInputSchema,
      execute: jest.fn(async (input: unknown) => {
        const parsedInput = testToolInputSchema.parse(input);
        return `Tool result for ${parsedInput.query}`;
      }),
    };

    agent = new Agent(mockGetUserInput, mockHandleResponse, [mockTool]);

    // Reset mocks after agent is instantiated
    MockAnthropic.mockClear();
    mockMessagesCreate.mockClear(); // Clear the captured mock
  });

  it('should handle a simple text conversation', async () => {
    mockGetUserInput.mockResolvedValueOnce('Hello Claude').mockResolvedValueOnce('exit');
    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Hi there!' }],
    });

    await agent.start();

    expect(mockGetUserInput).toHaveBeenCalledTimes(2);
    expect(mockHandleResponse).toHaveBeenCalledWith('Hi there!');
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
    expect(mockMessagesCreate).toHaveBeenCalledWith(
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
    mockMessagesCreate
      .mockResolvedValueOnce({
        content: [{
          type: 'tool_use',
          id: 'toolu_123',
          name: 'test_tool',
          input: { query: 'some data' },
        }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Tool executed successfully.' }],
      });

    await agent.start();

    expect(mockGetUserInput).toHaveBeenCalledTimes(2);
    expect(mockTool.execute).toHaveBeenCalledWith({ query: 'some data' });
    expect(mockHandleResponse).toHaveBeenCalledWith('Tool executed successfully.');
    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
    expect(mockMessagesCreate).toHaveBeenCalledWith(
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
    mockMessagesCreate
      .mockResolvedValueOnce({
        content: [{
          type: 'tool_use',
          id: 'toolu_456',
          name: 'non_existent_tool',
          input: {},
        }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Understood, tool not found.' }],
      });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Mock console.log to prevent "Chat with Claude" output

    await agent.start();

    expect(mockGetUserInput).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Tool non_existent_tool not found.');
    expect(mockHandleResponse).toHaveBeenCalledWith('Understood, tool not found.');
    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
    expect(mockMessagesCreate).toHaveBeenCalledWith(
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
              content: 'Error: Tool non_existent_tool not found.', // Corrected expectation
            }],
          },
          { role: 'assistant', content: [{ type: 'text', text: 'Understood, tool not found.' }] }, // Added this line
        ]),
      })
    );
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore(); // Restore console.log
  });

  it('should handle API errors gracefully', async () => {
    mockGetUserInput.mockResolvedValueOnce('Trigger error').mockResolvedValueOnce('exit');
    const apiError = new Error('Anthropic API error');
    mockMessagesCreate.mockRejectedValueOnce(apiError);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Mock console.log

    await agent.start();

    expect(mockGetUserInput).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', apiError);
    expect(mockHandleResponse).not.toHaveBeenCalled(); // No response from agent if API errors
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore(); // Restore console.log
  });

  it('should log tool use when config.logToolUse is true', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((...args) => {
      // Strip ANSI escape codes for consistent testing
      const strippedArgs = args.map(arg =>
        typeof arg === 'string' ? arg.replace(/\x1b\[[0-9;]*m/g, '') : arg
      );
      consoleLogSpy.mock.calls.push(strippedArgs);
    });
    mockGetUserInput.mockResolvedValueOnce('Hello Claude').mockResolvedValueOnce('exit');
    mockMessagesCreate
      .mockResolvedValueOnce({
        content: [{
          type: 'tool_use',
          id: 'toolu_123',
          name: 'test_tool',
          input: { query: 'some data' },
        }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Tool executed successfully.' }],
      });

    await agent.start();

    expect(consoleLogSpy.mock.calls.flat()).toContain('Chat with Claude (type \'exit\' to quit)');
    expect(consoleLogSpy.mock.calls.flat()).toContain('Claude is using tool: test_tool with input {"query":"some data"}');
    expect(consoleLogSpy.mock.calls.flat()).toContain('Tool result: "Tool result for some data"');
    consoleLogSpy.mockRestore();
  });

  it('should not log tool use when config.logToolUse is false', async () => {
    agent = new Agent(mockGetUserInput, mockHandleResponse, [mockTool], { logToolUse: false });
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((...args) => {
      // Strip ANSI escape codes for consistent testing
      const strippedArgs = args.map(arg =>
        typeof arg === 'string' ? arg.replace(/\x1b\[[0-9;]*m/g, '') : arg
      );
      consoleLogSpy.mock.calls.push(strippedArgs);
    });
    mockGetUserInput.mockResolvedValueOnce('Use the tool').mockResolvedValueOnce('exit');
    mockMessagesCreate
      .mockResolvedValueOnce({
        content: [{
          type: 'tool_use',
          id: 'toolu_123',
          name: 'test_tool',
          input: { query: 'some data' },
        }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Tool executed successfully.' }],
      });

    await agent.start();

    expect(consoleLogSpy.mock.calls.flat()).toContain('Chat with Claude (type \'exit\' to quit)');
    expect(consoleLogSpy.mock.calls.flat()).not.toContain(expect.stringContaining('Claude is using tool:'));
    expect(consoleLogSpy.mock.calls.flat()).not.toContain(expect.stringContaining('Tool result:'));
    consoleLogSpy.mockRestore();
  });
});