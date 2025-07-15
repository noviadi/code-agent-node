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

  private async executeToolCall(
    toolUseBlock: Anthropic.ToolUseBlock,
    conversation: Anthropic.MessageParam[],
  ): Promise<void> {
    const { id, name, input } = toolUseBlock;
    const tool = this.tools.find(t => t.name === name);

    if (tool) {
      if (this.config.logToolUse) {
        console.log(`\x1b[96mClaude is using tool:\x1b[0m ${name} with input ${JSON.stringify(input)}`);
      }
      const toolResult = await tool.execute(input);
      if (this.config.logToolUse) {
        console.log(`\x1b[96mTool result:\x1b[0m ${JSON.stringify(toolResult)}`);
      }

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

  getAvailableTools(): Tool[] {
    return this.tools;
  }

  async start(): Promise<void> {
    const conversation: Anthropic.MessageParam[] = [];
    console.log("Chat with Claude (type 'exit' to quit)");

    let readUserInput = true;
    while (true) {
      if (readUserInput) {
        const userInput = await this.getUserInput();

        if (userInput.toLowerCase() === 'exit') {
          break;
        }

        const userMessage: Anthropic.MessageParam = {
          role: 'user',
          content: userInput,
        };
        conversation.push(userMessage);
      }

      try {
        const response = await this.runInference(conversation);
        conversation.push({
          role: 'assistant',
          content: response.content,
        });

        const toolResultsPresent = response.content.some(
          (block) => block.type === 'tool_use'
        );

        if (toolResultsPresent) {
          for (const contentBlock of response.content) {
            if (contentBlock.type === 'tool_use') {
              await this.executeToolCall(contentBlock, conversation);
            }
          }
          readUserInput = false; // Continue with tool results
        } else {
          const assistantMessage = response.content[0];
          if (assistantMessage.type === 'text') {
            await this.handleResponse(assistantMessage.text);
          }
          readUserInput = true; // Wait for new user input
        }
      } catch (error) {
        console.error('Error:', error);
        readUserInput = true; // Allow user to try again after error
      }
    }
  }
}