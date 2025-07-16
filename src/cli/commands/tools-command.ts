import { SpecialCommand } from '../types';
import { DisplayManager } from '../components/display-manager';
import { MessageType } from '../types';
import { Agent } from '../../agent';

export class ToolsCommand implements SpecialCommand {
  name = 'tools';
  description = 'List available tools and their descriptions';

  constructor(
    private displayManager: DisplayManager,
    private agent: Agent
  ) {}

  async handler(args: string[]): Promise<void> {
    const tools = this.agent.getAvailableTools();
    
    if (tools.length === 0) {
      this.displayManager.displayMessage('No tools are currently available.', MessageType.SYSTEM);
      return;
    }
    
    this.displayManager.displayMessage('Available Tools:', MessageType.SYSTEM);
    this.displayManager.displayMessage('', MessageType.SYSTEM);
    
    tools.forEach(tool => {
      this.displayManager.displayMessage(
        `  ${tool.name.padEnd(14)} - ${tool.description}`,
        MessageType.TOOL
      );
    });
    
    this.displayManager.displayMessage('', MessageType.SYSTEM);
    this.displayManager.displayMessage(
      'Tools are automatically used by Claude when needed during conversations.',
      MessageType.SYSTEM
    );
  }

  autoComplete(): string[] {
    return [];
  }
}