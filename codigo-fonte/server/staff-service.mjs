import {randomUUID} from 'node:crypto';
import {normalizeEmail, AuthError} from './auth.mjs';
import {hashPassword} from './passwords.mjs';
import {nextClockStep, workedMilliseconds} from './staff-clock.mjs';

const dateAzores = d => new Intl.DateTimeFormat('en-CA',{timeZone:'Atlantic/Azores',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const clean = (v, max=200) => typeof v === 'string' ? v.trim().slice(0,max) : '';
const publicStaff = ({id,email,nome,morada,nif,horario,disabled}) => ({id,email,nome,morada,nif,horario,disabled:!!disabled});

export function createStaffService({users, clocks, holidays, records, messages, now=()=>new Date()}) {
  const provider = u => {if (u?.role !== 'provider' || !u.tenantId) throw new AuthError('Acesso de empresa necessário.',403); return u.tenantId};
  const employee = u => {if (u?.role !== 'staff' || !u.tenantId) throw new AuthError('Acesso de colaborador necessário.',403); return u.tenantId};
  async function getEmployee(tenant,id) {const v=await users.findOne({id,tenantId:tenant,role:'staff'}); if(!v)throw new AuthError('Colaborador não encontrado.',404);return v}
  return {
    async list(u){const tenantId=provider(u);return (await users.find({tenantId,role:'staff'}).sort({nome:1}).toArray()).map(publicStaff)},
    async create(u,input){const tenantId=provider(u);const email=normalizeEmail(input.email), nome=clean(input.nome);if(!nome)throw new TypeError('Indique o nome.');const passwordHash=await hashPassword(input.password);let doc={id:randomUUID(),tenantId,role:'staff',email,passwordHash,nome,morada:clean(input.morada,300),nif:clean(input.nif,30),horario:clean(input.horario,500),createdAt:now()};try{await users.insertOne(doc)}catch(e){if(e.code===11000)throw new AuthError('Este email já está em utilização.',409);throw e}return publicStaff(doc)},
    async update(u,id,input){const tenantId=provider(u);await getEmployee(tenantId,id);const nome=clean(input.nome);if(!nome)throw new TypeError('Indique o nome.');const values={nome,morada:clean(input.morada,300),nif:clean(input.nif,30),horario:clean(input.horario,500),disabled:!!input.disabled};if(input.password)values.passwordHash=await hashPassword(input.password);await users.updateOne({tenantId,id,role:'staff'},{$set:values,$inc:{sessionVersion:1}});return {ok:true}},
    async ownOccurrences(u){const tenantId=employee(u);return (await records.find({empresaId:tenantId,kind:'ocorrencias','data.colaboradores':u.id},{projection:{_id:0,id:1,data:1}}).toArray()).map(({id,data})=>({id,data:{titulo:data.titulo,cliente:data.cliente,morada:data.morada,tipo:data.tipo,data:data.data,hora:data.hora,prioridade:data.prioridade,estado:data.estado,notas:data.notas}}))},
    async ownClock(u){const tenantId=employee(u);const doc=await clocks.findOne({tenantId,userId:u.id,date:dateAzores(now())});return {date:dateAzores(now()),events:doc?.events||[],next:nextClockStep(doc?.events||[]),milliseconds:workedMilliseconds(doc?.events||[])}},
    async punch(u){const tenantId=employee(u),current=now(),date=dateAzores(current);let doc=await clocks.findOne({tenantId,userId:u.id,date});if(!doc){try{await clocks.insertOne({tenantId,userId:u.id,date,events:[]})}catch(e){if(e.code!==11000)throw e}doc=await clocks.findOne({tenantId,userId:u.id,date})}const type=nextClockStep(doc.events);if(!type)throw new AuthError('O ponto de hoje já está completo.',409);const event={type,at:current.toISOString()};const result=await clocks.updateOne({tenantId,userId:u.id,date,events:doc.events},{$push:{events:event}});if(!result.modifiedCount)throw new AuthError('O ponto foi alterado. Atualize e tente novamente.',409);return this.ownClock(u)},
    async hours(u,id){const tenantId=provider(u);await getEmployee(tenantId,id);const rows=await clocks.find({tenantId,userId:id},{projection:{_id:0,date:1,events:1}}).sort({date:-1}).limit(366).toArray();return rows.map(r=>({...r,milliseconds:workedMilliseconds(r.events)}))},
    async holidays(u,id){const tenantId=provider(u);await getEmployee(tenantId,id);return holidays.find({tenantId,userId:id},{projection:{_id:0}}).sort({start:-1}).toArray()},
    async addHoliday(u,id,v){const tenantId=provider(u);await getEmployee(tenantId,id);if(!/^\d{4}-\d{2}-\d{2}$/.test(v.start||'')||!/^\d{4}-\d{2}-\d{2}$/.test(v.end||'')||v.end<v.start||!['prevista','gozada'].includes(v.status))throw new TypeError('Período de férias inválido.');const doc={id:randomUUID(),tenantId,userId:id,start:v.start,end:v.end,status:v.status};await holidays.insertOne(doc);return {id:doc.id}},
    async removeHoliday(u,id,holidayId){const tenantId=provider(u);await getEmployee(tenantId,id);const r=await holidays.deleteOne({tenantId,userId:id,id:holidayId});if(!r.deletedCount)throw new AuthError('Férias não encontradas.',404);return {ok:true}}
    ,async conversation(u,id){const tenantId=u?.role==='provider'?provider(u):employee(u);if(u.role==='staff'&&id!==u.id)throw new AuthError('Acesso recusado.',403);await getEmployee(tenantId,id);return messages.find({tenantId,userId:id},{projection:{_id:0,id:1,text:1,sender:1,created:1}}).sort({created:1}).limit(500).toArray()}
    ,async sendMessage(u,id,input){const tenantId=u?.role==='provider'?provider(u):employee(u);if(u.role==='staff'&&id!==u.id)throw new AuthError('Acesso recusado.',403);await getEmployee(tenantId,id);const text=clean(input.text,2000);if(!text)throw new TypeError('Escreva uma mensagem.');const doc={id:randomUUID(),tenantId,userId:id,text,sender:u.role,created:now().toISOString()};await messages.insertOne(doc);return {ok:true}}
  };
}
