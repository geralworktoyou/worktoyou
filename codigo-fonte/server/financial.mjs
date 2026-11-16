import {randomUUID} from 'node:crypto';
import {resolveTenant,scopeQuery,AccessError} from './tenant-access.mjs';
const cents=n=>{const value=Number(n);if(!Number.isFinite(value)||value<0||Math.abs(value*100-Math.round(value*100))>1e-7)throw new TypeError('Valor monetário inválido.');return Math.round(value*100)};
export function validateInvoiceLinks(invoice,quote,occurrence){
 if(!invoice||typeof invoice.numero!=='string'||!invoice.numero.trim())throw new TypeError('Indique o número da fatura.');
 if(cents(invoice.valor)<=0)throw new TypeError('O valor da fatura deve ser positivo.');
 if(invoice.orcamentoId&&!quote)throw new TypeError('Orçamento não encontrado.');
 if(invoice.ocorrenciaId&&!occurrence)throw new TypeError('Ocorrência não encontrada.');
 if(quote?.data?.ocorrenciaId&&invoice.ocorrenciaId!==quote.data.ocorrenciaId)throw new TypeError('O orçamento e a ocorrência não correspondem.');
}
/** Toda a alteração é feita dentro de uma transação MongoDB. */
export function createPaymentService({client,records}){
 if(!client||!records)throw new Error('Serviço de pagamentos não configurado.');
 async function create(principal,tenantId,payment){const empresaId=resolveTenant(principal,tenantId);if(!payment||payment.origemTipo!=='faturas'||typeof payment.origemId!=='string'||!payment.origemId)throw new TypeError('Selecione uma fatura.');const amount=cents(payment.valor);if(amount<=0)throw new TypeError('Indique um valor positivo.');const session=client.startSession();try{return await session.withTransaction(async()=>{const opts={session};const invoice=await records.findOne(scopeQuery(empresaId,{id:payment.origemId,kind:'faturas'}),opts);if(!invoice)throw new AccessError('Fatura não encontrada.',404);const balance=cents(invoice.data.valor)-cents(invoice.data.totalPago||0);if(amount>balance)throw new TypeError('O pagamento excede o saldo da fatura.');const id=randomUUID(),data={...payment,valor:amount/100,origemTipo:'faturas'};await records.insertOne({id,empresaId,kind:'pagamentos',data,created:new Date().toISOString()},opts);await records.updateOne(scopeQuery(empresaId,{id:invoice.id,kind:'faturas'}),{$set:{'data.totalPago':(cents(invoice.data.totalPago||0)+amount)/100}},opts);return {id}})}finally{await session.endSession()}}
 return {create};
}
