import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { Agent, AgentConfig } from './agent';
import { Tool } from './tools';
import { readFile } from './tools/read-file';
import { listFiles } from './tools/list-files';
import { editFile } from './tools/edit-file';

dotenv.config();

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
  const tools: Tool[] = [readFile, listFiles, editFile];
  const agentConfig: AgentConfig = {
    logToolUse: false, // Set to false to disable tool use logging
  };
  const agent = new Agent(getUserInput, handleResponse, tools, agentConfig);
  await agent.start();
  rl.close();
}

main();