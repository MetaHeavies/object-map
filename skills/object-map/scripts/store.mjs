import { readFile, writeFile, rename, mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { validateMap, validateLayout } from "./model.mjs";
import {recordEvent, mapCounts} from './feedback.mjs';
const revision = (text) =>
  createHash("sha256").update(text).digest("hex").slice(0, 16);
export class Store {
  constructor(root) {
    this.root = root;
    this.directory = path.join(root, ".object-map");
    this.queue = Promise.resolve();
  }
  async read(kind) {
    const text = await readFile(
      path.join(this.directory, `${kind}.json`),
      "utf8",
    );
    return { data: JSON.parse(text), revision: revision(text) };
  }
  async write(kind, data, expected) {
    const started=performance.now();
    const operation = this.queue
      .catch(() => {})
      .then(async () => {
        if (!["map", "layout"].includes(kind))
          throw new Error("Unknown document.");
        (kind === "map" ? validateMap : validateLayout)(data);
        const lockPath = path.join(this.directory, `${kind}.lock`);
        let lock;
        for (let attempt = 0; attempt < 80; attempt++) {
          try { lock = await open(lockPath, 'wx'); break; }
          catch (error) {
            if (error.code !== 'EEXIST') throw error;
            await new Promise(resolve => setTimeout(resolve, 25));
          }
        }
        if (!lock) throw new Error(`Object Map is busy (${kind}.lock). Retry after the other writer finishes; inspect an abandoned lock before removing it.`);
        const temporary = path.join(this.directory, `${kind}.${randomUUID()}.tmp`);
        try {
        await lock.writeFile(JSON.stringify({pid:process.pid, at:new Date().toISOString()}));
        const existing = await this.read(kind);
        if (expected !== existing.revision) {
          const e = new Error(
            "This file changed in another session. Reload to review the latest version before saving.",
          );
          e.status = 409;
          throw e;
        }
        const text = JSON.stringify(data, null, 2) + "\n",
          file = path.join(this.directory, `${kind}.json`);
        await writeFile(temporary, text, {flag: 'wx'});
        await rename(temporary, file);
        return { revision: revision(text) };
        } finally {
          try {
            await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
          } finally {
            await lock.close();
            await unlink(lockPath);
          }
        }
      });
    const recorded=operation.then(async result=>{
      await recordEvent(this.root,'write',{document:kind,outcome:'success',durationMs:performance.now()-started,...(kind==='map'?mapCounts(data):{})});
      return result;
    },async error=>{
      await recordEvent(this.root,'write_error',{document:kind,outcome:error.status===409?'conflict':'error',durationMs:performance.now()-started});
      throw error;
    });
    this.queue = recorded;
    return recorded;
  }
}
export async function initialize(root) {
  await mkdir(path.join(root, ".object-map"), { recursive: true });
  for (const [kind, data] of Object.entries({
    map: { version: 1, objects: [] },
    layout: { version: 1, positions: {}, viewport: { x: 70, y: 70, zoom: 1 } },
    config: { version: 1, name: path.basename(root), states: true },
  }))
    try {
      await writeFile(
        path.join(root, ".object-map", `${kind}.json`),
        JSON.stringify(data, null, 2) + "\n",
        { flag: "wx" },
      );
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
}
