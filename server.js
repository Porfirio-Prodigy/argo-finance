import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(ROOT, 'financeiro.sqlite3');
const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '127.0.0.1';
const VALID_KEYS = new Set([
  'financeiro_contas',
  'financeiro_dividas',
  'financeiro_emprestimos',
  'financeiro_investimentos',
]);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec(await readFile(resolve(ROOT, 'emprestimos.sql'), 'utf8'));
const getData = db.prepare('SELECT dados FROM app_data WHERE chave = ?');
const saveData = db.prepare(`
  INSERT INTO app_data (chave, dados, atualizado_em)
  VALUES (?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(chave) DO UPDATE SET
    dados = excluded.dados,
    atualizado_em = CURRENT_TIMESTAMP
`);

function json(response, status, value) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
}

async function readBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 5_000_000) throw new Error('Requisição muito grande');
  }
  return JSON.parse(body || '{}');
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || HOST}`);

  if (url.pathname === '/api/data' && request.method === 'GET') {
    const key = url.searchParams.get('key');
    if (!VALID_KEYS.has(key)) return json(response, 400, { error: 'Chave inválida' });
    const row = getData.get(key);
    if (!row) return json(response, 404, { error: 'Dados ainda não gravados' });
    return json(response, 200, { value: JSON.parse(row.dados) });
  }

  if (url.pathname === '/api/data' && request.method === 'PUT') {
    try {
      const { key, value } = await readBody(request);
      if (!VALID_KEYS.has(key) || !Array.isArray(value)) {
        return json(response, 400, { error: 'Dados inválidos' });
      }
      saveData.run(key, JSON.stringify(value));
      return json(response, 200, { saved: true });
    } catch {
      return json(response, 400, { error: 'Não foi possível salvar os dados' });
    }
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json(response, 405, { error: 'Método não permitido' });
  }

  let requestedPath = decodeURIComponent(url.pathname);
  if (requestedPath === '/') requestedPath = '/index.html';
  const filePath = resolve(ROOT, `.${requestedPath}`);
  const relativePath = relative(ROOT, filePath);
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath) || filePath === DB_PATH || filePath.endsWith('.py')) {
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
  console.log(`Financeiro disponível em http://${HOST}:${PORT}`);
  console.log(`Banco SQLite: ${DB_PATH}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
