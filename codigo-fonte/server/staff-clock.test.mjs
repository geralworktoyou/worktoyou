import test from 'node:test';
import assert from 'node:assert/strict';
import {nextClockStep, workedMilliseconds} from './staff-clock.mjs';

test('sequência de ponto e cálculo excluem o intervalo de almoço', () => {
  const events = [
    {type:'entrada', at:'2026-11-17T09:00:00Z'},
    {type:'saida_almoco', at:'2026-11-17T12:00:00Z'},
    {type:'regresso_almoco', at:'2026-11-17T13:00:00Z'},
    {type:'saida', at:'2026-11-17T18:00:00Z'}
  ];
  assert.equal(nextClockStep([]), 'entrada');
  assert.equal(nextClockStep(events.slice(0, 2)), 'regresso_almoco');
  assert.equal(nextClockStep(events), null);
  assert.equal(workedMilliseconds(events), 8 * 60 * 60 * 1000);
  assert.equal(workedMilliseconds(events.slice(0, 3)), 3 * 60 * 60 * 1000);
});

test('rejeita eventos fora de ordem ou com horas inválidas', () => {
  assert.throws(() => nextClockStep([{type:'saida', at:'2026-11-17T09:00:00Z'}]));
  assert.throws(() => nextClockStep([{type:'entrada', at:'inválido'}]));
  assert.throws(() => nextClockStep([{type:'entrada', at:'2026-11-17T09:00:00Z'}, {type:'saida_almoco', at:'2026-11-17T08:00:00Z'}]));
});
