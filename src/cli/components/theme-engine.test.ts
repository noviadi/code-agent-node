import { ThemeEngine } from './theme-engine';
import { Theme } from '../types';

describe('ThemeEngine', () => {
  let themeEngine: ThemeEngine;

  beforeEach(() => {
    themeEngine = new ThemeEngine();
  });

  describe('constructor', () => {
    it('should initialize with light theme by default', () => {
      const engine = new ThemeEngine();
      const currentTheme = engine.getCurrentTheme();
      
      expect(currentTheme.name).toBe('light');
      expect(currentTheme.colors).toBeDefined();
      expect(currentTheme.symbols).toBeDefined();
    });

    it('should initialize with specified theme', () => {
      const engine = new ThemeEngine('dark');
      const currentTheme = engine.getCurrentTheme();
      
      expect(currentTheme.name).toBe('dark');
    });

    it('should fallback to light theme if specified theme does not exist', () => {
      const engine = new ThemeEngine('nonexistent');
      const currentTheme = engine.getCurrentTheme();
      
      expect(currentTheme.name).toBe('light');
    });
  });

  describe('getCurrentTheme', () => {
    it('should return the current active theme', () => {
      const theme = themeEngine.getCurrentTheme();
      
      expect(theme).toBeDefined();
      expect(theme.name).toBe('light');
      expect(theme.colors).toBeDefined();
      expect(theme.symbols).toBeDefined();
    });
  });

  describe('setTheme', () => {
    it('should switch to existing theme and return true', () => {
      const result = themeEngine.setTheme('dark');
      
      expect(result).toBe(true);
      expect(themeEngine.getCurrentTheme().name).toBe('dark');
    });

    it('should return false for non-existent theme and keep current theme', () => {
      const originalTheme = themeEngine.getCurrentTheme();
      const result = themeEngine.setTheme('nonexistent');
      
      expect(result).toBe(false);
      expect(themeEngine.getCurrentTheme()).toBe(originalTheme);
    });
  });

  describe('getAvailableThemes', () => {
    it('should return list of available theme names', () => {
      const themes = themeEngine.getAvailableThemes();
      
      expect(themes).toContain('light');
      expect(themes).toContain('dark');
      expect(themes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('registerTheme', () => {
    it('should register a new theme', () => {
      const customTheme: Theme = {
        name: 'custom',
        colors: {
          user: '#ff0000',
          assistant: '#00ff00',
          system: '#0000ff',
          error: '#ff0000',
          success: '#00ff00',
          warning: '#ffff00',
          tool: '#ff00ff',
          prompt: '#ffffff'
        },
        symbols: {
          user: '>',
          assistant: '<',
          loading: ['|', '/', '-', '\\'],
          success: '+',
          error: 'x'
        }
      };

      themeEngine.registerTheme(customTheme);
      
      expect(themeEngine.getAvailableThemes()).toContain('custom');
      expect(themeEngine.hasTheme('custom')).toBe(true);
    });

    it('should allow switching to registered theme', () => {
      const customTheme: Theme = {
        name: 'custom',
        colors: {
          user: '#ff0000',
          assistant: '#00ff00',
          system: '#0000ff',
          error: '#ff0000',
          success: '#00ff00',
          warning: '#ffff00',
          tool: '#ff00ff',
          prompt: '#ffffff'
        },
        symbols: {
          user: '>',
          assistant: '<',
          loading: ['|', '/', '-', '\\'],
          success: '+',
          error: 'x'
        }
      };

      themeEngine.registerTheme(customTheme);
      const result = themeEngine.setTheme('custom');
      
      expect(result).toBe(true);
      expect(themeEngine.getCurrentTheme().name).toBe('custom');
    });
  });

  describe('hasTheme', () => {
    it('should return true for existing themes', () => {
      expect(themeEngine.hasTheme('light')).toBe(true);
      expect(themeEngine.hasTheme('dark')).toBe(true);
    });

    it('should return false for non-existent themes', () => {
      expect(themeEngine.hasTheme('nonexistent')).toBe(false);
    });
  });

  describe('getTheme', () => {
    it('should return theme object for existing theme', () => {
      const lightTheme = themeEngine.getTheme('light');
      
      expect(lightTheme).toBeDefined();
      expect(lightTheme?.name).toBe('light');
      expect(lightTheme?.colors).toBeDefined();
      expect(lightTheme?.symbols).toBeDefined();
    });

    it('should return undefined for non-existent theme', () => {
      const theme = themeEngine.getTheme('nonexistent');
      
      expect(theme).toBeUndefined();
    });
  });

  describe('default themes', () => {
    describe('light theme', () => {
      it('should have proper structure and colors', () => {
        const lightTheme = themeEngine.getTheme('light');
        
        expect(lightTheme).toBeDefined();
        expect(lightTheme?.name).toBe('light');
        
        // Check colors are defined
        expect(lightTheme?.colors.user).toBeDefined();
        expect(lightTheme?.colors.assistant).toBeDefined();
        expect(lightTheme?.colors.system).toBeDefined();
        expect(lightTheme?.colors.error).toBeDefined();
        expect(lightTheme?.colors.success).toBeDefined();
        expect(lightTheme?.colors.warning).toBeDefined();
        expect(lightTheme?.colors.tool).toBeDefined();
        expect(lightTheme?.colors.prompt).toBeDefined();
        
        // Check symbols are defined
        expect(lightTheme?.symbols.user).toBeDefined();
        expect(lightTheme?.symbols.assistant).toBeDefined();
        expect(lightTheme?.symbols.loading).toBeDefined();
        expect(lightTheme?.symbols.success).toBeDefined();
        expect(lightTheme?.symbols.error).toBeDefined();
        
        // Check loading animation has multiple frames
        expect(lightTheme?.symbols.loading.length).toBeGreaterThan(1);
      });

      it('should use appropriate colors for light theme', () => {
        const lightTheme = themeEngine.getTheme('light');
        
        // Colors should be darker for light backgrounds
        expect(lightTheme?.colors.user).toBe('#2563eb');
        expect(lightTheme?.colors.assistant).toBe('#059669');
        expect(lightTheme?.colors.error).toBe('#dc2626');
      });
    });

    describe('dark theme', () => {
      it('should have proper structure and colors', () => {
        const darkTheme = themeEngine.getTheme('dark');
        
        expect(darkTheme).toBeDefined();
        expect(darkTheme?.name).toBe('dark');
        
        // Check colors are defined
        expect(darkTheme?.colors.user).toBeDefined();
        expect(darkTheme?.colors.assistant).toBeDefined();
        expect(darkTheme?.colors.system).toBeDefined();
        expect(darkTheme?.colors.error).toBeDefined();
        expect(darkTheme?.colors.success).toBeDefined();
        expect(darkTheme?.colors.warning).toBeDefined();
        expect(darkTheme?.colors.tool).toBeDefined();
        expect(darkTheme?.colors.prompt).toBeDefined();
        
        // Check symbols are defined
        expect(darkTheme?.symbols.user).toBeDefined();
        expect(darkTheme?.symbols.assistant).toBeDefined();
        expect(darkTheme?.symbols.loading).toBeDefined();
        expect(darkTheme?.symbols.success).toBeDefined();
        expect(darkTheme?.symbols.error).toBeDefined();
        
        // Check loading animation has multiple frames
        expect(darkTheme?.symbols.loading.length).toBeGreaterThan(1);
      });

      it('should use appropriate colors for dark theme', () => {
        const darkTheme = themeEngine.getTheme('dark');
        
        // Colors should be lighter for dark backgrounds
        expect(darkTheme?.colors.user).toBe('#60a5fa');
        expect(darkTheme?.colors.assistant).toBe('#34d399');
        expect(darkTheme?.colors.error).toBe('#f87171');
      });
    });

    it('should have consistent symbols between themes', () => {
      const lightTheme = themeEngine.getTheme('light');
      const darkTheme = themeEngine.getTheme('dark');
      
      expect(lightTheme?.symbols.user).toBe(darkTheme?.symbols.user);
      expect(lightTheme?.symbols.assistant).toBe(darkTheme?.symbols.assistant);
      expect(lightTheme?.symbols.success).toBe(darkTheme?.symbols.success);
      expect(lightTheme?.symbols.error).toBe(darkTheme?.symbols.error);
      expect(lightTheme?.symbols.loading).toEqual(darkTheme?.symbols.loading);
    });
  });

  describe('theme switching workflow', () => {
    it('should support switching between themes multiple times', () => {
      // Start with light theme
      expect(themeEngine.getCurrentTheme().name).toBe('light');
      
      // Switch to dark
      themeEngine.setTheme('dark');
      expect(themeEngine.getCurrentTheme().name).toBe('dark');
      
      // Switch back to light
      themeEngine.setTheme('light');
      expect(themeEngine.getCurrentTheme().name).toBe('light');
    });

    it('should maintain theme state after registration', () => {
      const customTheme: Theme = {
        name: 'test',
        colors: {
          user: '#000000',
          assistant: '#111111',
          system: '#222222',
          error: '#333333',
          success: '#444444',
          warning: '#555555',
          tool: '#666666',
          prompt: '#777777'
        },
        symbols: {
          user: 'U',
          assistant: 'A',
          loading: ['1', '2', '3'],
          success: 'S',
          error: 'E'
        }
      };

      themeEngine.registerTheme(customTheme);
      themeEngine.setTheme('test');
      
      expect(themeEngine.getCurrentTheme().name).toBe('test');
      expect(themeEngine.getCurrentTheme().colors.user).toBe('#000000');
    });
  });
});