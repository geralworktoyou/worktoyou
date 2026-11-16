import {resolveTenant} from './tenant-access.mjs';
const FIELDS=['nome','nif','morada','codigoPostal','localidade','telefone','email','website'];
export function createCompanyRepository(collection){
 if(!collection)throw new TypeError('Coleção necessária.');
 async function get(principal,tenant){const empresaId=resolveTenant(principal,tenant);const doc=await collection.findOne({empresaId},{projection:{_id:0}});return {...(doc?.data||{}),...(doc?.logoAssetId?{logoKey:'/api/company-logo?id='+encodeURIComponent(doc.logoAssetId)}:{})}}
 async function put(principal,tenant,input){const empresaId=resolveTenant(principal,tenant);if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Dados da empresa inválidos.');const data={};for(const key of FIELDS){if(input[key]!==undefined&&typeof input[key]!=='string')throw new TypeError('Campo inválido.');data[key]=(input[key]||'').trim().slice(0,key==='morada'?250:160)}if(!data.nome)throw new TypeError('Indique o nome da empresa.');await collection.updateOne({empresaId},{$set:{data,updated:new Date()}},{upsert:true});return get(principal,tenant)}
 async function swapLogo(principal,tenant,id){const empresaId=resolveTenant(principal,tenant);if(id!==null&&(typeof id!=='string'||!id))throw new TypeError('Logótipo inválido.');const update=id?{$set:{logoAssetId:id,updated:new Date()}}:{$unset:{logoAssetId:''},$set:{updated:new Date()}};const previous=await collection.findOneAndUpdate({empresaId},update,{upsert:!!id,returnDocument:'before'});return previous?.logoAssetId||null}
 return {get,put,swapLogo};
}
