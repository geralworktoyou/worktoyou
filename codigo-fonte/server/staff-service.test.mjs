import test from 'node:test';
import assert from 'node:assert/strict';
import {createStaffService} from './staff-service.mjs';
import {makeApp} from './http-app.mjs';
import {createRecordsRepository} from './records-repository.mjs';

test('colaborador só recebe ocorrências atribuídas na sua empresa',async()=>{
 let query;
 const records={find(q){query=q;return {async toArray(){return [{id:'1',data:{titulo:'Trabalho',cliente:'Ana',valor:500,notas:'Nota'}}]}}}};
 const service=createStaffService({records});
 const rows=await service.ownOccurrences({id:'s1',role:'staff',tenantId:'empresa-a'});
 assert.deepEqual(query,{empresaId:'empresa-a',kind:'ocorrencias','data.colaboradores':'s1'});
 assert.equal(rows[0].data.valor,undefined);
 await assert.rejects(()=>service.ownOccurrences({id:'p',role:'provider',tenantId:'empresa-a'}),e=>e.status===403);
});

test('API impede colaborador de aceder aos registos gerais e exige origem no ponto',async()=>{
 const auth={async authenticate(){return {id:'staff-a',role:'staff',tenantId:'empresa-a'}}};
 const records=createRecordsRepository({find(){throw Error('não deve consultar todos os dados')}});
 let calls=0;const staff={async ownOccurrences(){calls++;return [{id:'1'}]},async punch(){calls++;return {next:'saida_almoco'}}};
 const server=makeApp({auth,records,staff,origin:'https://example.test'}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const url=`http://127.0.0.1:${server.address().port}`;
 try{assert.equal((await fetch(url+'/api/records')).status,403);assert.equal((await fetch(url+'/api/employee/clock',{method:'POST',headers:{origin:'https://outra.test'}})).status,403);assert.equal(calls,0);assert.equal((await fetch(url+'/api/employee/occurrences')).status,200);assert.equal(calls,1)}finally{await new Promise(r=>server.close(r))}
});

test('empresa não pode consultar horas de colaborador de outra empresa',async()=>{
 const users={async findOne(q){assert.equal(q.tenantId,'empresa-a');return null}};
 const service=createStaffService({users});
 await assert.rejects(()=>service.hours({id:'p',role:'provider',tenantId:'empresa-a'},'staff-outra'),e=>e.status===404);
 await assert.rejects(()=>service.hours({id:'s',role:'staff',tenantId:'empresa-a'},'s'),e=>e.status===403);
});
