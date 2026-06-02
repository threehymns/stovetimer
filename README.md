# 🍲 stovetimer

`stovetimer` is a fast, lightweight TypeScript framework that lets you write, sandbox, and manage native Linux **systemd timers** using friendly, human-readable language like `15min`, `every Friday at 5pm`, or `May 5th`. 

Powered by **Bun**, it bypasses heavy dependency trees, runs natively without transpilation steps, and introduces a global command-line helper to monitor your tasks from anywhere on your system.

---

## 🤔 Why stovetimer?

Traditional background schedulers like `cron` are fragile—if your laptop or homelab machine is asleep when a job is scheduled, it gets missed entirely. Plus, tracking down error logs across scattered system files is a headache.

`stovetimer` offloads scheduling to **systemd** (the reliable core of Linux), giving you enterprise-grade infrastructure out of the box:
* **Zero-Dependency Natural Language:** Write schedules in plain English without bloating your `node_modules` with massive calendar parsing libraries.
* **Missed Job Recovery:** Automatically runs missed tasks immediately if your machine was powered down or sleeping.
* **Built-in Security Sandboxing:** Easily lock down tasks so they can't touch sensitive system folders or device layers.
* **Centralized Logging:** Pipes all output straight into Linux `journald` for seamless log tracking.
* **Zero-Daemon Overhead:** Your script handles its business and exits instantly. No background node/bun processes hogging system memory.

---

## 🚀 Installation

`stovetimer` can be used as a project dependency or installed globally as a standalone system utility.

### As a Project Library
Add it directly to your existing TypeScript/Bun workspace:
```bash
bun add stovetimer

```

### As a Global CLI Tool

To monitor and manage your deployed timers globally from anywhere on your machine:

```bash
bun i -g stovetimer

```

---

## 💻 How to Use It

Create an entry script for your automated tasks (e.g., `tasks.ts`):

```ts
import { Stovetimer } from 'stovetimer';

const app = new Stovetimer({
  name: 'my-system-chores',
  scope: 'user' // Installs to ~/.config/systemd/user/ (No root/sudo privileges required!)
});

// Example 1: Run a task every 15 minutes using an interval shorthand
app.timer('db-vacuum', {
  every: '15 min',
  persistent: true, // Recovers and runs if the system was offline
  service: {
    description: 'Clean up local application cache databases',
    protectSystem: 'strict', // Keeps your root directory read-only to this task
    privateTmp: true,        // Isolates the task's temporary directory
    run: async () => {
      console.log("Starting database sweep...");
      // Your TypeScript / Bun logic goes here!
    }
  }
});

// Example 2: Run a task on specific days of the week
app.timer('weekly-backup', {
  every: 'every Friday at 5pm',
  service: {
    description: 'Archive project directories before the weekend',
    run: () => {
      console.log("Compressing files...");
    }
  }
});

// Example 3: Run a task daily using absolute clock times
app.timer('morning-sync', {
  every: 'at 6:00am', // Also supports 'midnight', 'noon', etc.
  service: {
    description: 'Fetch remote system updates',
    run: () => {
      console.log("Synchronizing data profiles...");
    }
  }
});

app.start();

```

---

## 🛠️ CLI Commands

`stovetimer` operates in two modes: **Project Mode** (inside your script to build/alter configurations) and **Global Mode** (anywhere in your terminal to monitor and inspect logs).

### 1. Project Management Commands

Run these flags directly on your task definition script to register or alter system infrastructure:

* **Deploy & Activate**
Compiles your shorthands, builds the physical systemd files, and schedules them.

```bash
bun tasks.ts deploy

```

* **Force Execution**
Forces the specific task execution logic to run out-of-band instantly for debugging.

```bash
bun tasks.ts run morning-sync

```

* **Teardown & Clean**
Stops the timer loops, disables the units, and deletes the physical files cleanly.

```bash
bun tasks.ts clean

```

### 2. Global System Commands

Once your apps are deployed, you can close your project folders entirely. Install `stovetimer` globally to monitor your tasks from any working directory on your system:

* **Check System Health Dashboard**
Queries active configurations, checks active states, and tracks down real-time countdown variables.

```bash
stovetimer status

```

* **Stream Live Logs**
Streams target system journal messages directly into the console pipe without filtering messy syslog blocks.

```bash
stovetimer logs morning-sync

```

---

## 🧪 Running Internal Tests

If you are contributing to the codebase or testing custom natural language regex string rules, execute the structural unit tests via Bun:

```bash
bun test

```
