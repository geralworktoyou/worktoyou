// Servidor apenas para testes no próprio computador, sem dependências externas.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, 'WorkToyou_Local.html');
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Porta inválida.');
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (req.method !== 'GET' || !['/', '/WorkToyou_Local.html'].includes(pathname)) {res.writeHead(404); return res.end('Não encontrado');}
  res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  fs.createReadStream(file).on('error', () => res.end('Ficheiro não encontrado.')).pipe(res);
});
server.on('error', error => { console.error('Não foi possível iniciar:', error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`WorkToyou disponível em http://127.0.0.1:${port}\nPara terminar prima Ctrl+C.`));
