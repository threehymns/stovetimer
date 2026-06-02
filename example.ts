// In a production app, this would be: import { Stovetimer } from 'stovetimer';
import { Stovetimer } from './src/index';

const app = new Stovetimer({
  name: 'homelab-tasks',
  scope: 'user' // Installs cleanly to ~/.config/systemd/user/
});

// Using the clean shorthand strings we built
app.timer('garbage-collection', {
  every: '4h',
  persistent: true,
  service: {
    description: 'Run automatic file system garbage collection logs',
    protectSystem: 'strict',
    run: () => {
      console.log(`[${new Date().toLocaleTimeString()}] Vacuuming stale temporary metrics...`);
    }
  }
});

app.timer('morning-sync', {
  every: 'at 6:00am',
  service: {
    description: 'Fetch remote configurations on wakeup',
    run: async () => {
      console.log('Syncing infrastructure profiles...');
    }
  }
});

app.start();
