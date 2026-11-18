import test from 'node:test';import assert from 'node:assert/strict';
import {attendanceDays,validateProfile,validDate,createWorkforce} from './workforce.mjs';
import {makeApp} from './http-app.mjs';

test('dias sem registo são identificados apenas com horário e excluem férias',()=>{
 const rows=attendanceDays({startDate:'2026-11-16',weekdays:[1,2,3,4,5],today:'2026-11-20',from:'2026-11-01',clocks:[{date:'2026-11-16',events:[{type:'entrada',at:'2026-11-16T09:00:00Z'}]}],holidays:[{start:'2026-11-17',end:'2026-11-17',status:'prevista'}],requests:[{type:'absence',date:'2026-11-18',status:'approved'}]});
 assert.deepEqual(rows.map(x=>[x.date,x.state]),[['2026-11-19','missing'],['2026-11-18','justified'],['2026-11-17','vacation'],['2026-11-16','incomplete']]);
 assert.deepEqual(attendanceDays({startDate:'',weekdays:[],clocks:[],holidays:[],requests:[],today:'2026-11-20',from:'2026-11-01'}),[]);
});
test('valida dados de horário, datas e valor por hora',()=>{assert.equal(validDate('2026-02-30'),false);assert.equal(validDate('2026-02-28'),true);assert.equal(validateProfile({rate:'12.50',startDate:'2026-11-16',weekdays:[1,2]}).rate,12.5);assert.throws(()=>validateProfile({rate:-1,weekdays:[]}));assert.throws(()=>validateProfile({rate:4,weekdays:[1,1]}))});
test('pedidos, decisões e valores respeitam a empresa e o perfil',async()=>{
 const docs=[];const users={async findOne(q){return q.tenantId==='a'&&q.id==='s'?{id:'s',tenantId:'a',role:'staff',rate:15}:null},async updateOne(q,op){assert.equal(q.tenantId,'a');return {matchedCount:1}}};
 const requests={async insertOne(d){docs.push(d)},async updateOne(q,op){const d=docs.find(x=>x.tenantId===q.tenantId&&x.id===q.id&&x.status===q.status);if(!d)return {matchedCount:0};Object.assign(d,op.$set);return {matchedCount:1}},find(q){return {sort(){return {async toArray(){return docs.filter(x=>x.tenantId===q.tenantId&&(!q.userId||x.userId===q.userId))}}}}}};
 const svc=createWorkforce({users,requests,now:()=>new Date('2026-11-18T12:00:00Z')});const staff={role:'staff',tenantId:'a',id:'s'},owner={role:'provider',tenantId:'a',id:'p'},other={role:'provider',tenantId:'b',id:'q'};
 const req=await svc.request(staff,{type:'vacation',start:'2026-12-01',end:'2026-12-03'});assert.equal(req.status,'pending');await assert.rejects(()=>svc.decide(other,req.id,'approved'),e=>e.status===409);await assert.rejects(()=>svc.profile(staff,'s',{weekdays:[]}),e=>e.status===403);await svc.decide(owner,req.id,'approved');await assert.rejects(()=>svc.decide(owner,req.id,'rejected'),e=>e.status===409);assert.equal(docs[0].status,'approved');await assert.rejects(()=>svc.request(staff,{type:'absence',date:'2026-11-19',reason:'x'}));
});
test('API protege pedidos e decisões com sessão e origem',async()=>{
 let writes=0;const auth={async authenticate(token){if(!token)throw new (await import('./auth.mjs')).AuthError('Sessão necessária.',401);return token==='p'?{id:'p',role:'provider',tenantId:'a'}:{id:'s',role:'staff',tenantId:'a'}}};
 const workforce={async request(u,v){if(u.role!=='staff')throw new (await import('./auth.mjs')).AuthError('Acesso recusado.',403);writes++;return {ok:true}},async decide(u,id,status){if(u.role!=='provider')throw new (await import('./auth.mjs')).AuthError('Acesso recusado.',403);writes++;return {ok:true}}};
 const server=makeApp({auth,workforce,origin:'https://example.test'}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;const send=(path,cookie,origin)=>fetch(base+path,{method:'POST',headers:{cookie,origin,'content-type':'application/json'},body:'{}'});
 try{assert.equal((await send('/api/employee/requests','wt_session=s','https://wrong.test')).status,403);assert.equal((await send('/api/employee/requests','','https://example.test')).status,401);assert.equal((await send('/api/workforce/requests/x/decision','wt_session=s','https://example.test')).status,403);assert.equal(writes,0);assert.equal((await send('/api/employee/requests','wt_session=s','https://example.test')).status,200);assert.equal((await send('/api/workforce/requests/x/decision','wt_session=p','https://example.test')).status,200);assert.equal(writes,2)}finally{await new Promise(r=>server.close(r))}
});
