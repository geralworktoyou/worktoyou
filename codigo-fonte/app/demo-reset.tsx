'use client';
import {useEffect,useState} from 'react';
export default function DemoReset({load}:{load:()=>Promise<void>}){
 const [state,Set]=useState<any>(null),[msg,Msg]=useState(''),[busy,Busy]=useState(false);
 async function refresh(){try{let r=await fetch('/api/example-reset');if(r.ok)Set(await r.json())}catch{Msg('Não foi possível verificar o arquivo.')}}
 useEffect(()=>{refresh()},[]);
 async function reset(){Busy(true);Msg('');try{let r=await fetch('/api/example-reset',{method:'POST'});if(!r.ok)throw Error(await r.text());let v:any=await r.json();await load();await refresh();Msg(v.already?'Os exemplos já tinham sido carregados.':'Dados anteriores arquivados e três exemplos criados.')}catch(e:any){Msg(e.message||'Não foi possível preparar os exemplos.')}finally{Busy(false)}}
 async function restore(){if(!confirm('Restaurar os dados arquivados para a lista atual? Os exemplos atuais serão mantidos.'))return;Busy(true);Msg('');try{let r=await fetch('/api/example-reset',{method:'PUT'});if(!r.ok)throw Error(await r.text());let v:any=await r.json();await load();await refresh();Msg(`${v.restored} registo(s) restaurado(s).`)}catch(e:any){Msg(e.message||'Não foi possível restaurar.')}finally{Busy(false)}}
 return <section className="panel report" style={{marginTop:18}}><h2>Dados de teste</h2><p>Preparação única: arquiva os dados anteriores e carrega três exemplos fictícios. O arquivo mantém os documentos e pode ser restaurado aqui.</p>{state&&!state.completed&&<button className="primary" disabled={busy} onClick={reset}>Limpar e carregar três exemplos</button>}{state?.completed&&<p>Os três exemplos já foram preparados.</p>}{state?.archived>0&&<button className="secondary" disabled={busy} onClick={restore}>Restaurar dados arquivados</button>}{msg&&<p role="status">{msg}</p>}</section>
}
