import path from "node:path";
import { discover } from "../server/discovery.mjs";
console.log(
  JSON.stringify(
    await discover(path.resolve(process.argv[2] || "examples/atlas")),
    null,
    2,
  ),
);
