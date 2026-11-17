// Regras de cálculo puras; os instantes devem ser obtidos no servidor.
export const CLOCK_STEPS = ['entrada', 'saida_almoco', 'regresso_almoco', 'saida'];

export function nextClockStep(events) {
  if (!Array.isArray(events) || events.length > CLOCK_STEPS.length) throw new TypeError('Registo de ponto inválido.');
  let previous = -Infinity;
  for (let i = 0; i < events.length; i++) {
    const instant = Date.parse(events[i]?.at);
    if (events[i]?.type !== CLOCK_STEPS[i] || !Number.isFinite(instant) || instant < previous) throw new TypeError('Sequência de ponto inválida.');
    previous = instant;
  }
  return CLOCK_STEPS[events.length] ?? null;
}

export function workedMilliseconds(events) {
  nextClockStep(events);
  const interval = (start, end) => events[start] && events[end] ? Date.parse(events[end].at) - Date.parse(events[start].at) : 0;
  return interval(0, 1) + interval(2, 3);
}
