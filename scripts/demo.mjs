import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cp, mkdtemp } from "node:fs/promises";
import os from "node:os";
// Copied to a temporary directory so exploring the demo never dirties the repo.
const source = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../skills/object-map/demo",
);
const root = await mkdtemp(path.join(os.tmpdir(), "object-map-demo-"));
await cp(source, root, { recursive: true });
const port = process.argv.find((a) => a.startsWith("--port="))?.slice(7) || "5174";
console.log(`Demo product at http://127.0.0.1:${port} — sandbox copy at ${root}`);
spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", port],
  { env: { ...process.env, OBJECT_MAP_REPO: root }, stdio: "inherit" },
);
