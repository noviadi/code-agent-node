import Anthropic from '@anthropic-ai/sdk';

export class Agent {
  private client: Anthropic;
  private getUserInput: () => Promise<string>;
  private handleResponse: (respond: string) => Promise<void>;

  constructor(getUserInput: () => Promise<string>, handleResponse: (respond: string) => Promise<void>) {
    this.getUserInput = getUserInput;
    this.handleResponse = handleResponse;
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  private async runInference(conversation: Anthropic.MessageParam[]): Promise<Anthropic.Message> {
    return await this.client.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      messages: conversation,
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
        const response = await this.runInference(conversation);

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