import { execSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const TYPES: Record<string, string> = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff' };

export interface StaticSite {
  url: (path?: string) => string;
  close: () => void;
}

/** Build the site with the given env into `outDir` and serve it on a free port, like GitHub Pages does
 *  (extensionless URLs fall back to .html, 404.html for the rest). `base` is the sub-path it is served under. */
export async function buildAndServe(outDir: string, env: Record<string, string>, base = ''): Promise<StaticSite> {
  execSync(`npx astro build --outDir ${outDir}`, { env: { ...process.env, ...env }, stdio: 'pipe' });
  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    const send = (file: string, status = 200) => {
      res.writeHead(status, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(readFileSync(file));
    };
    if (!url.pathname.startsWith(base)) return send(join(outDir, '404.html'), 404);
    const rel = url.pathname.slice(base.length).replace(/^\//, '');
    const tryFiles = rel === '' ? ['index.html'] : [rel, `${rel}.html`, join(rel, 'index.html')];
    for (const f of tryFiles) {
      const p = join(outDir, f);
      if (existsSync(p) && statSync(p).isFile()) return send(p);
    }
    send(join(outDir, '404.html'), 404);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as AddressInfo).port;
  return {
    url: (path = '/') => `http://127.0.0.1:${port}${base}${path}`,
    close: () => {
      server.close();
      rmSync(outDir, { recursive: true, force: true });
    },
  };
}
