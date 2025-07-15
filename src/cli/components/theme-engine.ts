import { Theme } from '../types';

/**
 * Manages themes and color schemes for the interactive CLI
 */
export class ThemeEngine {
  private currentTheme: Theme;
  private availableThemes: Map<string, Theme> = new Map();

  constructor(initialTheme?: string) {
    // Initialize with default themes
    this.initializeDefaultThemes();
    
    // Set initial theme
    const themeName = initialTheme || 'light';
    this.currentTheme = this.availableThemes.get(themeName) || this.getLightTheme();
  }

  /**
   * Get current active theme
   */
  getCurrentTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * Switch to specified theme
   */
  setTheme(themeName: string): boolean {
    const theme = this.availableThemes.get(themeName);
    if (theme) {
      this.currentTheme = theme;
      return true;
    }
    return false;
  }

  /**
   * Get list of available theme names
   */
  getAvailableThemes(): string[] {
    return Array.from(this.availableThemes.keys());
  }

  /**
   * Register a new theme
   */
  registerTheme(theme: Theme): void {
    this.availableThemes.set(theme.name, theme);
  }

  /**
   * Check if a theme exists
   */
  hasTheme(themeName: string): boolean {
    return this.availableThemes.has(themeName);
  }

  /**
   * Get a specific theme by name
   */
  getTheme(themeName: string): Theme | undefined {
    return this.availableThemes.get(themeName);
  }

  /**
   * Initialize default light and dark themes
   */
  private initializeDefaultThemes(): void {
    this.availableThemes.set('light', this.getLightTheme());
    this.availableThemes.set('dark', this.getDarkTheme());
  }

  /**
   * Get light theme configuration
   */
  private getLightTheme(): Theme {
    return {
      name: 'light',
      colors: {
        user: '#2563eb',      // Blue
        assistant: '#059669', // Green
        system: '#7c3aed',    // Purple
        error: '#dc2626',     // Red
        success: '#16a34a',   // Green
        warning: '#ea580c',   // Orange
        tool: '#9333ea',      // Purple
        prompt: '#374151'     // Gray
      },
      symbols: {
        user: '❯',
        assistant: '◆',
        loading: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
        success: '✓',
        error: '✗'
      }
    };
  }

  /**
   * Get dark theme configuration
   */
  private getDarkTheme(): Theme {
    return {
      name: 'dark',
      colors: {
        user: '#60a5fa',      // Light Blue
        assistant: '#34d399', // Light Green
        system: '#a78bfa',    // Light Purple
        error: '#f87171',     // Light Red
        success: '#4ade80',   // Light Green
        warning: '#fb923c',   // Light Orange
        tool: '#c084fc',      // Light Purple
        prompt: '#d1d5db'     // Light Gray
      },
      symbols: {
        user: '❯',
        assistant: '◆',
        loading: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
        success: '✓',
        error: '✗'
      }
    };
  }
}