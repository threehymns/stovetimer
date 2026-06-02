import { handleCLI } from '../cli/router';

export interface TimerOptions {
  every: string | string[];
  persistent?: boolean;
  randomizedDelaySec?: string;
  service: {
    description: string;
    protectSystem?: 'strict' | 'full' | 'false';
    privateTmp?: boolean;
    run: () => Promise<void> | void;
  };
}

interface StovetimerConfig {
  name: string;
  scope?: 'user' | 'system';
}

export class Stovetimer {
  private timers = new Map<string, TimerOptions>();
  private name: string;
  private scope: 'user' | 'system';

  constructor(config: StovetimerConfig) {
    this.name = config.name;
    this.scope = config.scope ?? 'user';
  }

  timer(id: string, options: TimerOptions) {
    this.timers.set(id, options);
  }

  async start() {
    await handleCLI(this, this.name, this.scope, this.timers);
  }

  async executeTask(id: string) {
    const task = this.timers.get(id);
    if (!task) {
      console.error(`❌ Task "${id}" not found registered in engine.`);
      process.exit(1);
    }

    try {
      await task.service.run();
    } catch (err) {
      console.error(`❌ Task [${id}] crashed during runtime execution:`, err);
      process.exit(1);
    }
  }
}
