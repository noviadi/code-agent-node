import * as dotenv from 'dotenv';
import { Command } from 'commander';
import * as readline from 'readline';
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

// Load configuration from command line arguments and environment variables
function loadCLIConfiguration(options: any): InteractiveCLIConfig {
  return {
    theme: options.theme || process.env.CLI_THEME || defaultCLIConfig.theme,
    historySize: options.historySize || parseInt(process.env.CLI_HISTORY_SIZE || '100', 10),
    autoSave: options.autoSave !== undefined ? options.autoSave : (process.env.CLI_AUTO_SAVE === 'true' || defaultCLIConfig.autoSave),
    progressIndicators: options.progressIndicators !== undefined ? options.progressIndicators : (process.env.CLI_PROGRESS_INDICATORS !== 'false'),
    multiLineEditor: options.multiLineEditor !== undefined ? options.multiLineEditor : (process.env.CLI_MULTILINE_EDITOR !== 'false')
  };
}

// Display welcome screen with usage instructions
function displayWelcomeScreen() {
  console.log('\n🤖 \x1b[96mCode Agent Node\x1b[0m - Interactive AI Assistant');
  console.log('\x1b[90m' + '='.repeat(50) + '\x1b[0m');
  console.log('\n\x1b[93mWelcome to your AI-powered coding assistant!\x1b[0m');
  console.log('\nThis interactive CLI provides enhanced features including:');
  console.log('  • \x1b[92mColored output\x1b[0m and visual indicators');
  console.log('  • \x1b[92mCommand history\x1b[0m with arrow key navigation');
  console.log('  • \x1b[92mAuto-completion\x1b[0m for commands and suggestions');
  console.log('  • \x1b[92mMulti-line input\x1b[0m support (Shift+Enter)');
  console.log('  • \x1b[92mSpecial commands\x1b[0m starting with "/" (type /help for list)');
  console.log('  • \x1b[92mConversation management\x1b[0m and export features');
  console.log('\n\x1b[94mTip:\x1b[0m Type "/help" to see all available commands');
  console.log('\x1b[94mTip:\x1b[0m Use Ctrl+C to exit with confirmation');
  console.log('\x1b[90m' + '='.repeat(50) + '\x1b[0m\n');
}

// Handle graceful shutdown with confirmation
async function handleGracefulShutdown(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<void>((resolve) => {
    console.log('\n\x1b[93m⚠️  Interrupt signal received\x1b[0m');
    rl.question('\x1b[96mAre you sure you want to exit? (y/N): \x1b[0m', (answer: string) => {
      rl.close();
      
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log('\n👋 \x1b[92mGoodbye! Thanks for using Code Agent Node.\x1b[0m');
        process.exit(0);
      } else {
        console.log('\n✅ \x1b[92mContinuing...\x1b[0m\n');
        resolve();
      }
    });
  });
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
  // Set up command line argument parsing
  const program = new Command();
  
  program
    .name('code-agent-node')
    .description('Interactive AI-powered coding assistant with Claude')
    .version('1.0.0')
    .option('-t, --theme <theme>', 'Color theme (default, dark, light)', 'default')
    .option('-h, --history-size <size>', 'Command history size', '100')
    .option('--no-auto-save', 'Disable automatic conversation saving')
    .option('--no-progress-indicators', 'Disable progress indicators')
    .option('--no-multiline-editor', 'Disable multi-line editor support')
    .option('--basic', 'Use basic CLI mode (fallback)')
    .option('--no-welcome', 'Skip welcome screen')
    .helpOption('-?, --help', 'Display help information')
    .addHelpText('after', `
Examples:
  $ code-agent-node                    Start with default settings
  $ code-agent-node --theme dark       Use dark theme
  $ code-agent-node --basic            Use basic CLI mode
  $ code-agent-node --no-welcome       Skip welcome screen
  
Environment Variables:
  ANTHROPIC_API_KEY                    Required: Your Anthropic API key
  CLI_THEME                           Default theme (default, dark, light)
  CLI_HISTORY_SIZE                    Command history size (default: 100)
  CLI_AUTO_SAVE                       Enable auto-save (true/false)
  CLI_PROGRESS_INDICATORS             Enable progress indicators (true/false)
  CLI_MULTILINE_EDITOR               Enable multi-line editor (true/false)
`);

  program.parse();
  const options = program.opts();

  try {
    // Check for required API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('\n❌ \x1b[91mError: ANTHROPIC_API_KEY environment variable is required\x1b[0m');
      console.log('\x1b[93mPlease set your Anthropic API key:\x1b[0m');
      console.log('  export ANTHROPIC_API_KEY="your-api-key-here"');
      console.log('\x1b[90mOr create a .env file with: ANTHROPIC_API_KEY=your-api-key-here\x1b[0m\n');
      process.exit(1);
    }

    // Display welcome screen unless disabled
    if (!options.noWelcome) {
      displayWelcomeScreen();
    }

    // Initialize tools
    const tools: Tool[] = [readFile, listFiles, editFile];

    // Use basic CLI if requested
    if (options.basic) {
      console.log('🔧 \x1b[93mStarting in basic CLI mode...\x1b[0m\n');
      await startBasicCLI();
      return;
    }

    // Configure agent with tool use logging disabled (InteractiveCLIManager handles display)
    const agentConfig: AgentConfig = {
      logToolUse: false, // InteractiveCLIManager will handle tool display
    };

    // Create agent with fallback functions (not used by InteractiveCLIManager)
    const agent = new Agent(getUserInput, handleResponse, tools, agentConfig);

    // Load CLI configuration from command line options and environment
    const cliConfig = loadCLIConfiguration(options);

    // Create and start Interactive CLI Manager
    const cliManager = new InteractiveCLIManager(agent, cliConfig);

    console.log('🚀 \x1b[92mStarting Interactive CLI...\x1b[0m\n');
    await cliManager.start();

  } catch (error) {
    console.error('\n❌ \x1b[91mFailed to start Interactive CLI:\x1b[0m', error);
    console.log('🔄 \x1b[93mFalling back to basic CLI...\x1b[0m\n');

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

// Handle graceful shutdown with confirmation
let isShuttingDown = false;

process.on('SIGINT', async () => {
  if (isShuttingDown) {
    console.log('\n🚨 \x1b[91mForce exit detected. Goodbye!\x1b[0m');
    process.exit(1);
  }
  
  isShuttingDown = true;
  try {
    await handleGracefulShutdown();
  } catch (error) {
    console.error('\n❌ Error during shutdown:', error);
    process.exit(1);
  } finally {
    isShuttingDown = false;
  }
});

process.on('SIGTERM', () => {
  console.log('\n👋 \x1b[92mTermination signal received. Goodbye!\x1b[0m');
  process.exit(0);
});

main().catch((error) => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});