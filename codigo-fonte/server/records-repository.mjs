import {randomUUID} from 'node:crypto';
import {resolveTenant,scopeQuery,scopeNewRecord,AccessError} from './tenant-access.mjs';
const KINDS=new Set(['ocorrencias','ocorrencia_eliminada','clientes','orcamentos','produtos','pagamentos','faturas','atividade']);
function validKind(kind){if(!KINDS.has(kind))throw new TypeError('Tipo de registo inválido.');}
function validId(id){if(typeof id!=='string'||!id||id.length>128)throw new TypeError('Identificador inválido.');}
/** O principal deve ser obtido da sessão autenticada no servidor, nunca do cliente. */
export function createRecordsRepository(collection){
 if(!collection)throw new TypeError('Coleção necessária.');
 return {
  async list(principal,tenant){const t=resolveTenant(principal,tenant);return collection.find(scopeQuery(t,{}),{projection:{_id:0}}).sort({created:-1}).toArray()},
  async get(principal,tenant,id,kind){const t=resolveTenant(principal,tenant);validId(id);validKind(kind);const doc=await collection.findOne(scopeQuery(t,{id,kind}));if(!doc)throw new AccessError('Registo não encontrado.',404);return doc},
  async create(principal,tenant,kind,data){const t=resolveTenant(principal,tenant);validKind(kind);if(!data||typeof data!=='object'||Array.isArray(data))throw new TypeError('Dados inválidos.');const doc=scopeNewRecord(t,{id:randomUUID(),kind,data,created:new Date().toISOString()});await collection.insertOne(doc);const {_id,...result}=doc;return result},
  async update(principal,tenant,id,kind,data){const t=resolveTenant(principal,tenant);validId(id);validKind(kind);if(!data||typeof data!=='object'||Array.isArray(data))throw new TypeError('Dados inválidos.');const result=await collection.updateOne(scopeQuery(t,{id,kind}),{$set:{data,updated:new Date().toISOString()}});if(!result.matchedCount)throw new AccessError('Registo não encontrado.',404);return {id}},
  async remove(principal,tenant,id,kind){const t=resolveTenant(principal,tenant);validId(id);validKind(kind);const result=await collection.deleteOne(scopeQuery(t,{id,kind}));if(!result.deletedCount)throw new AccessError('Registo não encontrado.',404);return {id}}
 };
}
