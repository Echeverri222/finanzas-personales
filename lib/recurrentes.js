/**
 * Calendar math for pagos_recurrentes, mirroring generar_recurrentes_del_mes
 * (M25) so what the UI promises is what the generator does.
 *
 * Every date here is a LOCAL yyyy-mm-dd string; those compare correctly as
 * plain strings, which keeps this free of Date/timezone traps.
 */

function pad(n) {
  return String(n).padStart(2, '0');
}

function ultimoDia(year, month1) {
  return new Date(year, month1, 0).getDate();
}

/** The date a rule fires in a given month: dia_mes, clamped to short months. */
export function fechaDelMes(diaMes, year, month1) {
  return `${year}-${pad(month1)}-${pad(Math.min(diaMes, ultimoDia(year, month1)))}`;
}

/** Scheduled dates from `hoy`'s month on, honoring generar_desde/hasta. */
function* calendario(regla, hoy, maxMeses = 600) {
  let [year, month1] = hoy.split('-').map(Number);
  for (let i = 0; i < maxMeses; i += 1) {
    const fecha = fechaDelMes(regla.dia_mes, year, month1);
    if (regla.generar_hasta && fecha > regla.generar_hasta) return;
    if (!regla.generar_desde || fecha >= regla.generar_desde) yield fecha;
    month1 += 1;
    if (month1 > 12) {
      month1 = 1;
      year += 1;
    }
  }
}

/**
 * Next date this rule will generate on, today included; null once it has
 * ended. Ignores `activo` -- callers decide how to show a paused rule.
 */
export function proximoCobro(regla, hoy) {
  for (const fecha of calendario(regla, hoy)) {
    if (fecha >= hoy) return fecha;
  }
  return null;
}

/** Charges still to come (today included), or null for a rule with no end. */
export function cobrosRestantes(regla, hoy) {
  if (!regla.generar_hasta) return null;
  let n = 0;
  for (const fecha of calendario(regla, hoy)) {
    if (fecha >= hoy) n += 1;
  }
  return n;
}

/** Monthly commitment of the ACTIVE rules, split by direction. */
export function totalesMensuales(reglas, esIngreso) {
  return (reglas || []).reduce(
    (acc, r) => {
      if (!r.activo) return acc;
      const v = Math.abs(Number(r.importe) || 0);
      if (esIngreso(r)) acc.ingresos += v;
      else acc.gastos += v;
      return acc;
    },
    { gastos: 0, ingresos: 0 },
  );
}
