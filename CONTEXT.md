# Domain Model & Context

## Terms

### Scheduler
The orchestration interface that handles task deployment, execution status monitoring, log streaming, and cleanup operations on the host OS.
* **Systemd Scheduler**: The default Linux implementation utilizing native `systemctl` / `journalctl` and managing physical configuration unit files (`.timer`, `.service`) on disk.
* **Mock Scheduler**: A test double implementation that records state changes in-memory for fast unit testing.

### Task
A single scheduled job registered in the Stovetimer engine. Each task defines:
* A schedule expression (e.g., `'15 min'`, `'at 6:00am'`)
* Sandboxing settings (e.g., `protectSystem`, `privateTmp`)
* A run execution handler

### Stovetimer
The main entry point class that aggregates registered Tasks and handles routing CLI commands (deploy, clean, status, logs, run) to either the engine's internal runner or the active Scheduler.
