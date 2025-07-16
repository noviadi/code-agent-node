import * as dotenv from 'dotenv';
import { Agent, AgentConfig } from './agent';
import { Tool } from './tools';
import { readFile } from './tools/read-file';
import { listFiles } from './tools/list-files';
import { editFile } from './tools/edit-file';
import { InteractiveCLIManager } from './cli/interactive-cli-manager';
import { InteractiveCLIConfig } from './cli/types';

dotenv.config();

// Default configuration for the Interactive CLI
const defaultCLIConfig: InteractiveCLIConfig = {
  theme: 'default',
  historySize: 100,
  autoSave: true,
  progressIndicators: true,
  multiLineEditor: true
};

// Load configuration from environment variables or use defaults
function loadCLIConfiguration(): InteractiveCLIConfig {
  return {
    theme: process.env.CLI_THEME || defaultCLIConfig.theme,
    historySize: parseInt(process.env.CLI_HISTORY_SIZE || '100', 10),
    autoSave: process.env.CLI_AUTO_SAVE === 'true' || defaultCLIConfig.autoSave,
    progressIndicators: process.env.CLI_PROGRESS_INDICATORS !== 'false',
    multiLineEditor: process.env.CLI_MULTILINE_EDITOR !== 'false'
  };
}

// Fallback functions for backward compatibility (used by Agent class)
const getUserInput = async (): Promise<string> => {
  // This should not be called when using InteractiveCLIManager
  // but kept for backward compatibility
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise<string>((resolve) => {
    rl.question('\x1b[94mYou\x1b[0m: ', (answer: string) => {
      rl.close();
      resolve(answer);
    });
  });
};

const handleResponse = async (respond: string) => {
  // This should not be called when using InteractiveCLIManager
  // but kept for backward compatibility
  console.log(`\x1b[93mClaude\x1b[0m: ${respond}`);
};

async function main() {
  try {
    // Initialize tools
    const tools: Tool[] = [readFile, listFiles, editFile];
    
    // Configure agent with tool use logging disabled (InteractiveCLIManager handles display)
    const agentConfig: AgentConfig = {
      logToolUse: false, // InteractiveCLIManager will handle tool display
    };
    
    // Create agent with fallback functions (not used by InteractiveCLIManager)
    const agent = new Agent(getUserInput, handleResponse, tools, agentConfig);
    
    // Load CLI configuration
    const cliConfig = loadCLIConfiguration();
    
    // Create and start Interactive CLI Manager
    const cliManager = new InteractiveCLIManager(agent, cliConfig);
    
    console.log('🚀 Starting Interactive CLI...');
    await cliManager.start();
    
  } catch (error) {
    console.error('❌ Failed to start Interactive CLI:', error);
    console.log('🔄 Falling back to basic CLI...');
    
    // Fallback to basic CLI if InteractiveCLIManager fails
    await startBasicCLI();
  }
}

// Fallback function for basic CLI (original implementation)
async function startBasicCLI() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const basicGetUserInput = async (): Promise<string> => {
    return new Promise<string>((resolve) => {
      rl.question('\x1b[94mYou\x1b[0m: ', resolve);
    });
  };

  const basicHandleResponse = async (respond: string) => {
    console.log(`\x1b[93mClaude\x1b[0m: ${respond}`);
  };

  try {
    const tools: Tool[] = [readFile, listFiles, editFile];
    const agentConfig: AgentConfig = {
      logToolUse: true, // Enable logging in basic mode
    };
    const agent = new Agent(basicGetUserInput, basicHandleResponse, tools, agentConfig);
    await agent.start();
  } catch (error) {
    console.error('❌ Basic CLI also failed:', error);
  } finally {
    rl.close();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

main().catch((error) => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});