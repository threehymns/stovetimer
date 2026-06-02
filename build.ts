import { build } from "bun";

console.log("🚀 Building stovetimer...");

const result = await build({
  entrypoints: ["./src/index.ts", "./src/cli/global-bin.ts"],
  outdir: "./dist",
  target: "bun",
  minify: true,
  naming: {
    entry: "[name].js",
  },
});

if (!result.success) {
  console.error("❌ Build failed");
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

// Rename global-bin.js to bin.js to match our package.json expectation
const binFile = Bun.file("./dist/global-bin.js");
if (await binFile.exists()) {
  await Bun.write("./dist/bin.js", binFile);
  await Bun.spawn(["rm", "./dist/global-bin.js"]).exited;
}

console.log("✅ Build complete!");
