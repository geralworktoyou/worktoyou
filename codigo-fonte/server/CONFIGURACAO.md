# Preparação do servidor WorkToyou

Estado: em desenvolvimento. NÃO publicar para clientes ou importar dados reais.
O servidor ainda não serve a interface e apenas implementa a rota de clientes.
O adaptador de ficheiros não está ligado às rotas nem a uma conta Cloudinary.

Variáveis para a API experimental:
- `MONGODB_URI`: URL privada do MongoDB, incluindo credenciais do utilizador limitado.
- `APP_ORIGIN`: origem exata da aplicação, como `https://exemplo.onrender.com`.
- `NODE_ENV`: `production` para utilizar cookies Secure e exigir HTTPS.
- `PORT`: definido pelo Render; a API usa 10000 se estiver ausente.

Nunca guardar valores de credenciais no repositório, em imagens ou no código.
A aplicação exige uma base `worktoyou`, configuração de rede no Atlas e permissão
`readWrite` nessa base. Uma origem ainda não conhecida deve ser configurada depois
de criado o serviço. O utilizador de base de dados não é uma conta de acesso à app.

A API experimental arranca com `npm run start:api`. Requer instalação prévia com
`npm ci`. Não é a versão completa; faltam restantes módulos, gestão de contas,
Cloudinary, interface online e importação. O arranque sem configurações falha de
forma explícita e nunca deve ser substituído por dados fictícios.
