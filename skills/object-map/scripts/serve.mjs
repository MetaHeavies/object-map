import http from 'node:http';
import {readFile, access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createApi} from './api.mjs';
import {findRoot} from './workspace.mjs';
const demo = process.argv.includes('--demo');
// The shipped demo is copied out so exploring it never edits the installed skill.
const root = demo
  ? await (async () => {
      const {cp, mkdtemp} = await import('node:fs/promises');
      const os = await import('node:os');
      const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../demo');
      const target = await mkdtemp(path.join(os.tmpdir(), 'object-map-demo-'));
      await cp(source, target, {recursive: true});
      return target;
    })()
  : await findRoot(process.env.OBJECT_MAP_REPO || process.cwd());
const assets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets/app');
try { await access(path.join(assets, 'index.html')); }
catch { throw new Error('Canvas bundle missing. Use the packaged Object Map skill, or run npm run package:skill in the Object Map source project before installing.'); }
const api = createApi(root);
const portArg = process.argv.find(arg => arg.startsWith('--port='));
const port = Number(portArg?.slice(7) || 5173);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid port');
const server = http.createServer((req, res) => api(req, res, async () => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(assets, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(assets + path.sep)) throw new Error('Not found');
    const content = await readFile(file);
    const types = {'.js':'text/javascript', '.css':'text/css', '.html':'text/html', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2'};
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(content);
  } catch { res.writeHead(404); res.end('Not found'); }
}));
server.on('error', error => {console.error(error.code === 'EADDRINUSE' ? `Port ${port} is busy. Use --port=5174 or another free port.` : error.message); process.exitCode = 1;});
server.listen(port, '127.0.0.1', () => console.log(`Object Map http://127.0.0.1:${server.address().port}\n${demo ? 'Demo product — a sandbox copy, your repositories are untouched' : `Repository: ${root}`}`));
