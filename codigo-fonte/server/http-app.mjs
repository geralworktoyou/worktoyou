import express from 'express';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import {AuthError} from './auth.mjs';
import {AccessError} from './tenant-access.mjs';

/** API experimental: deve ser executada apenas atrás de HTTPS e com proxy confiável. */
export function makeApp({auth,records,origin,secureCookies=true}) {
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
 app.get('/api/records',principal,async(req,res,next)=>{try{if(!records)return res.status(503).json({error:'Registos indisponíveis.'});const rows=await records.list(req.user,undefined);res.json(rows.map(({id,kind,data,created})=>({id,kind,data:JSON.stringify(data),created})))}catch(e){next(e)}});
 // Apenas clientes nesta fase: restantes registos aguardam validação das regras de negócio.
 app.post('/api/records',checkOrigin,principal,async(req,res,next)=>{try{if(!records)return res.status(503).json({error:'Registos indisponíveis.'});const {id,kind,data}=req.body||{};if(kind!=='clientes')return res.status(501).json({error:'Este módulo ainda não está disponível online.'});const result=id?await records.update(req.user,undefined,id,kind,data):await records.create(req.user,undefined,kind,data);res.json({id:result.id})}catch(e){next(e)}});
 app.use((err,_req,res,_next)=>{if(err instanceof AuthError||err instanceof AccessError)return res.status(err.status).json({error:err.message});if(err instanceof TypeError)return res.status(400).json({error:err.message});res.status(500).json({error:'Não foi possível completar o pedido.'})});
 return app;
}
