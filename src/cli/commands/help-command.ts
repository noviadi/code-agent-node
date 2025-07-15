import { SpecialCommand } from '../types';
import { DisplayManager } from '../display-manager';
import { MessageType } from '../types';

export class HelpCommand implements SpecialCommand {
  name = 'help';
  description = 'Display available commands and shortcuts';

  constructor(
    private displayManager: DisplayManager,
    private getAvailableCommands: () => SpecialCommand[]
  ) {}

  async handler(args: string[]): Promise<void> {
    const commands = this.getAvailableCommands();
    
    this.displayManager.displayMessage('Available Commands:', MessageType.SYSTEM);
    this.displayManager.displayMessage('', MessageType.SYSTEM);
    
    commands.forEach(command => {
      this.displayManager.displayMessage(
        `  ${command.name.padEnd(12)} - ${command.description}`,
        MessageType.SYSTEM
      );
    });
    
    this.displayManager.displayMessage('', MessageType.SYSTEM);
    this.displayManager.displayMessage('Keyboard Shortcuts:', MessageType.SYSTEM);
    this.displayManager.displayMessage('  ↑/↓ arrows    - Navigate command history', MessageType.SYSTEM);
    this.displayManager.displayMessage('  Tab           - Auto-complete commands', MessageType.SYSTEM);
    this.displayManager.displayMessage('  Shift+Enter   - Multi-line input', MessageType.SYSTEM);
    this.displayManager.displayMessage('  Ctrl+C        - Exit with confirmation', MessageType.SYSTEM);
    this.displayManager.displayMessage('  Ctrl+E        - Open external editor', MessageType.SYSTEM);
  }

  autoComplete(): string[] {
    return [];
  }
}