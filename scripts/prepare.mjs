import { access } from "node:fs/promises";
import path from "node:path";
import { generate } from "../tests/fixtures/generator/generate.mjs";
import { install } from "./install.mjs";
const root = path.resolve(process.env.OBJECT_MAP_REPO || "examples/atlas");
try {
  await access(root);
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  if (process.env.OBJECT_MAP_REPO)
    throw new Error("The configured repository does not exist.");
  await generate(root);
}
await install(root);
