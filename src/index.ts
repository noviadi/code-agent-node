import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { Agent, AgentConfig } from './agent';
import { readFileAi } from './tools/read-file';
import { listFilesAi } from './tools/list-files';
import { editFileAi } from './tools/edit-file';

dotenv.config();

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const getUserInput = async (): Promise<string> => {
  return new Promise<string>((resolve) => {
    rl.question('\x1b[94mYou\x1b[0m: ', resolve);
  });
};

const handleResponse = async (respond: string) => {
  console.log(`\x1b[93mClaude\x1b[0m: ${respond}`);
}

async function main() {
  const tools = {
    read_file: readFileAi,
    list_files: listFilesAi,
    edit_file: editFileAi
  };
  const agentConfig: AgentConfig = {
    logToolUse: process.env.LOG_TOOL_USE !== 'false', // Enable tool use logging by default, disable if LOG_TOOL_USE=false
    model: process.env.MODEL || 'claude-sonnet-4-5-20250929',
  };
  const agent = new Agent(getUserInput, handleResponse, tools, agentConfig);
  await agent.start();
  rl.close();
}

main();