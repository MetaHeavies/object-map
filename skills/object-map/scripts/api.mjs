import path from "node:path";
import { Store } from "./store.mjs";
import { discover } from "./discovery.mjs";
export function createApi(
  root = path.resolve(process.env.OBJECT_MAP_REPO || "."),
) {
  const store = new Store(root);
  return async (req, res, next) => {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith("/api/")) return next?.();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    try {
      if (
        req.headers.origin &&
        req.headers.origin !== `http://${req.headers.host}`
      ) {
        res.writeHead(403);
        return res.end(
          JSON.stringify({ error: "Use the local Object Map application." }),
        );
      }
      if (url.pathname === "/api/workspace" && req.method === "GET") {
        const [map, layout, config] = await Promise.all(
          ["map", "layout", "config"].map((k) => store.read(k)),
        );
        return res.end(
          JSON.stringify({
            map: map.data,
            layout: layout.data,
            config: config.data,
            revisions: { map: map.revision, layout: layout.revision },
            repository: root,
          }),
        );
      }
      if (url.pathname === "/api/discover" && req.method === "GET")
        return res.end(JSON.stringify(await discover(root)));
      if (
        ["/api/map", "/api/layout"].includes(url.pathname) &&
        req.method === "PUT"
      ) {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 5e6) {
            const e = new Error("Map exceeds the 5 MB limit.");
            e.status = 413;
            throw e;
          }
        }
        const { data, revision } = JSON.parse(body);
        return res.end(
          JSON.stringify(
            await store.write(url.pathname.slice(5), data, revision),
          ),
        );
      }
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Endpoint not found." }));
    } catch (e) {
      res.writeHead(e.status || 400);
      res.end(JSON.stringify({ error: e.message }));
    }
  };
}
