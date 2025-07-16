import { ProgressIndicator } from '../types';

// Use dynamic import for ora to handle ES module
let oraModule: any;

async function getOra() {
  if (!oraModule) {
    oraModule = (await import('ora')).default;
  }
  return oraModule;
}

/**
 * Manages progress indicators and loading animations using ora library
 */
export class ProgressManager {
  private activeIndicators: Map<string, { indicator: ProgressIndicator; spinner: any }> = new Map();
  private enabled: boolean;
  private oraReady: Promise<any>;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
    this.oraReady = getOra();
  }

  /**
   * Create a new progress indicator with ora spinner
   */
  async createIndicator(id: string, message: string): Promise<ProgressIndicator> {
    // If indicator already exists, stop it first
    if (this.activeIndicators.has(id)) {
      this.removeIndicator(id);
    }

    const ora = await this.oraReady;
    const spinner = ora({
      text: message,
      spinner: 'dots',
      color: 'cyan'
    });

    const indicator: ProgressIndicator = {
      start: (msg: string) => {
        if (this.enabled) {
          spinner.text = msg;
          spinner.start();
        }
      },
      
      update: (msg: string) => {
        if (this.enabled && spinner.isSpinning) {
          spinner.text = msg;
        }
      },
      
      succeed: (msg?: string) => {
        if (this.enabled && spinner.isSpinning) {
          spinner.succeed(msg);
        }
        this.activeIndicators.delete(id);
      },
      
      fail: (msg?: string) => {
        if (this.enabled && spinner.isSpinning) {
          spinner.fail(msg);
        }
        this.activeIndicators.delete(id);
      },
      
      stop: () => {
        if (this.enabled && spinner.isSpinning) {
          spinner.stop();
        }
        this.activeIndicators.delete(id);
      }
    };

    this.activeIndicators.set(id, { indicator, spinner });
    return indicator;
  }

  /**
   * Stop and remove progress indicator
   */
  removeIndicator(id: string): void {
    const entry = this.activeIndicators.get(id);
    if (entry) {
      if (entry.spinner.isSpinning) {
        entry.spinner.stop();
      }
      this.activeIndicators.delete(id);
    }
  }

  /**
   * Stop all active indicators
   */
  stopAll(): void {
    for (const [id, entry] of this.activeIndicators) {
      if (entry.spinner.isSpinning) {
        entry.spinner.stop();
      }
    }
    this.activeIndicators.clear();
  }

  /**
   * Get count of active indicators
   */
  getActiveCount(): number {
    return this.activeIndicators.size;
  }

  /**
   * Check if a specific indicator is active
   */
  isActive(id: string): boolean {
    const entry = this.activeIndicators.get(id);
    return entry ? entry.spinner.isSpinning : false;
  }

  /**
   * Enable or disable progress indicators
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
  }

  /**
   * Create a progress indicator for Claude processing with predefined styling
   */
  async createClaudeIndicator(message: string = 'Processing with Claude...'): Promise<ProgressIndicator> {
    const ora = await this.oraReady;
    const spinner = ora({
      text: message,
      spinner: 'bouncingBall',
      color: 'blue'
    });

    const id = `claude-${Date.now()}`;
    
    const indicator: ProgressIndicator = {
      start: (msg: string) => {
        if (this.enabled) {
          spinner.text = msg;
          spinner.start();
        }
      },
      
      update: (msg: string) => {
        if (this.enabled && spinner.isSpinning) {
          spinner.text = msg;
        }
      },
      
      succeed: (msg?: string) => {
        if (this.enabled && spinner.isSpinning) {
          spinner.succeed(msg || 'Claude processing complete');
        }
        this.activeIndicators.delete(id);
      },
      
      fail: (msg?: string) => {
        if (this.enabled && spinner.isSpinning) {
          spinner.fail(msg || 'Claude processing failed');
        }
        this.activeIndicators.delete(id);
      },
      
      stop: () => {
        if (this.enabled && spinner.isSpinning) {
          spinner.stop();
        }
        this.activeIndicators.delete(id);
      }
    };

    this.activeIndicators.set(id, { indicator, spinner });
    return indicator;
  }

  /**
   * Create a progress indicator for tool execution with predefined styling
   */
  async createToolIndicator(toolName: string, message?: string): Promise<ProgressIndicator> {
    const ora = await this.oraReady;
    const defaultMessage = message || `Executing ${toolName}...`;
    const spinner = ora({
      text: defaultMessage,
      spinner: 'arrow3',
      color: 'yellow'
    });

    const id = `tool-${toolName}-${Date.now()}`;
    
    const indicator: ProgressIndicator = {
      start: (msg: string) => {
        if (this.enabled) {
          spinner.text = msg;
          spinner.start();
        }
      },
      
      update: (msg: string) => {
        if (this.enabled && spinner.isSpinning) {
          spinner.text = msg;
        }
      },
      
      succeed: (msg?: string) => {
        if (this.enabled && spinner.isSpinning) {
          spinner.succeed(msg || `${toolName} completed successfully`);
        }
        this.activeIndicators.delete(id);
      },
      
      fail: (msg?: string) => {
        if (this.enabled && spinner.isSpinning) {
          spinner.fail(msg || `${toolName} failed`);
        }
        this.activeIndicators.delete(id);
      },
      
      stop: () => {
        if (this.enabled && spinner.isSpinning) {
          spinner.stop();
        }
        this.activeIndicators.delete(id);
      }
    };

    this.activeIndicators.set(id, { indicator, spinner });
    return indicator;
  }
}