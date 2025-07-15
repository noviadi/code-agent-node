import { InteractiveCLIConfig } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Manages configuration persistence and loading using file-based storage
 * Provides methods for loading, saving, and updating CLI configuration
 */
export class ConfigurationManager {
  private config: InteractiveCLIConfig;
  private configPath: string;

  constructor() {
    // Set up configuration file path
    const configDir = path.join(os.homedir(), '.code-agent-node-cli');
    this.configPath = path.join(configDir, 'config.json');

    // Load initial configuration
    this.config = this.getDefaultConfig();
    this.loadConfig();
  }

  /**
   * Load configuration from storage
   */
  async load(): Promise<InteractiveCLIConfig> {
    await this.loadConfig();
    return this.config;
  }

  /**
   * Save configuration to storage
   */
  async save(config: InteractiveCLIConfig): Promise<void> {
    // Validate configuration before saving
    this.validateConfig(config);

    // Ensure config directory exists
    await this.ensureConfigDir();

    // Save configuration to file
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');

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
    return this.configPath;
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
   * Load configuration from file
   */
  private async loadConfig(): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      const loadedConfig = JSON.parse(data) as InteractiveCLIConfig;

      // Validate loaded configuration
      this.validateConfig(loadedConfig);
      this.config = loadedConfig;
    } catch (error) {
      // If file doesn't exist or is invalid, use defaults
      this.config = this.getDefaultConfig();

      // Save default configuration for future use
      try {
        await this.save(this.config);
      } catch (saveError) {
        // If we can't save, just continue with defaults in memory
        console.warn('Warning: Could not save default configuration:', (saveError as Error).message);
      }
    }
  }

  /**
   * Ensure configuration directory exists
   */
  private async ensureConfigDir(): Promise<void> {
    const configDir = path.dirname(this.configPath);
    try {
      await fs.access(configDir);
    } catch {
      await fs.mkdir(configDir, { recursive: true });
    }
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