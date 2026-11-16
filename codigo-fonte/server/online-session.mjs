/** Cliente da API de sessão. Apenas recebe metadados; o cookie HttpOnly fica no navegador. */
export function createOnlineSession(fetcher=fetch){
 async function request(path,{method='GET',body}={}){
  let response;try{response=await fetcher(path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined})}catch{throw new Error('Não foi possível contactar o servidor.')}
  if(!response.ok){let data;try{data=await response.json()}catch{}throw new Error(data?.error||'Não foi possível completar o pedido.')}
  return response.status===204?null:response.json();
 }
 return {
  register:async(email,password)=>request('/api/auth/register',{method:'POST',body:{email,password}}),
  login:async(email,password)=>request('/api/auth/login',{method:'POST',body:{email,password}}),
  current:async()=>request('/api/auth/me'),
  providers:async()=>request('/api/admin/providers'),
  companySummary:async(tenantId)=>request('/api/admin/company-summary/'+encodeURIComponent(tenantId)),
  setProviderDisabled:async(id,disabled)=>request('/api/admin/providers/status',{method:'POST',body:{id,disabled}}),
  logout:async()=>request('/api/auth/logout',{method:'POST'})
 };
}
