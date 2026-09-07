import http from "node:http";
import { readFile, writeFile, rename, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(fileURLToPath(import.meta.url));
const resources = await Promise.all(
  (await readdir(path.join(root, "src/pages")))
    .filter((f) => f.endsWith(".json"))
    .map(async (f) => {
      const page = JSON.parse(
        await readFile(path.join(root, "src/pages", f), "utf8"),
      );
      const model = JSON.parse(
        await readFile(
          path.join(root, "src/models", `${page.table}.json`),
          "utf8",
        ),
      );
      return { ...page, ...model };
    }),
);
let data;
try {
  data = JSON.parse(
    await readFile(path.join(root, "database/data.json"), "utf8"),
  );
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  data = JSON.parse(
    await readFile(path.join(root, "database/seed/data.json"), "utf8"),
  );
}
let pending = Promise.resolve();
const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    if (
      req.headers.origin &&
      req.headers.origin !== `http://${req.headers.host}`
    ) {
      res.writeHead(403);
      return res.end(JSON.stringify({ error: "Use the local application." }));
    }
    if (req.url === "/api" && req.method === "GET")
      return res.end(JSON.stringify({ resources, data }));
    if (req.url === "/api" && req.method === "POST") {
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 1e6) throw new Error("Record too large.");
      }
      const { resource, record, remove } = JSON.parse(body),
        definition = resources.find((x) => x.resource === resource);
      if (!definition) throw new Error("Unknown resource.");
      pending = pending
        .catch(() => {})
        .then(async () => {
          const next = structuredClone(data);
          if (remove) {
            next[resource] = next[resource].filter((x) => x.id !== remove);
            for (const d of resources)
              for (const item of next[d.resource])
                for (const [key, type] of Object.entries(d.fields)) {
                  if (type === resource && item[key] === remove) item[key] = "";
                  if (type === `${resource}[]` && Array.isArray(item[key]))
                    item[key] = item[key].filter((x) => x !== remove);
                }
          } else {
            const service = await import(`./src/services/${resource}.mjs`);
            service.prepare(record);
            for (const [key, type] of Object.entries(definition.fields)) {
              const value = record[key];
              if (Array.isArray(type) && value && !type.includes(value))
                throw new Error(`Invalid ${key}.`);
              if (
                typeof type === "string" &&
                resources.some((r) => r.resource === type.replace("[]", "")) &&
                value
              ) {
                const values = type.endsWith("[]") ? value : [value];
                if (
                  !Array.isArray(values) ||
                  values.some(
                    (id) =>
                      !next[type.replace("[]", "")].some((r) => r.id === id),
                  )
                )
                  throw new Error(`Invalid ${key}.`);
              }
            }
            const index = next[resource].findIndex((x) => x.id === record.id);
            if (index >= 0) next[resource][index] = record;
            else next[resource].push({ ...record, id: crypto.randomUUID() });
          }
          const file = path.join(root, "database/data.json");
          await writeFile(`${file}.tmp`, JSON.stringify(next, null, 2) + "\n");
          await rename(`${file}.tmp`, file);
          data = next;
        });
      await pending;
      return res.end(JSON.stringify({ resources, data }));
    }
    if (req.method === "GET") {
      res.setHeader("Content-Type", "text/html");
      return res.end(await readFile(path.join(root, "public/index.html")));
    }
    res.writeHead(404);
    res.end("{}");
  } catch (e) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: e.message }));
  }
});
server.listen(Number(process.env.PORT || 4318), "127.0.0.1", () =>
  console.log(`Atlas http://127.0.0.1:${process.env.PORT || 4318}`),
);
