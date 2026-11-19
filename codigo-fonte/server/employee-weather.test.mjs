import test from 'node:test';
import assert from 'node:assert/strict';
import {makeApp} from './http-app.mjs';

test('meteorologia é reservada ao colaborador e não inventa dados se o serviço falhar',async()=>{
 const original=globalThis.fetch;
 const auth={async authenticate(token){return {id:'u',role:token==='staff'?'staff':'provider',tenantId:'a'}}};
 const server=makeApp({auth,origin:'https://example.test'}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const url=`http://127.0.0.1:${server.address().port}/api/employee/weather`;
 try{globalThis.fetch=async()=>Response.json({current:{temperature_2m:18.4,weather_code:2}});assert.equal((await original(url,{headers:{cookie:'wt_session=provider'}})).status,403);const result=await original(url,{headers:{cookie:'wt_session=staff'}});assert.deepEqual(await result.json(),{temperature:18.4,code:2,location:'Ponta Delgada'});globalThis.fetch=async()=>{throw Error('offline')};assert.equal((await original(url,{headers:{cookie:'wt_session=staff'}})).status,503)}finally{globalThis.fetch=original;await new Promise(r=>server.close(r))}
});
