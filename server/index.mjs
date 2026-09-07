import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createApi } from "./api.mjs";
const api = createApi(),
  root = path.resolve("dist");
http
  .createServer((req, res) =>
    api(req, res, async () => {
      try {
        const pathname = decodeURIComponent(
          new URL(req.url, "http://localhost").pathname,
        );
        const file = path.resolve(
          root,
          `.${pathname === "/" ? "/index.html" : pathname}`,
        );
        if (!file.startsWith(root + path.sep)) throw new Error("Not found");
        const content = await readFile(file);
        res.setHeader(
          "Content-Type",
          file.endsWith(".js")
            ? "text/javascript"
            : file.endsWith(".css")
              ? "text/css"
              : "text/html",
        );
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    }),
  )
  .listen(Number(process.env.PORT || 5173), "127.0.0.1", () =>
    console.log(`Object Map http://127.0.0.1:${process.env.PORT || 5173}`),
  );
