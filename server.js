import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '127.0.0.1';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405).end('Método não permitido');
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host || HOST}`);
  let requestedPath;
  try {
    requestedPath = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end('Caminho inválido');
    return;
  }
  if (requestedPath === '/') requestedPath = '/index.html';
  const filePath = resolve(ROOT, `.${requestedPath}`);
  const relativePath = relative(ROOT, filePath);
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)
    || filePath.endsWith('.py') || filePath.endsWith('.sql') || filePath.endsWith('.sqlite3')) {
    response.writeHead(404).end('Não encontrado');
    return;
  }

  try {
    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile()) throw new Error('Não é arquivo');
    const content = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': content.length,
      'Cache-Control': 'no-cache',
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Arquivo não encontrado');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Argo Finance disponível em http://${HOST}:${PORT}`);
});
