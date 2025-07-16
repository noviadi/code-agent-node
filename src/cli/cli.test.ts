import { InteractiveCLIManager, InteractiveCLIConfig } from './index';
import { Agent } from '../agent';

describe('CLI Infrastructure', () => {
  it('should be able to create InteractiveCLIManager with default config', () => {
    const mockAgent = {} as Agent;
    const config: InteractiveCLIConfig = {
      theme: 'default',
      historySize: 100,
      autoSave: true,
      progressIndicators: true,
      multiLineEditor: true
    };

    const cliManager = new InteractiveCLIManager(mockAgent, config);
    expect(cliManager).toBeDefined();
    expect(cliManager.isActive()).toBe(false);
  });

  it('should export all required types and classes', () => {
    expect(InteractiveCLIManager).toBeDefined();
  });
});