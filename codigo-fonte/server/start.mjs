import {connectMongo} from './mongo.mjs';
import {createAuth} from './auth.mjs';
import {createRecordsRepository} from './records-repository.mjs';
import {v2 as cloudinary} from 'cloudinary';
import {createCompanyRepository} from './company-repository.mjs';
import {createPaymentService} from './financial.mjs';
import {createStockService} from './quote-stock.mjs';
import {createMediaService} from './media.mjs';
import {makeApp} from './http-app.mjs';
import {createStaffService} from './staff-service.mjs';
import {access} from 'node:fs/promises';
import {resolve} from 'node:path';
const required=['MONGODB_URI','APP_ORIGIN'];
const missing=required.filter(k=>!process.env[k]);
if(missing.length){console.error('Variáveis em falta: '+missing.join(', '));process.exit(1)}
let origin;
try{const url=new URL(process.env.APP_ORIGIN);if(url.origin!==process.env.APP_ORIGIN||!(url.protocol==='https:'||(process.env.NODE_ENV!=='production'&&url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))))throw Error();origin=url.origin}catch{console.error('APP_ORIGIN inválida; em produção deve ser uma origem HTTPS.');process.exit(1)}
const port=Number(process.env.PORT||10000);if(!Number.isInteger(port)||port<1||port>65535){console.error('PORT inválida.');process.exit(1)}
let client,server;
let experimentalWebRoot;if(process.env.EXPERIMENTAL_WEB==='true'){experimentalWebRoot=resolve('dist-online');try{await access(resolve(experimentalWebRoot,'online.html'))}catch{console.error('Interface experimental não compilada.');process.exit(1)}}
try{const connected=await connectMongo(process.env.MONGODB_URI);client=connected.client;const db=connected.db;const auth=createAuth({users:db.collection('users'),sessions:db.collection('sessions')});if(Boolean(process.env.ADMIN_EMAIL)!==Boolean(process.env.ADMIN_PASSWORD))throw new Error('Configuração de administrador incompleta.');if(process.env.ADMIN_EMAIL)await auth.ensureAdmin(process.env.ADMIN_EMAIL,process.env.ADMIN_PASSWORD);const records=createRecordsRepository(db.collection('records'));let media;if(process.env.CLOUDINARY_URL){const assets=db.collection('assets');await assets.createIndex({empresaId:1,id:1},{unique:true,name:'unique_tenant_asset'});media=createMediaService({cloudinary,assets,authorizeParent:async(principal,tenant,kind,id)=>{if(kind==='empresa'){if(id!==tenant)throw new Error('Empresa inválida.');return}await records.get(principal,tenant,id,kind)}})}const companies=createCompanyRepository(db.collection('companies'));const stock=createStockService({client,records:db.collection('records')});const payments=createPaymentService({client,records:db.collection('records')});const clocks=db.collection('staff_clocks');await clocks.createIndex({tenantId:1,userId:1,date:1},{unique:true,name:'staff_clock_day'});const staff=createStaffService({users:db.collection('users'),clocks,holidays:db.collection('staff_holidays'),messages:db.collection('staff_messages'),records:db.collection('records')});const app=makeApp({auth,records,companies,media,stock,payments,staff,origin,experimentalWebRoot,secureCookies:process.env.NODE_ENV==='production'});server=app.listen(port,'0.0.0.0',()=>console.log(`API de teste iniciada na porta ${port}.`))}catch{console.error('Não foi possível iniciar a API ou ligar ao MongoDB. Verifica as configurações privadas e o acesso de rede.');if(client)await client.close();process.exit(1)}
async function stop(){if(server)await new Promise(resolve=>server.close(resolve));if(client)await client.close();process.exit(0)}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
