import { anthropic } from '@ai-sdk/anthropic';
import { generateText, ModelMessage} from 'ai';

export interface AgentConfig {
  logToolUse?: boolean;
}

export class Agent {
  private getUserInput: () => Promise<string>;
  private handleResponse: (respond: string) => Promise<void>;
  private tools: Record<string, any>;
  private config: AgentConfig;

  constructor(
    getUserInput: () => Promise<string>,
    handleResponse: (respond: string) => Promise<void>,
    tools: Record<string, any> = {},
    config: AgentConfig = { logToolUse: true } // Default to logging tool use
  ) {
    this.getUserInput = getUserInput;
    this.handleResponse = handleResponse;
    this.tools = tools;
    this.config = config;
  }

  async start(): Promise<void> {
    const conversation: ModelMessage[] = [];
    const systemPrompt = `You are an expert AI assistant integrated into a local development environment.
You have access to tools that can read, write, and list files on the user's machine.
Analyze the user's request and use these tools whenever necessary to accomplish the task. Think step-by-step before acting.`;

    console.log("Chat with Claude (type 'exit' to quit)");

    let readUserInput = true;
    while (true) {
      if (readUserInput) {
        const userInput = await this.getUserInput();

        if (userInput.toLowerCase() === 'exit') {
          break;
        }

        conversation.push({ role: 'user', content: userInput });
      }

      try {
        const { text, toolCalls, toolResults, response } = await generateText({
          model: anthropic('claude-3-5-sonnet-20240620') as any,
          system: systemPrompt,
          messages: conversation,
          tools: this.tools,
        });

        if (this.config.logToolUse) {
            if (toolCalls && toolCalls.length > 0) {
                for(const toolCall of toolCalls) {
                    console.log(`\x1b[96mClaude is using tool:\x1b[0m ${toolCall.toolName} with input ${JSON.stringify(toolCall.input)}`);
                }
            }
            if (toolResults && toolResults.length > 0) {
                for(const toolResult of toolResults) {
                    console.log(`\x1b[96mTool result:\x1b[0m ${JSON.stringify(toolResult.output)}`);
                }
            }
        }

        // Add the response messages to the conversation history
        conversation.push(...response.messages);

        // Check if tools were called
        const toolsWereCalled = toolCalls && toolCalls.length > 0;

        if (toolsWereCalled) {
          // Continue processing tool results without waiting for new user input
          readUserInput = false;
        } else {
          // No tools called, display the response and wait for new user input
          if (text) {
            await this.handleResponse(text);
          } else {
            // When tools are used, the response might be in response.messages instead of text
            // Find the last assistant message and display its content
            const assistantMessages = response.messages.filter(msg => msg.role === 'assistant');
            if (assistantMessages.length > 0) {
              const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
              if (typeof lastAssistantMessage.content === 'string') {
                await this.handleResponse(lastAssistantMessage.content);
              } else if (Array.isArray(lastAssistantMessage.content)) {
                // Handle array content - extract text parts
                const textParts = lastAssistantMessage.content
                  .filter(part => part.type === 'text')
                  .map(part => (part as any).text)
                  .join('');
                if (textParts) {
                  await this.handleResponse(textParts);
                }
              }
            }
          }
          readUserInput = true;
        }

      } catch (error) {
        console.error('Error:', error);
        readUserInput = true; // Allow user to try again after error
      }
    }
  }
}