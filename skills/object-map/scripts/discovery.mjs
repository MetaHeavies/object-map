import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { makeObject, addItem } from "./model.mjs";
const ignored = new Set([
  "node_modules",
  ".git",
  ".object-map",
  ".agents",
  ".codex",
  "dist",
  "expected",
]);
async function walk(root, relative = "", depth = 0) {
  if (depth > 8) return [];
  const entries = await readdir(path.join(root, relative), {
    withFileTypes: true,
  });
  let files = [];
  for (const e of entries) {
    if (ignored.has(e.name) || e.isSymbolicLink()) continue;
    const file = path.join(relative, e.name);
    if (e.isDirectory()) files.push(...(await walk(root, file, depth + 1)));
    else if (/\.(sql|json|[cm]?[jt]sx?)$/.test(e.name)) files.push(file);
    if (files.length > 3000) break;
  }
  return files;
}
const human = (name) =>
  name
    .replace(/_ids?$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
export async function discover(root) {
  const files = await walk(root),
    sources = [];
  for (const file of files) {
    const text = await readFile(path.join(root, file), "utf8");
    if (text.length < 300000) sources.push({ file, text });
  }
  const pages = [];
  for (const source of sources.filter(
    (s) => s.file.includes("pages") && s.file.endsWith(".json"),
  ))
    try {
      const page = JSON.parse(source.text);
      if (page.table && page.label) pages.push({ ...page, file: source.file });
    } catch {}
  const tables = [];
  for (const source of sources.filter((s) => s.file.endsWith(".sql")))
    for (const match of source.text.matchAll(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([\w]+)["`]?\s*\(([\s\S]*?)\);/gi,
    ))
      tables.push({ table: match[1], body: match[2], file: source.file });
  let map = { version: 1, objects: [] };
  const tableToId = new Map(),
    candidates = [];
  for (const table of tables) {
    const page = pages.find((p) => p.table === table.table),
      name = page?.label || human(table.table),
      object = makeObject(map, name);
    object.evidence = [
      table.file,
      ...(page ? [page.file] : []),
      ...sources
        .filter(
          (s) =>
            /services|validation|models/.test(s.file) &&
            ((page && s.file.includes(page.resource)) ||
              s.file.includes(table.table)),
        )
        .map((s) => s.file),
    ];
    object.description = page
      ? `A ${name.toLowerCase()} in ${path.basename(root)}.`
      : "";
    map.objects.push(object);
    tableToId.set(table.table, object.id);
    candidates.push({
      id: object.id,
      confidence: page ? "strong" : "review",
      reason: page
        ? `“${page.plural || page.label}” appears in the interface; fields come from ${table.table}.`
        : "Schema evidence only. This may be an implementation detail.",
      table,
      page,
    });
  }
  for (const candidate of candidates) {
    const { table, page, id } = candidate;
    for (const line of table.body.split("\n")) {
      const column = line
        .trim()
        .match(
          /^(\w+)\s+(TEXT|VARCHAR|INTEGER|INT|REAL|BOOLEAN|TIMESTAMP|DATE|JSON|UUID)/i,
        );
      if (!column || column[1] === "id") continue;
      const name = human(column[1]),
        ref = line.match(/REFERENCES\s+["`]?([\w]+)/i);
      if (ref && tableToId.has(ref[1]))
        map = addItem(map, id, "relationships", name, tableToId.get(ref[1]));
      else {
        map = addItem(map, id, "attributes", name);
        const options = line.match(/CHECK\s*\(.*?IN\s*\(([^)]+)/i);
        if (options && column[1] === "status")
          for (const value of options[1].matchAll(/'([^']+)'/g))
            map = addItem(map, id, "states", human(value[1]));
      }
    }
    for (const name of page?.actions || [])
      map = addItem(map, id, "actions", name);
  }
  for (const object of map.objects) {
    object.status = 'observed';
    for (const section of ['attributes', 'relationships', 'actions', 'states'])
      for (const item of object[section]) item.status = 'observed';
  }
  return {
    candidates: candidates.map(({ table, page, ...c }) => ({
      ...c,
      object: map.objects.find((o) => o.id === c.id),
    })),
    scannedFiles: sources.length,
    adapter: "SQL schemas + JSON page metadata",
    limitations:
      "Discovery currently understands SQL CREATE TABLE statements and JSON page metadata. For other stacks, use the installed skill to inspect code and prepare proposals. Every candidate needs human review.",
  };
}
