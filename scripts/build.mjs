import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const cleanOnly = process.argv.includes("--clean");
const makeZip = process.argv.includes("--zip");

await rm(dist, { recursive: true, force: true });
if (cleanOnly) process.exit(0);

await mkdir(resolve(dist, "src/popup"), { recursive: true });
const tsc = process.platform === "win32" ? "tsc.cmd" : "tsc";
execFileSync(tsc, ["-p", resolve(root, "tsconfig.json")], { cwd: root, stdio: "inherit" });

const copies = [
  ["manifest.json", "manifest.json"],
  ["LICENSE", "LICENSE"],
  ["README.md", "README.md"],
  ["THIRD_PARTY_LICENSES.md", "THIRD_PARTY_LICENSES.md"],
  ["assets", "assets"],
  ["src/audio", "src/audio"],
  ["src/runtime", "src/runtime"],
  ["src/shared", "src/shared"],
  ["src/popup/index.html", "src/popup/index.html"],
  ["src/popup/styles.css", "src/popup/styles.css"],
  ["src/popup/vendor", "src/popup/vendor"],
];
for (const [source, target] of copies) {
  await mkdir(dirname(resolve(dist, target)), { recursive: true });
  await cp(resolve(root, source), resolve(dist, target), { recursive: true });
}

const manifestPath = resolve(dist, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.version = "0.6.0";
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

if (makeZip) {
  const output = resolve(root, "sonora-react-typescript-v0.6.zip");
  await rm(output, { force: true });
  execFileSync("zip", ["-qr", output, "."], { cwd: dist, stdio: "inherit" });
  console.log(output);
}
