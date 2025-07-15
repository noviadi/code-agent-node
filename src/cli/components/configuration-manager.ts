import Conf from 'conf';
import { InteractiveCLIConfig } from '../types';

/**
 * Manages configuration persistence and loading using the conf library
 * Provides methods for loading, saving, and updating CLI configuration
 */
export class ConfigurationManager {
  private config: InteractiveCLIConfig;
  private store: Conf;

  constructor() {
    // Initialize conf store with default values
    this.store = new Conf({
      projectName: 'code-agent-node-cli',
      defaults: this.getDefaultConfig()
    });

    // Load initial configuration
    this.config = this.loadFromStore();
  }

  /**
   * Load configuration from storage
   */
  async load(): Promise<InteractiveCLIConfig> {
    this.config = this.loadFromStore();
    return this.config;
  }

  /**
   * Save configuration to storage
   */
  async save(config: InteractiveCLIConfig): Promise<void> {
    // Validate configuration before saving
    this.validateConfig(config);
    
    // Save each property individually to the store
    this.store.set('theme', config.theme);
    this.store.set('historySize', config.historySize);
    this.store.set('autoSave', config.autoSave);
    this.store.set('progressIndicators', config.progressIndicators);
    this.store.set('multiLineEditor', config.multiLineEditor);
    
    this.config = config;
  }

  /**
   * Update specific configuration values
   */
  async update(updates: Partial<InteractiveCLIConfig>): Promise<void> {
    const newConfig = { ...this.config, ...updates };
    await this.save(newConfig);
  }

  /**
   * Get current configuration
   */
  getConfig(): InteractiveCLIConfig {
    return { ...this.config };
  }

  /**
   * Reset to default configuration
   */
  async resetToDefaults(): Promise<InteractiveCLIConfig> {
    const defaultConfig = this.getDefaultConfig();
    await this.save(defaultConfig);
    return defaultConfig;
  }

  /**
   * Get the configuration file path
   */
  getConfigPath(): string {
    return this.store.path;
  }

  /**
   * Check if a specific theme is valid
   */
  isValidTheme(theme: string): boolean {
    const validThemes = ['default', 'dark', 'light', 'minimal'];
    return validThemes.includes(theme);
  }

  /**
   * Get available theme options
   */
  getAvailableThemes(): string[] {
    return ['default', 'dark', 'light', 'minimal'];
  }

  /**
   * Load configuration from the conf store
   */
  private loadFromStore(): InteractiveCLIConfig {
    return {
      theme: this.store.get('theme') as string,
      historySize: this.store.get('historySize') as number,
      autoSave: this.store.get('autoSave') as boolean,
      progressIndicators: this.store.get('progressIndicators') as boolean,
      multiLineEditor: this.store.get('multiLineEditor') as boolean
    };
  }

  /**
   * Validate configuration values
   */
  private validateConfig(config: InteractiveCLIConfig): void {
    if (!this.isValidTheme(config.theme)) {
      throw new Error(`Invalid theme: ${config.theme}. Valid themes: ${this.getAvailableThemes().join(', ')}`);
    }

    if (config.historySize < 10 || config.historySize > 1000) {
      throw new Error('History size must be between 10 and 1000');
    }

    if (typeof config.autoSave !== 'boolean') {
      throw new Error('autoSave must be a boolean value');
    }

    if (typeof config.progressIndicators !== 'boolean') {
      throw new Error('progressIndicators must be a boolean value');
    }

    if (typeof config.multiLineEditor !== 'boolean') {
      throw new Error('multiLineEditor must be a boolean value');
    }
  }

  /**
   * Get default configuration values
   */
  private getDefaultConfig(): InteractiveCLIConfig {
    return {
      theme: 'default',
      historySize: 100,
      autoSave: true,
      progressIndicators: true,
      multiLineEditor: true
    };
  }
}