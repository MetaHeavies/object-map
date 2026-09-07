import { readFile } from "node:fs/promises";
import path from "node:path";
import {findRoot} from "./workspace.mjs";
const root = await findRoot();
const map = JSON.parse(await readFile(path.join(root, ".object-map/map.json"), "utf8"));
const id = process.argv[2];
if (!id) console.log(JSON.stringify(map, null, 2));
else {
  const object = map.objects.find(
    (o) =>
      o.id === id ||
      ["attributes", "relationships", "actions", "states"].some((s) =>
        o[s].some((i) => i.id === id),
      ),
  );
  if (!object) {
    console.error(`Unknown Object Map reference: ${id}`);
    process.exitCode = 1;
  } else {
    const linked = new Set(object.relationships.map((r) => r.target));
    for (const o of map.objects)
      if (o.relationships.some((r) => r.target === object.id)) linked.add(o.id);
    console.log(
      JSON.stringify(
        {
          reference: id,
          object,
          neighbours: map.objects.filter((o) => linked.has(o.id)),
        },
        null,
        2,
      ),
    );
  }
}
