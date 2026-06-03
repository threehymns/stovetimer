import type { TimerOptions } from "../core/engine";

export function generateServiceINI(
	id: string,
	options: TimerOptions,
	_appName: string,
): string {
	const scriptPath = Bun.argv[1];
	const bunPath = Bun.env._ || "bun";
	const protectSystem = options.service.protectSystem ?? "false";
	const privateTmp = options.service.privateTmp ? "true" : "false";

	return `[Unit]
Description=${options.service.description}
After=network.target

[Service]
Type=oneshot
ExecStart=${bunPath} ${scriptPath} run ${id}
WorkingDirectory=${process.cwd()}
StandardOutput=journal
StandardError=journal
ProtectSystem=${protectSystem}
PrivateTmp=${privateTmp}
`;
}
