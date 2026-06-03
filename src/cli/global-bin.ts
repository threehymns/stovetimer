#!/usr/bin/env bun
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { handleGlobalCLI } from "./global-router";

async function main() {
	const args = process.argv.slice(2);
	const userConfigPath = join(Bun.env.HOME || "", ".config/systemd/user");

	await handleGlobalCLI({
		args,
		userConfigPath,
		readdir,
		log: console.log,
		logError: console.error,
		exit: process.exit,
	});
}

main();
