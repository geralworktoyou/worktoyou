import {connectMongo} from './mongo.mjs';
import {createAuth} from './auth.mjs';
import {createRecordsRepository} from './records-repository.mjs';
import {makeApp} from './http-app.mjs';
const required=['MONGODB_URI','APP_ORIGIN'];
const missing=required.filter(k=>!process.env[k]);
if(missing.length){console.error('Variáveis em falta: '+missing.join(', '));process.exit(1)}
let origin;
try{const url=new URL(process.env.APP_ORIGIN);if(url.origin!==process.env.APP_ORIGIN||!(url.protocol==='https:'||(process.env.NODE_ENV!=='production'&&url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))))throw Error();origin=url.origin}catch{console.error('APP_ORIGIN inválida; em produção deve ser uma origem HTTPS.');process.exit(1)}
const port=Number(process.env.PORT||10000);if(!Number.isInteger(port)||port<1||port>65535){console.error('PORT inválida.');process.exit(1)}
let client,server;
try{const connected=await connectMongo(process.env.MONGODB_URI);client=connected.client;const db=connected.db;const auth=createAuth({users:db.collection('users'),sessions:db.collection('sessions')});const records=createRecordsRepository(db.collection('records'));const app=makeApp({auth,records,origin,secureCookies:process.env.NODE_ENV==='production'});server=app.listen(port,'0.0.0.0',()=>console.log(`API de teste iniciada na porta ${port}.`))}catch{console.error('Não foi possível iniciar a API ou ligar ao MongoDB. Verifica as configurações privadas e o acesso de rede.');if(client)await client.close();process.exit(1)}
async function stop(){if(server)await new Promise(resolve=>server.close(resolve));if(client)await client.close();process.exit(0)}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
