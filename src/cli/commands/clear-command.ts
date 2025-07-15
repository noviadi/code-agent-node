import { SpecialCommand } from '../types';
import { DisplayManager } from '../display-manager';

export class ClearCommand implements SpecialCommand {
  name = 'clear';
  description = 'Clear the terminal screen';

  constructor(private displayManager: DisplayManager) {}

  async handler(args: string[]): Promise<void> {
    this.displayManager.clearScreen();
  }

  autoComplete(): string[] {
    return [];
  }
}