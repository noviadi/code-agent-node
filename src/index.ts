import Anthropic from '@anthropic-ai/sdk';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const conversation: Anthropic.MessageParam[] = [];

async function runInference(conversation: Anthropic.MessageParam[]): Promise<Anthropic.Message> {
  return await client.messages.create({
    model: 'claude-3-5-sonnet-20240620',
    max_tokens: 1024,
    messages: conversation,
  });
}

async function chat() {
  console.log("Chat with Claude (type 'exit' to quit)");

  while (true) {
    const userInput = await new Promise<string>((resolve) => {
      rl.question('\x1b[94mYou\x1b[0m: ', resolve);
    });

    if (userInput.toLowerCase() === 'exit') {
      break;
    }

    const userMessage: Anthropic.MessageParam = {
      role: 'user',
      content: userInput,
    };
    conversation.push(userMessage);

    try {
      const response = await runInference(conversation);

      const assistantMessage = response.content[0];
      if (assistantMessage.type === 'text') {
        console.log(`\x1b[93mClaude\x1b[0m: ${assistantMessage.text}`);
        conversation.push({
            role: 'assistant',
            content: assistantMessage.text,
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  rl.close();
}

chat();