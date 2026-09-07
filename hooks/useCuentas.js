/**
 * Cuentas de patrimonio (M20).
 *
 * Dos cosas que este hook hace y los demás no:
 *
 * 1. **Coerce de `numeric`.** Postgres devuelve `numeric` como string, y este
 *    hook es el primero cuyos números se suman entre sí para producir el
 *    patrimonio neto. Sin el `Number()`, `saldo + valor_total` concatena en vez
 *    de sumar y el total sale absurdo sin lanzar ningún error.
 *
 * 2. **Normaliza la forma por tipo antes de escribir.** Los CHECK de M20 son
 *    estrictos a propósito (un activo no lleva saldo, una cuenta líquida no
 *    lleva deuda), así que un formulario que arrastre el campo de otro tipo
 *    recibiría un 23514 críptico. `normalizarPorTipo` recorta la fila a lo que
 *    su tipo admite, y el error que quede es uno real.
 */
import useSWR from 'swr';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { userKey } from '../lib/swr';

const SELECT = `
  id, usuario_id, tipo, nombre, banco, saldo,
  valor_total, tiene_deuda, valor_deuda,
  moneda, activa, notas, created_at, updated_at
`;

/**
 * La tabla no existe hasta que M20 se aplica. En un entorno donde el código ya
 * está desplegado pero la migración todavía no —staging entre un push y un
 * `db push`, por ejemplo— eso no es un error que mostrarle a nadie: con el flag
 * apagado la feature no se usa igualmente. Mismo criterio que `useTags`.
 */
function isMissingTable(error) {
  return error.code === '42P01' || error.message?.includes('does not exist');
}

/** Postgres `numeric` llega como string. Ver la nota de arriba. */
function decode(row) {
  return {
    ...row,
    saldo: Number(row.saldo ?? 0),
    valor_total: row.valor_total == null ? null : Number(row.valor_total),
    valor_deuda: row.valor_deuda == null ? null : Number(row.valor_deuda),
  };
}

/**
 * Recorta la fila a la forma que su `tipo` admite, para que los CHECK de M20
 * nunca se disparen por campos residuales de un formulario.
 *
 * Un activo NO lleva saldo: su valor vive en `valor_total`. Una cuenta líquida
 * NO lleva ni valor_total ni deuda. Y `valor_deuda` solo existe si
 * `tiene_deuda` -- la deuda de un activo se puede activar o no, porque no
 * siempre hay deuda sobre un activo.
 */
function normalizarPorTipo(campos) {
  const tipo = campos.tipo;
  const base = {
    tipo,
    nombre: (campos.nombre || '').trim(),
    banco: campos.banco?.trim() || null,
    moneda: campos.moneda || 'COP',
    notas: campos.notas?.trim() || null,
  };
  if (campos.activa !== undefined) base.activa = campos.activa;

  if (tipo === 'activo') {
    const tieneDeuda = Boolean(campos.tiene_deuda);
    return {
      ...base,
      saldo: 0,
      valor_total: Number(campos.valor_total ?? 0),
      tiene_deuda: tieneDeuda,
      valor_deuda: tieneDeuda ? Number(campos.valor_deuda ?? 0) : null,
    };
  }

  return {
    ...base,
    saldo: Number(campos.saldo ?? 0),
    valor_total: null,
    tiene_deuda: false,
    valor_deuda: null,
  };
}

/** Valida lo que los CHECK van a exigir, pero con un mensaje que se entiende. */
function validar(campos) {
  if (!campos.tipo) return 'Tipo requerido';
  if (!(campos.nombre || '').trim()) return 'Nombre requerido';
  if (campos.tipo === 'ahorros' && !(campos.banco || '').trim()) {
    return 'El banco es requerido para una cuenta de ahorros';
  }
  if (campos.tipo === 'activo') {
    const valor = Number(campos.valor_total);
    if (!Number.isFinite(valor) || valor < 0) return 'Valor total inválido';
    if (campos.tiene_deuda) {
      const deuda = Number(campos.valor_deuda);
      if (!Number.isFinite(deuda) || deuda < 0) return 'Valor de la deuda inválido';
    }
  } else if (campos.saldo !== undefined && campos.saldo !== '') {
    if (!Number.isFinite(Number(campos.saldo))) return 'Saldo inválido';
  }
  return null;
}

async function fetchCuentas([, usuarioId]) {
  const { data, error } = await supabase
    .from('cuentas')
    .select(SELECT)
    .eq('usuario_id', usuarioId)
    .order('tipo', { ascending: true })
    .order('nombre', { ascending: true });

  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(error.message);
  }
  return (data || []).map(decode);
}

export function useCuentas() {
  const { userProfile, loading: userLoading } = useUser();
  const usuarioId = userProfile?.id ?? null;

  const { data, error, isLoading, mutate } = useSWR(
    userKey('cuentas', usuarioId),
    fetchCuentas
  );

  const cuentas = data ?? [];
  const orden = (a, b) =>
    a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre);

  const createCuenta = async (campos) => {
    if (!usuarioId) return { error: 'No user profile' };
    const invalido = validar(campos);
    if (invalido) return { error: invalido };
    try {
      const { data: row, error: e } = await supabase
        .from('cuentas')
        .insert([{ usuario_id: usuarioId, ...normalizarPorTipo(campos) }])
        .select(SELECT)
        .single();
      if (e) throw e;
      const creada = decode(row);
      await mutate(
        (prev = []) => [...prev.filter((c) => c.id !== creada.id), creada].sort(orden),
        { revalidate: false }
      );
      return { data: creada, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const updateCuenta = async (id, campos) => {
    if (!usuarioId) return { error: 'No user profile' };
    const invalido = validar(campos);
    if (invalido) return { error: invalido };
    try {
      const { data: row, error: e } = await supabase
        .from('cuentas')
        .update(normalizarPorTipo(campos))
        .eq('id', id)
        .eq('usuario_id', usuarioId)
        .select(SELECT)
        .single();
      if (e) throw e;
      const actualizada = decode(row);
      // Re-ordenada, no solo reemplazada: cambiar el nombre o el tipo la mueve
      // de sitio en la lista.
      await mutate(
        (prev = []) => prev.map((c) => (c.id === id ? actualizada : c)).sort(orden),
        { revalidate: false }
      );
      return { data: actualizada, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const deleteCuenta = async (id) => {
    if (!usuarioId) return { error: 'No user profile' };
    try {
      const { error: e } = await supabase
        .from('cuentas')
        .delete()
        .eq('id', id)
        .eq('usuario_id', usuarioId);
      if (e) throw e;
      await mutate((prev = []) => prev.filter((c) => c.id !== id), { revalidate: false });
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  return {
    cuentas,
    loading: userLoading || isLoading,
    error: error ? error.message : null,
    createCuenta,
    updateCuenta,
    deleteCuenta,
    refetch: () => mutate(),
  };
}
