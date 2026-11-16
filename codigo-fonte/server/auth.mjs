import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {hashPassword,verifyPassword,validatePassword} from './passwords.mjs';
const SESSION_MS=1000*60*60*12;
const hashToken=token=>createHash('sha256').update(token).digest('hex');
export class AuthError extends Error {constructor(message,status=400){super(message);this.status=status}}
export function normalizeEmail(value){if(typeof value!=='string')throw new AuthError('Email inválido.');const email=value.trim().toLowerCase();if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new AuthError('Email inválido.');return email}
/** Adaptador de autenticação. Os índices únicos e TTL devem ser criados antes de aceitar pedidos. */
export function createAuth({users,sessions,now=()=>new Date()}){
 async function register(email,password){email=normalizeEmail(email);validatePassword(password);const passwordHash=await hashPassword(password);const tenantId=randomUUID();const user={id:randomUUID(),email,passwordHash,role:'provider',tenantId,createdAt:now()};try{await users.insertOne(user)}catch(e){if(e?.code===11000)throw new AuthError('Não foi possível criar a conta.',409);throw e}return {id:user.id,email:user.email,role:user.role,tenantId:user.tenantId}}
 async function login(email,password){email=normalizeEmail(email);const user=await users.findOne({email});if(!user||!await verifyPassword(password,user.passwordHash))throw new AuthError('Email ou palavra-passe incorretos.',401);const token=randomBytes(32).toString('base64url'),createdAt=now(),expiresAt=new Date(createdAt.getTime()+SESSION_MS);await sessions.insertOne({tokenHash:hashToken(token),userId:user.id,createdAt,expiresAt});return {token,expiresAt,user:{id:user.id,email:user.email,role:user.role,tenantId:user.tenantId}}}
 async function authenticate(token){if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))throw new AuthError('Sessão necessária.',401);const record=await sessions.findOne({tokenHash:hashToken(token),expiresAt:{$gt:now()}});if(!record)throw new AuthError('Sessão inválida ou expirada.',401);const u=await users.findOne({id:record.userId});if(!u)throw new AuthError('Sessão inválida ou expirada.',401);return {id:u.id,email:u.email,role:u.role,tenantId:u.tenantId}}
 async function logout(token){if(typeof token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(token))await sessions.deleteOne({tokenHash:hashToken(token)});}
 return {register,login,authenticate,logout};
}
