import { describe, expect, test } from "bun:test";
import { handleGlobalCLI } from "../src/cli/global-router";

describe("Global CLI Router", () => {
	test("should display global help on --help even if no apps are deployed", async () => {
		const logged: string[] = [];
		let exitedWith = -1;

		const mockReaddir = async () => []; // No files deployed

		await handleGlobalCLI({
			args: ["--help"],
			userConfigPath: "/mock/path",
			readdir: mockReaddir,
			log: (msg: string) => logged.push(msg),
			logError: (msg: string) => logged.push(msg),
			exit: (code: number) => {
				exitedWith = code;
			},
		});

		expect(exitedWith).toBe(0);
		const combinedLogs = logged.join("\n");
		expect(combinedLogs).toContain("stovetimer Global Bin");
		expect(combinedLogs).toContain("stovetimer status");
	});

	test("should display global help on -h even if no apps are deployed", async () => {
		const logged: string[] = [];
		let exitedWith = -1;

		const mockReaddir = async () => []; // No files deployed

		await handleGlobalCLI({
			args: ["-h"],
			userConfigPath: "/mock/path",
			readdir: mockReaddir,
			log: (msg: string) => logged.push(msg),
			logError: (msg: string) => logged.push(msg),
			exit: (code: number) => {
				exitedWith = code;
			},
		});

		expect(exitedWith).toBe(0);
		const combinedLogs = logged.join("\n");
		expect(combinedLogs).toContain("stovetimer Global Bin");
	});

	test("should scaffold tasks.ts on init command if it does not exist", async () => {
		const logged: string[] = [];
		let exitedWith = -1;
		let writtenFile = { path: "", content: "" };
		let fileWasWritten = false;

		await handleGlobalCLI({
			args: ["init", "my-cool-app"],
			userConfigPath: "/mock/path",
			readdir: async () => [],
			writeFile: async (path: string, content: string) => {
				writtenFile = { path, content };
				fileWasWritten = true;
			},
			exists: async () => false,
			cwd: () => "/mock/cwd/my-dir",
			mockChoice: 0,
			log: (msg: string) => logged.push(msg),
			logError: (msg: string) => logged.push(msg),
			exit: (code: number) => {
				exitedWith = code;
			},
		});

		expect(exitedWith).toBe(0);
		expect(fileWasWritten).toBe(true);
		expect(writtenFile.path).toContain("tasks.ts");
		expect(writtenFile.content).toContain("Stovetimer");
		expect(writtenFile.content).toContain("my-cool-app");
		expect(writtenFile.content).toContain("ping"); // Minimal task
		expect(logged.join("\n")).toContain(
			"Created tasks.ts starter project successfully",
		);
	});

	test("should scaffold other templates based on selection choice", async () => {
		let writtenFile = { path: "", content: "" };

		// Choice 1: Backup DB
		await handleGlobalCLI({
			args: ["init", "backup-app"],
			userConfigPath: "/mock/path",
			readdir: async () => [],
			writeFile: async (path: string, content: string) => {
				writtenFile = { path, content };
			},
			exists: async () => false,
			cwd: () => "/mock/cwd/my-dir",
			mockChoice: 1,
			log: () => {},
			logError: () => {},
			exit: () => {},
		});
		expect(writtenFile.content).toContain("backup-db");

		// Choice 2: Web Scraper
		await handleGlobalCLI({
			args: ["init", "scraper-app"],
			userConfigPath: "/mock/path",
			readdir: async () => [],
			writeFile: async (path: string, content: string) => {
				writtenFile = { path, content };
			},
			exists: async () => false,
			cwd: () => "/mock/cwd/my-dir",
			mockChoice: 2,
			log: () => {},
			logError: () => {},
			exit: () => {},
		});
		expect(writtenFile.content).toContain("sync-api");
	});

	test("should use directory name if app name is not provided to init", async () => {
		let writtenFile = { path: "", content: "" };

		await handleGlobalCLI({
			args: ["init"],
			userConfigPath: "/mock/path",
			readdir: async () => [],
			writeFile: async (path: string, content: string) => {
				writtenFile = { path, content };
			},
			exists: async () => false,
			cwd: () => "/mock/cwd/project-x",
			mockChoice: 0,
			log: () => {},
			logError: () => {},
			exit: () => {},
		});

		expect(writtenFile.content).toContain("project-x");
	});

	test("should fail to scaffold if tasks.ts already exists and --force is not specified", async () => {
		const logged: string[] = [];
		let exitedWith = -1;
		let writtenFile = false;

		await handleGlobalCLI({
			args: ["init"],
			userConfigPath: "/mock/path",
			readdir: async () => [],
			writeFile: async () => {
				writtenFile = true;
			},
			exists: async () => true,
			cwd: () => "/mock/cwd",
			mockChoice: 0,
			log: (msg: string) => logged.push(msg),
			logError: (msg: string) => logged.push(msg),
			exit: (code: number) => {
				exitedWith = code;
			},
		});

		expect(exitedWith).toBe(1);
		expect(writtenFile).toBe(false);
		expect(logged.join("\n")).toContain("already exists");
	});

	test("should scaffold and overwrite if tasks.ts already exists but --force is specified", async () => {
		const logged: string[] = [];
		let exitedWith = -1;
		let writtenFile = false;

		await handleGlobalCLI({
			args: ["init", "--force"],
			userConfigPath: "/mock/path",
			readdir: async () => [],
			writeFile: async () => {
				writtenFile = true;
			},
			exists: async () => true,
			cwd: () => "/mock/cwd",
			mockChoice: 0,
			log: (msg: string) => logged.push(msg),
			logError: (msg: string) => logged.push(msg),
			exit: (code: number) => {
				exitedWith = code;
			},
		});

		expect(exitedWith).toBe(0);
		expect(writtenFile).toBe(true);
	});

	test("should make tasks.ts executable and call chmod", async () => {
		let chmodPath = "";
		let chmodMode: number | string = 0;

		await handleGlobalCLI({
			args: ["init"],
			userConfigPath: "/mock/path",
			readdir: async () => [],
			writeFile: async () => {},
			exists: async () => false,
			cwd: () => "/mock/cwd",
			mockChoice: 0,
			chmod: async (path: string, mode: number | string) => {
				chmodPath = path;
				chmodMode = mode;
			},
			log: () => {},
			logError: () => {},
			exit: () => {},
		});

		expect(chmodPath).toBe("/mock/cwd/tasks.ts");
		expect(chmodMode).toBe(0o755);
	});
});
