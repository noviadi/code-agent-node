import Anthropic from '@anthropic-ai/sdk';
import { Tool } from './tools';
import { formatToolInputSchema } from './utils/tool-utils';

export interface AgentConfig {
  logToolUse?: boolean;
}

export class Agent {
  private client: Anthropic;
  private getUserInput: () => Promise<string>;
  private handleResponse: (respond: string) => Promise<void>;
  private tools: Tool[];
  private config: AgentConfig;

  constructor(
    getUserInput: () => Promise<string>,
    handleResponse: (respond: string) => Promise<void>,
    tools: Tool[] = [],
    config: AgentConfig = { logToolUse: true } // Default to logging tool use
  ) {
    this.getUserInput = getUserInput;
    this.handleResponse = handleResponse;
    this.tools = tools;
    this.config = config;
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  private async runInference(conversation: Anthropic.MessageParam[]): Promise<Anthropic.Message> {
    const toolSpecs = this.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: formatToolInputSchema(tool),
    }));

    return await this.client.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      messages: conversation,
      tools: toolSpecs,
    });
  }

  async start(): Promise<void> {
    const conversation: Anthropic.MessageParam[] = [];
    console.log("Chat with Claude (type 'exit' to quit)");

    while (true) {
      const userInput = await this.getUserInput();

      if (userInput.toLowerCase() === 'exit') {
        break;
      }

      const userMessage: Anthropic.MessageParam = {
        role: 'user',
        content: userInput,
      };
      conversation.push(userMessage);

      try {
        let response = await this.runInference(conversation);

        while (response.stop_reason === 'tool_use') {
          // Add the assistant's tool_use message to the conversation history
          conversation.push({
            role: 'assistant',
            content: response.content,
          });

          for (const contentBlock of response.content) {
            if (contentBlock.type === 'tool_use') {
              const { id, name, input } = contentBlock;
              const tool = this.tools.find(t => t.name === name);

              if (tool) {
                if (this.config.logToolUse) {
                  console.log(`\x1b[96mClaude is using tool:\x1b[0m ${name} with input ${JSON.stringify(input)}`);
                }
                const toolResult = await tool.execute(input);
                if (this.config.logToolUse) {
                  console.log(`\x1b[96mTool result:\x1b[0m ${JSON.stringify(toolResult)}`);
                }

                // Add the tool_result as a user message
                conversation.push({
                  role: 'user',
                  content: [{
                    type: 'tool_result',
                    tool_use_id: id,
                    content: JSON.stringify(toolResult),
                  }],
                });
              } else {
                console.error(`Tool ${name} not found.`);
                // Add an error tool_result as a user message
                conversation.push({
                  role: 'user',
                  content: [{
                    type: 'tool_result',
                    tool_use_id: id,
                    content: `Error: Tool ${name} not found.`,
                  }],
                });
              }
            }
          }
          // After processing tool results, run inference again to get the final text response
          response = await this.runInference(conversation);
        }

        // If the final response is text, handle it
        const assistantMessage = response.content[0];
        if (assistantMessage.type === 'text') {
          await this.handleResponse(assistantMessage.text);
          conversation.push({
              role: 'assistant',
              content: assistantMessage.text,
          });
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }
  }
}