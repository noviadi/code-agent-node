import { SpecialCommand } from '../types';
import { DisplayManager } from '../components/display-manager';
import { MessageType } from '../types';

export class ExitCommand implements SpecialCommand {
  name = 'exit';
  description = 'Gracefully exit the application';

  constructor(private displayManager: DisplayManager) {}

  async handler(args: string[]): Promise<void> {
    this.displayManager.displayMessage('Goodbye! 👋', MessageType.SYSTEM);
    process.exit(0);
  }

  autoComplete(): string[] {
    return [];
  }
}