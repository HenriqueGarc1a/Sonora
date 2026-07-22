import { access } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localTsc = resolve(root, "node_modules", "typescript", "bin", "tsc");

try {
  await access(localTsc);
  execFileSync(process.execPath, [localTsc, "--noEmit", "-p", resolve(root, "tsconfig.json")], {
    cwd: root,
    stdio: "inherit",
  });
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  try {
    execFileSync(process.platform === "win32" ? "tsc.cmd" : "tsc", ["--noEmit", "-p", resolve(root, "tsconfig.json")], {
      cwd: root,
      stdio: "inherit",
    });
  } catch (fallbackError) {
    if (fallbackError?.code === "ENOENT") {
      throw new Error("TypeScript não encontrado. Execute npm install antes de rodar o typecheck.");
    }
    throw fallbackError;
  }
}
