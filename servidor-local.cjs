// Servidor apenas para testes no próprio computador, sem dependências externas.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Porta inválida.');
const files = {'/':['WorkToyou_Local.html','text/html; charset=utf-8'],'/WorkToyou_Local.html':['WorkToyou_Local.html','text/html; charset=utf-8'],'/manifest-local.webmanifest':['manifest-local.webmanifest','application/manifest+json'],'/codigo-fonte/public/favicon.svg':['codigo-fonte/public/favicon.svg','image/svg+xml']};
for(const size of ['180','192','512','maskable-512'])files[`/codigo-fonte/public/worktoyou-${size}.png`]=[`codigo-fonte/public/worktoyou-${size}.png`,'image/png'];
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (req.method !== 'GET' || !Object.hasOwn(files,pathname)) {res.writeHead(404); return res.end('Não encontrado');}
  const [file,type]=files[pathname];res.writeHead(200, {'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  fs.createReadStream(path.join(__dirname,file)).on('error', () => res.end('Ficheiro não encontrado.')).pipe(res);
});
server.on('error', error => { console.error('Não foi possível iniciar:', error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`WorkToyou disponível em http://127.0.0.1:${port}\nPara terminar prima Ctrl+C.`));
