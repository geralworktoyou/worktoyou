import test from 'node:test';import assert from 'node:assert/strict';
import {resolveTenant,scopeQuery,scopeNewRecord} from './tenant-access.mjs';
test('prestador mantém-se na própria empresa',()=>{let u={id:'u',role:'provider',tenantId:'a'};assert.equal(resolveTenant(u),'a');assert.throws(()=>resolveTenant(u,'b'));assert.throws(()=>resolveTenant({id:'u',role:'provider'}));});
test('administrador tem de selecionar explicitamente uma empresa',()=>{let u={id:'admin',role:'admin'};assert.throws(()=>resolveTenant(u));assert.equal(resolveTenant(u,'b'),'b');assert.throws(()=>resolveTenant(null,'b'));assert.throws(()=>resolveTenant({id:'u',role:'other'},'a'));});
test('filtros ou corpo não conseguem substituir a empresa',()=>{assert.deepEqual(scopeQuery('a',{empresaId:'b'}),{$and:[{empresaId:'a'},{empresaId:'b'}]});assert.equal(scopeNewRecord('a',{empresaId:'b',titulo:'x'}).empresaId,'a');assert.throws(()=>scopeQuery('',{}));});
