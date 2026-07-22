import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const compiled = resolve(root, ".build");
const cleanOnly = process.argv.includes("--clean");
const makeZip = process.argv.includes("--zip");
const version = "0.7.2";
const localTsc = resolve(root, "node_modules", "typescript", "bin", "tsc");

async function runTypeScript(args) {
  try {
    await access(localTsc);
    execFileSync(process.execPath, [localTsc, ...args], { cwd: root, stdio: "inherit" });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    try {
      execFileSync(process.platform === "win32" ? "tsc.cmd" : "tsc", args, { cwd: root, stdio: "inherit" });
    } catch (fallbackError) {
      if (fallbackError?.code === "ENOENT") {
        throw new Error("TypeScript não encontrado. Execute npm install antes de rodar o build.");
      }
      throw fallbackError;
    }
  }
}

await Promise.all([
  rm(dist, { recursive: true, force: true }),
  rm(compiled, { recursive: true, force: true }),
]);
if (cleanOnly) process.exit(0);

await runTypeScript(["--noEmit", "-p", resolve(root, "tsconfig.json")]);
await runTypeScript(["-p", resolve(root, "tsconfig.build.json")]);

function moduleId(filePath) {
  return relative(compiled, filePath).split(sep).join("/");
}

async function resolveDependency(fromFile, request) {
  if (!request.startsWith(".")) throw new Error(`Dependência externa não suportada no bundle: ${request}`);
  const base = resolve(dirname(fromFile), request);
  const candidates = [base, `${base}.js`, resolve(base, "index.js")];
  for (const candidate of candidates) {
    try {
      await readFile(candidate);
      return candidate;
    } catch {
      // tenta o próximo candidato
    }
  }
  throw new Error(`Não foi possível resolver ${request} a partir de ${fromFile}`);
}

async function collectModules(entryFile) {
  const modules = new Map();

  async function visit(filePath) {
    const id = moduleId(filePath);
    if (modules.has(id)) return;
    let code = await readFile(filePath, "utf8");
    const requests = [...code.matchAll(/require\(["']([^"']+)["']\)/g)].map((match) => match[1]);
    for (const request of requests) {
      const dependency = await resolveDependency(filePath, request);
      await visit(dependency);
      const dependencyId = moduleId(dependency);
      const escaped = request.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      code = code.replace(new RegExp(`require\\(["']${escaped}["']\\)`, "g"), `__require(${JSON.stringify(dependencyId)})`);
    }
    modules.set(id, code);
  }

  await visit(entryFile);
  return modules;
}

async function bundle(entry, outfile) {
  const entryFile = resolve(compiled, entry);
  const modules = await collectModules(entryFile);
  const registry = [...modules.entries()].map(([id, code]) => (
    `${JSON.stringify(id)}: function(module, exports, __require) {\n${code}\n}`
  )).join(",\n");
  const output = `(() => {\n"use strict";\nconst __modules = {\n${registry}\n};\nconst __cache = Object.create(null);\nfunction __require(id) {\n  if (__cache[id]) return __cache[id].exports;\n  const factory = __modules[id];\n  if (!factory) throw new Error("Módulo não encontrado: " + id);\n  const module = { exports: {} };\n  __cache[id] = module;\n  factory(module, module.exports, __require);\n  return module.exports;\n}\n__require(${JSON.stringify(entry)});\n})();\n`;
  const target = resolve(dist, outfile);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, output);
}

await Promise.all([
  bundle("popup/index.js", "src/popup/popup.js"),
  bundle("background/index.js", "src/runtime/background.js"),
  bundle("content/index.js", "src/runtime/content.js"),
  bundle("offscreen/index.js", "src/audio/offscreen.js"),
]);

const copies = [
  ["manifest.json", "manifest.json"],
  ["LICENSE", "LICENSE"],
  ["README.md", "README.md"],
  ["ARCHITECTURE.md", "ARCHITECTURE.md"],
  ["THIRD_PARTY_LICENSES.md", "THIRD_PARTY_LICENSES.md"],
  ["assets", "assets"],
  ["src/audio", "src/audio"],
  ["src/popup/index.html", "src/popup/index.html"],
  ["src/popup/styles", "src/popup/styles"],
  ["src/popup/vendor", "src/popup/vendor"],
];
for (const [source, target] of copies) {
  await mkdir(dirname(resolve(dist, target)), { recursive: true });
  await cp(resolve(root, source), resolve(dist, target), { recursive: true });
}

const manifestPath = resolve(dist, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.version = version;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await rm(compiled, { recursive: true, force: true });

if (makeZip) {
  const output = resolve(root, `sonora-react-typescript-v${version}.zip`);
  await rm(output, { force: true });
  execFileSync("zip", ["-qr", output, "."], { cwd: dist, stdio: "inherit" });
  console.log(output);
}
