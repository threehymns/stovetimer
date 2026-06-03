# ADR 0001: Introduce Scheduler Seam

## Context
The stovetimer framework needs to deploy, teardown, check status, and capture logs of scheduled tasks. Initially, these operations were directly tied to systemd utilities (`systemctl`, `journalctl`) and direct file I/O operations inside CLI command routers. This tight coupling to Linux-specific details prevents running/testing the CLI in non-Linux environments, and makes it hard to support other schedulers (e.g. launchd, cron).

## Decision
We will introduce a `Scheduler` interface defining the core lifecycle operations of a task orchestrator:
* `deploy(tasks: Map<string, TimerOptions>): Promise<void>`
* `clean(): Promise<void>`
* `status(): Promise<TaskStatus[]>`
* `streamLogs(taskId: string): Promise<void>`

A concrete `SystemdScheduler` will implement this interface to perform real OS operations on Linux.
In-memory and unit tests will use a `MockScheduler` adapter.

## Consequences
* Callers (e.g. CLI router) are decoupled from OS process execution and file system unit placement.
* CLI commands become fully testable via mock injection.
* Support for macOS (`launchd`) or cron can be added by implementing new adapters.
