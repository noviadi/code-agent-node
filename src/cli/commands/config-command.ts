import { SpecialCommand } from '../types';
import { DisplayManager } from '../components/display-manager';
import { MessageType } from '../types';
import { SessionManager } from '../session-manager';

export class ConfigCommand implements SpecialCommand {
  name = 'config';
  description = 'Show current configuration settings';

  constructor(
    private displayManager: DisplayManager,
    private sessionManager: SessionManager
  ) {}

  async handler(args: string[]): Promise<void> {
    const config = this.sessionManager.getConfig();
    
    this.displayManager.displayMessage('Current Configuration:', MessageType.SYSTEM);
    this.displayManager.displayMessage('', MessageType.SYSTEM);
    
    Object.entries(config).forEach(([key, value]) => {
      const formattedKey = key.replace(/([A-Z])/g, ' $1').toLowerCase();
      const capitalizedKey = formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);
      
      this.displayManager.displayMessage(
        `  ${capitalizedKey.padEnd(20)} : ${value}`,
        MessageType.SYSTEM
      );
    });
    
    this.displayManager.displayMessage('', MessageType.SYSTEM);
    this.displayManager.displayMessage(
      'Configuration can be modified by editing the config file or using theme commands.',
      MessageType.SYSTEM
    );
  }

  autoComplete(): string[] {
    return ['display', 'theme', 'history', 'editor'];
  }
}