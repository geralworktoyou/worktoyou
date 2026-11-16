// Totais em cêntimos. Inclui apenas pagamentos efetivamente ligados a uma fatura existente.
export function invoiceReceipts(rows, start='', end='') {
 const invoices=new Map(rows.filter(r=>r.kind==='faturas').map(r=>[r.id,r]));
 const entries=rows.filter(p=>p.kind==='pagamentos'&&p.data.origemTipo==='faturas'&&invoices.has(p.data.origemId)).filter(p=>{
  if(!start&&!end)return true;
  const date=String(p.data.data||'');
  return /^\d{4}-\d{2}-\d{2}$/.test(date)&&(!start||date>=start)&&(!end||date<=end);
 }).map(p=>({id:p.id,date:p.data.data||'',invoice:invoices.get(p.data.origemId),valueCents:Math.round((Number(p.data.valor)||0)*100),notes:p.data.notas||''}));
 return {entries,totalCents:entries.reduce((sum,p)=>sum+p.valueCents,0)};
}
