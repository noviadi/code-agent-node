import { SpecialCommand } from '../types';
import { DisplayManager } from '../display-manager';
import { MessageType } from '../types';
import { HistoryManager } from '../components/history-manager';

export class HistoryCommand implements SpecialCommand {
  name = 'history';
  description = 'Display recent command history';

  constructor(
    private displayManager: DisplayManager,
    private historyManager: HistoryManager
  ) {}

  async handler(args: string[]): Promise<void> {
    const limit = args.length > 0 ? parseInt(args[0]) || 10 : 10;
    const history = this.historyManager.getRecent(limit);
    
    if (history.length === 0) {
      this.displayManager.displayMessage('No command history available.', MessageType.SYSTEM);
      return;
    }
    
    this.displayManager.displayMessage(`Recent Commands (last ${history.length}):`, MessageType.SYSTEM);
    this.displayManager.displayMessage('', MessageType.SYSTEM);
    
    history.forEach((entry, index) => {
      const timestamp = entry.timestamp.toLocaleTimeString();
      const status = entry.success ? '✓' : '✗';
      this.displayManager.displayMessage(
        `  ${(index + 1).toString().padStart(2)}. [${timestamp}] ${status} ${entry.command}`,
        MessageType.SYSTEM
      );
    });
  }

  autoComplete(): string[] {
    return ['5', '10', '20', '50'];
  }
}