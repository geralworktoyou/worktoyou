/** Primitivas para isolar registos por empresa. Requer autenticação validada pelo servidor. */
export class AccessError extends Error { constructor(message, status = 403) { super(message); this.status = status; } }
export function resolveTenant(principal, requestedTenant) {
  if (!principal || typeof principal.id !== 'string') throw new AccessError('Sessão necessária.', 401);
  if (principal.role === 'provider') {
    if (typeof principal.tenantId !== 'string' || !principal.tenantId) throw new AccessError('Conta sem empresa associada.');
    if (requestedTenant && requestedTenant !== principal.tenantId) throw new AccessError('Acesso a outra empresa recusado.');
    return principal.tenantId;
  }
  if (principal.role === 'admin') {
    if (typeof requestedTenant !== 'string' || !requestedTenant) throw new AccessError('Selecione uma empresa.');
    return requestedTenant;
  }
  throw new AccessError('Perfil sem acesso.');
}
/** Não permite que um filtro fornecido pelo cliente substitua o âmbito da empresa. */
export function scopeQuery(tenantId, query = {}) {
  if (typeof tenantId !== 'string' || !tenantId) throw new AccessError('Empresa em falta.');
  if (!query || typeof query !== 'object' || Array.isArray(query)) throw new TypeError('Filtro inválido.');
  return { $and: [{ empresaId: tenantId }, query] };
}
export function scopeNewRecord(tenantId, data) {
  if (typeof tenantId !== 'string' || !tenantId) throw new AccessError('Empresa em falta.');
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new TypeError('Registo inválido.');
  return { ...data, empresaId: tenantId };
}
