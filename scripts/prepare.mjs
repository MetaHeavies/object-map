import { mkdir } from "node:fs/promises";
import path from "node:path";
import { install } from "./install.mjs";
// Point the dev canvas at a real repository with OBJECT_MAP_REPO. With none
// set it opens an empty scratch repository, which is what a new user sees.
const root = path.resolve(process.env.OBJECT_MAP_REPO || "examples/workspace");
await mkdir(root, { recursive: true });
await install(root);
