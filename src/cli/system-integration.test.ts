import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('System Integration Tests', () => {
  let tempDir: string;
  let testEnvFile: string;

  beforeAll(() => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'system-test-'));
    testEnvFile = path.join(tempDir, '.env');
    
    // Create test environment file
    fs.writeFileSync(testEnvFile, 'ANTHROPIC_API_KEY=test-key-for-integration-tests\n');
  });

  afterAll(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('CLI Application Startup', () => {
    it('should start application with help flag', (done) => {
      const child = spawn('node', ['dist/index.js', '--help'], {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        expect(code).toBe(0);
        expect(output).toContain('Interactive AI-powered coding assistant');
        expect(output).toContain('Options:');
        expect(output).toContain('--theme');
        expect(output).toContain('--history-size');
        done();
      });

      // Set timeout for test
      setTimeout(() => {
        child.kill();
        done();
      }, 5000);
    });

    it('should start application with version flag', (done) => {
      const child = spawn('node', ['dist/index.js', '--version'], {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        expect(code).toBe(0);
        expect(output).toContain('1.0.0');
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 5000);
    });

    it('should handle missing API key gracefully', (done) => {
      const child = spawn('node', ['dist/index.js'], {
        cwd: process.cwd(),
        env: { ...process.env, ANTHROPIC_API_KEY: '', NODE_ENV: 'test' }
      });

      let output = '';
      child.stderr.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        expect(code).toBe(1);
        expect(output).toContain('ANTHROPIC_API_KEY environment variable is required');
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 5000);
    });

    it('should start with basic CLI mode', (done) => {
      const child = spawn('node', ['dist/index.js', '--basic', '--no-welcome'], {
        cwd: process.cwd(),
        env: { ...process.env, ANTHROPIC_API_KEY: 'test-key', NODE_ENV: 'test' }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Send exit command after a short delay
      setTimeout(() => {
        child.stdin.write('exit\n');
      }, 1000);

      child.on('close', (code) => {
        expect(output).toContain('Starting in basic CLI mode');
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 5000);
    });
  });

  describe('Configuration Integration', () => {
    it('should apply theme configuration', (done) => {
      const child = spawn('node', ['dist/index.js', '--theme', 'dark', '--no-welcome'], {
        cwd: process.cwd(),
        env: { ...process.env, ANTHROPIC_API_KEY: 'test-key', NODE_ENV: 'test' }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      setTimeout(() => {
        child.stdin.write('exit\n');
      }, 1000);

      child.on('close', (code) => {
        // Should start without errors with dark theme
        expect(code).not.toBe(1);
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 5000);
    });

    it('should apply history size configuration', (done) => {
      const child = spawn('node', ['dist/index.js', '--history-size', '50', '--no-welcome'], {
        cwd: process.cwd(),
        env: { ...process.env, ANTHROPIC_API_KEY: 'test-key', NODE_ENV: 'test' }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      setTimeout(() => {
        child.stdin.write('exit\n');
      }, 1000);

      child.on('close', (code) => {
        // Should start without errors with custom history size
        expect(code).not.toBe(1);
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 5000);
    });

    it('should handle environment variable configuration', (done) => {
      const child = spawn('node', ['dist/index.js', '--no-welcome'], {
        cwd: process.cwd(),
        env: { 
          ...process.env, 
          ANTHROPIC_API_KEY: 'test-key',
          CLI_THEME: 'dark',
          CLI_HISTORY_SIZE: '200',
          NODE_ENV: 'test'
        }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      setTimeout(() => {
        child.stdin.write('exit\n');
      }, 1000);

      child.on('close', (code) => {
        // Should start without errors with environment configuration
        expect(code).not.toBe(1);
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 5000);
    });
  });

  describe('Interactive Features Integration', () => {
    it('should handle special commands in interactive mode', (done) => {
      const child = spawn('node', ['dist/index.js', '--no-welcome'], {
        cwd: process.cwd(),
        env: { ...process.env, ANTHROPIC_API_KEY: 'test-key', NODE_ENV: 'test' }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Test special commands
      setTimeout(() => {
        child.stdin.write('/help\n');
      }, 500);

      setTimeout(() => {
        child.stdin.write('/tools\n');
      }, 1000);

      setTimeout(() => {
        child.stdin.write('/config\n');
      }, 1500);

      setTimeout(() => {
        child.stdin.write('exit\n');
      }, 2000);

      child.on('close', (code) => {
        expect(output).toContain('Available commands:');
        expect(output).toContain('Available tools:');
        expect(output).toContain('Configuration:');
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 10000);
    });

    it('should handle conversation flow', (done) => {
      const child = spawn('node', ['dist/index.js', '--no-welcome'], {
        cwd: process.cwd(),
        env: { ...process.env, ANTHROPIC_API_KEY: 'test-key', NODE_ENV: 'test' }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Test conversation flow
      setTimeout(() => {
        child.stdin.write('Hello Claude\n');
      }, 500);

      setTimeout(() => {
        child.stdin.write('Can you help me?\n');
      }, 2000);

      setTimeout(() => {
        child.stdin.write('exit\n');
      }, 4000);

      child.on('close', (code) => {
        // Should handle conversation without critical errors
        expect(code).not.toBe(1);
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 10000);
    });

    it('should handle file operations through tools', (done) => {
      // Create a test file for tool operations
      const testFile = path.join(tempDir, 'test-file.txt');
      fs.writeFileSync(testFile, 'Test content for file operations');

      const child = spawn('node', ['dist/index.js', '--no-welcome'], {
        cwd: tempDir,
        env: { ...process.env, ANTHROPIC_API_KEY: 'test-key', NODE_ENV: 'test' }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Test file operations
      setTimeout(() => {
        child.stdin.write('Can you read the test-file.txt?\n');
      }, 500);

      setTimeout(() => {
        child.stdin.write('List the files in this directory\n');
      }, 2000);

      setTimeout(() => {
        child.stdin.write('exit\n');
      }, 4000);

      child.on('close', (code) => {
        // Should handle file operations without critical errors
        expect(code).not.toBe(1);
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 10000);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid commands gracefully', (done) => {
      const child = spawn('node', ['dist/index.js', '--no-welcome'], {
        cwd: process.cwd(),
        env: { ...process.env, ANTHROPIC_API_KEY: 'test-key', NODE_ENV: 'test' }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      let errorOutput = '';
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      // Test invalid commands
      setTimeout(() => {
        child.stdin.write('/invalid-command\n');
      }, 500);

      setTimeout(() => {
        child.stdin.write('/nonexistent\n');
      }, 1000);

      setTimeout(() => {
        child.stdin.write('exit\n');
      }, 1500);

      child.on('close', (code) => {
        // Should handle invalid commands without crashing
        expect(code).not.toBe(1);
        expect(output).toContain('Unknown command');
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 5000);
    });

    it('should handle network errors gracefully', (done) => {
      const child = spawn('node', ['dist/index.js', '--no-welcome'], {
        cwd: process.cwd(),
        env: { 
          ...process.env, 
          ANTHROPIC_API_KEY: 'invalid-key-for-testing',
          NODE_ENV: 'test'
        }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      let errorOutput = '';
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      // Test with invalid API key
      setTimeout(() => {
        child.stdin.write('Hello Claude\n');
      }, 500);

      setTimeout(() => {
        child.stdin.write('exit\n');
      }, 3000);

      child.on('close', (code) => {
        // Should handle network errors gracefully
        expect(errorOutput).toContain('API error');
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 8000);
    });

    it('should handle file system errors gracefully', (done) => {
      const child = spawn('node', ['dist/index.js', '--no-welcome'], {
        cwd: process.cwd(),
        env: { ...process.env, ANTHROPIC_API_KEY: 'test-key', NODE_ENV: 'test' }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Test file system errors
      setTimeout(() => {
        child.stdin.write('Can you read a file that does not exist?\n');
      }, 500);

      setTimeout(() => {
        child.stdin.write('List files in /nonexistent/directory\n');
      }, 2000);

      setTimeout(() => {
        child.stdin.write('exit\n');
      }, 3500);

      child.on('close', (code) => {
        // Should handle file system errors without crashing
        expect(code).not.toBe(1);
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 8000);
    });
  });

  describe('Performance Integration', () => {
    it('should handle rapid input without blocking', (done) => {
      const child = spawn('node', ['dist/index.js', '--no-welcome'], {
        cwd: process.cwd(),
        env: { ...process.env, ANTHROPIC_API_KEY: 'test-key', NODE_ENV: 'test' }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Send rapid input
      const rapidInputs = [
        '/help',
        '/tools',
        '/config',
        '/history',
        '/clear'
      ];

      rapidInputs.forEach((input, index) => {
        setTimeout(() => {
          child.stdin.write(input + '\n');
        }, index * 100);
      });

      setTimeout(() => {
        child.stdin.write('exit\n');
      }, 1000);

      child.on('close', (code) => {
        // Should handle rapid input without errors
        expect(code).not.toBe(1);
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 5000);
    });

    it('should handle long running operations', (done) => {
      const child = spawn('node', ['dist/index.js', '--no-welcome'], {
        cwd: process.cwd(),
        env: { ...process.env, ANTHROPIC_API_KEY: 'test-key', NODE_ENV: 'test' }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Test long running operation
      setTimeout(() => {
        child.stdin.write('Please write a very long response about programming\n');
      }, 500);

      // Wait for processing
      setTimeout(() => {
        child.stdin.write('exit\n');
      }, 8000);

      child.on('close', (code) => {
        // Should handle long operations without timeout
        expect(code).not.toBe(1);
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 15000);
    });
  });

  describe('Cross-Platform Integration', () => {
    it('should work on current platform', (done) => {
      const child = spawn('node', ['dist/index.js', '--version'], {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        expect(code).toBe(0);
        expect(output).toContain('1.0.0');
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 3000);
    });

    it('should handle different terminal sizes', (done) => {
      const child = spawn('node', ['dist/index.js', '--no-welcome'], {
        cwd: process.cwd(),
        env: { 
          ...process.env, 
          ANTHROPIC_API_KEY: 'test-key',
          COLUMNS: '80',
          LINES: '24',
          NODE_ENV: 'test'
        }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      setTimeout(() => {
        child.stdin.write('/help\n');
      }, 500);

      setTimeout(() => {
        child.stdin.write('exit\n');
      }, 1500);

      child.on('close', (code) => {
        // Should adapt to terminal size
        expect(code).not.toBe(1);
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 5000);
    });

    it('should handle different locale settings', (done) => {
      const child = spawn('node', ['dist/index.js', '--no-welcome'], {
        cwd: process.cwd(),
        env: { 
          ...process.env, 
          ANTHROPIC_API_KEY: 'test-key',
          LANG: 'en_US.UTF-8',
          LC_ALL: 'en_US.UTF-8',
          NODE_ENV: 'test'
        }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      setTimeout(() => {
        child.stdin.write('Hello with UTF-8 characters: éñ中文\n');
      }, 500);

      setTimeout(() => {
        child.stdin.write('exit\n');
      }, 2000);

      child.on('close', (code) => {
        // Should handle UTF-8 characters
        expect(code).not.toBe(1);
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 5000);
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should cleanup resources on exit', (done) => {
      const child = spawn('node', ['dist/index.js', '--no-welcome'], {
        cwd: process.cwd(),
        env: { ...process.env, ANTHROPIC_API_KEY: 'test-key', NODE_ENV: 'test' }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Test graceful exit
      setTimeout(() => {
        child.stdin.write('exit\n');
      }, 500);

      child.on('close', (code) => {
        // Should exit cleanly
        expect(code).toBe(0);
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 3000);
    });

    it('should handle SIGINT gracefully', (done) => {
      const child = spawn('node', ['dist/index.js', '--no-welcome'], {
        cwd: process.cwd(),
        env: { ...process.env, ANTHROPIC_API_KEY: 'test-key', NODE_ENV: 'test' }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Send SIGINT after startup
      setTimeout(() => {
        child.kill('SIGINT');
      }, 1000);

      child.on('close', (code, signal) => {
        // Should handle SIGINT gracefully
        expect(signal).toBe('SIGINT');
        done();
      });

      setTimeout(() => {
        child.kill('SIGKILL');
        done();
      }, 5000);
    });

    it('should handle SIGTERM gracefully', (done) => {
      const child = spawn('node', ['dist/index.js', '--no-welcome'], {
        cwd: process.cwd(),
        env: { ...process.env, ANTHROPIC_API_KEY: 'test-key', NODE_ENV: 'test' }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Send SIGTERM after startup
      setTimeout(() => {
        child.kill('SIGTERM');
      }, 1000);

      child.on('close', (code, signal) => {
        // Should handle SIGTERM gracefully
        expect(signal).toBe('SIGTERM');
        done();
      });

      setTimeout(() => {
        child.kill('SIGKILL');
        done();
      }, 5000);
    });
  });
});
