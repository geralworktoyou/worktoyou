import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import {rateLimit} from 'express-rate-limit';
import {AuthError} from './auth.mjs';
import {AccessError} from './tenant-access.mjs';
import {validateInvoiceLinks} from './financial.mjs';

/** API experimental: deve ser executada apenas atrás de HTTPS e com proxy confiável. */
export function makeApp({auth,records,media,stock,payments,origin,secureCookies=true}) {
 if(!auth||!origin)throw new Error('Configuração de autenticação e origem é obrigatória.');
 const app=express();app.disable('x-powered-by');app.set('trust proxy',1);
 app.use(helmet());app.use(express.json({limit:'32kb'}));
 const limiter=rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:'draft-7',legacyHeaders:false});
 function checkOrigin(req,res,next){if(req.get('origin')!==origin)return res.status(403).json({error:'Origem não autorizada.'});next()}
 function token(req){const parts=(req.headers.cookie||'').split(';').map(x=>x.trim());const item=parts.find(x=>x.startsWith('wt_session='));return item?item.slice('wt_session='.length):''}
 const options={httpOnly:true,secure:secureCookies,sameSite:'strict',path:'/'};
 app.get('/healthz',(_req,res)=>res.json({ok:true}));
 app.post('/api/auth/register',limiter,checkOrigin,async(req,res,next)=>{try{const user=await auth.register(req.body?.email,req.body?.password);res.status(201).json({user})}catch(e){next(e)}});
 app.post('/api/auth/login',limiter,checkOrigin,async(req,res,next)=>{try{const s=await auth.login(req.body?.email,req.body?.password);res.cookie('wt_session',s.token,{...options,expires:s.expiresAt});res.json({user:s.user})}catch(e){next(e)}});
 app.get('/api/auth/me',async(req,res,next)=>{try{res.json({user:await auth.authenticate(token(req))})}catch(e){next(e)}});
 app.post('/api/auth/logout',checkOrigin,async(req,res,next)=>{try{await auth.logout(token(req));res.clearCookie('wt_session',options);res.status(204).end()}catch(e){next(e)}});
 async function principal(req,res,next){try{req.user=await auth.authenticate(token(req));next()}catch(e){next(e)}}
 app.get('/api/records',principal,async(req,res,next)=>{try{if(!records)return res.status(503).json({error:'Registos indisponíveis.'});const rows=await records.list(req.user,undefined);const assets=media?await media.list(req.user,undefined):[];const files=assets.map(a=>({id:a.id,kind:a.parentType==='faturas'?'fatura_pdf':'fotos',data:{[a.parentType==='faturas'?'faturaId':'ocorrenciaId']:a.parentId,nome:a.nome,localUrl:(a.parentType==='faturas'?'/api/invoice-pdfs?id=':'/api/photos?id=')+encodeURIComponent(a.id)},created:a.created}));res.json([...rows,...files].map(({id,kind,data,created})=>({id,kind,data:JSON.stringify(data),created})))}catch(e){next(e)}});
 // Escritas limitadas aos módulos já preparados; restantes exigem regras próprias.
 app.post('/api/records',checkOrigin,principal,async(req,res,next)=>{try{if(!records)return res.status(503).json({error:'Registos indisponíveis.'});const {id,kind,data}=req.body||{};if(!['clientes','ocorrencias','atividade','orcamentos','produtos','faturas','pagamentos'].includes(kind))return res.status(501).json({error:'Este módulo ainda não está disponível online.'});if(!data||typeof data!=='object'||Array.isArray(data))return res.status(400).json({error:'Dados inválidos.'});if(kind==='atividade'){if(typeof data.ocorrenciaId!=='string'||!data.ocorrenciaId)return res.status(400).json({error:'Selecione uma ocorrência.'});await records.get(req.user,undefined,data.ocorrenciaId,'ocorrencias')}if(kind==='orcamentos'){if(data.ocorrenciaId)await records.get(req.user,undefined,data.ocorrenciaId,'ocorrencias');delete data.stockMovimentos;delete data.stockDescontadoEm;if(Array.isArray(data.linhas)&&data.linhas.length){if(data.linhas.length>200)return res.status(400).json({error:'Demasiadas linhas no orçamento.'});for(const line of data.linhas){if(typeof line.descricao!=='string'||!line.descricao.trim()||!Number.isFinite(Number(line.quantidade))||Number(line.quantidade)<=0||!Number.isFinite(Number(line.preco))||Number(line.preco)<0)return res.status(400).json({error:'Linha de orçamento inválida.'});if(line.tipo==='produto')await records.get(req.user,undefined,line.produtoId,'produtos')}data.subtotal=Math.round(data.linhas.reduce((sum,line)=>sum+Number(line.quantidade)*Number(line.preco),0)*100)/100}}if(kind==='pagamentos'){if(id)return res.status(501).json({error:'Edição de pagamentos ainda não disponível.'});if(!payments)return res.status(503).json({error:'Pagamentos indisponíveis.'});return res.json(await payments.create(req.user,undefined,data))}if(kind==='faturas'){if(id)return res.status(501).json({error:'Edição de faturas ainda não disponível.'});const quote=data.orcamentoId?await records.get(req.user,undefined,data.orcamentoId,'orcamentos'):null;const occ=data.ocorrenciaId?await records.get(req.user,undefined,data.ocorrenciaId,'ocorrencias'):null;validateInvoiceLinks(data,quote,occ);delete data.totalPago;data.totalPago=0;}if(kind==='produtos'&&id)return res.status(501).json({error:'Edição de produtos online ainda não disponível.'});if(kind==='produtos'&&(!Number.isFinite(Number(data.stock))||Number(data.stock)<0))return res.status(400).json({error:'Stock inválido.'});const result=id?(kind==='orcamentos'?await records.updateQuote(req.user,undefined,id,data):await records.update(req.user,undefined,id,kind,data)):await records.create(req.user,undefined,kind,data);res.json({id:result.id})}catch(e){next(e)}});
 app.post('/api/quote-stock',checkOrigin,principal,async(req,res,next)=>{try{if(!stock)return res.status(503).json({error:'Stock indisponível.'});res.json(await stock.change(req.user,undefined,req.body?.id,req.body?.action))}catch(e){next(e)}});
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:12*1024*1024,files:1,fields:4}});
 for(const [path,parentType,parentKey] of [['/api/photos','ocorrencias','ocorrenciaId'],['/api/invoice-pdfs','faturas','faturaId']]){
  app.post(path,checkOrigin,principal,upload.single('ficheiro'),async(req,res,next)=>{try{if(!media)return res.status(503).send('Ficheiros indisponíveis.');const result=await media.upload(req.user,undefined,{buffer:req.file?.buffer,parentType,parentId:req.body?.[parentKey],name:req.file?.originalname});res.json(result)}catch(e){next(e)}});
  app.get(path,principal,async(req,res,next)=>{try{if(!media)return res.status(503).send('Ficheiros indisponíveis.');const url=await media.downloadLink(req.user,undefined,req.query.id);res.set('Cache-Control','no-store');res.redirect(302,url)}catch(e){next(e)}});
  app.delete(path,checkOrigin,principal,async(req,res,next)=>{try{if(!media)return res.status(503).send('Ficheiros indisponíveis.');res.json(await media.remove(req.user,undefined,req.body?.id))}catch(e){next(e)}});
 }
 app.use((err,_req,res,_next)=>{if(err instanceof AuthError||err instanceof AccessError)return res.status(err.status).json({error:err.message});if(err instanceof TypeError)return res.status(400).json({error:err.message});res.status(500).json({error:'Não foi possível completar o pedido.'})});
 return app;
}
