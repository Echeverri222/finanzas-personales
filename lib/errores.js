/**
 * Turn a Supabase/Postgres error into a sentence a user can act on.
 *
 * Hooks used to return `err.message` verbatim, so the UI showed things like
 * `duplicate key value violates unique constraint "tags_usuario_id_nombre_key"`.
 * The original is still logged for debugging; only the user-facing text changes.
 *
 * @param {unknown} err - a PostgrestError, Error, or string
 * @param {{ duplicado?: string, enUso?: string, accion?: string }} [mensajes]
 *   `duplicado`: text for a unique violation ("Ya existe una etiqueta con ese nombre.")
 *   `enUso`: text for a foreign-key violation on delete
 *   `accion`: fallback verb phrase, e.g. "guardar la etiqueta"
 */
export function mensajeError(err, mensajes = {}) {
  if (!err) return null;
  const code = typeof err === 'object' ? err.code : undefined;
  const message = typeof err === 'string' ? err : err.message || '';

  if (typeof console !== 'undefined') console.error('[supabase]', err);

  switch (code) {
    case '23505':
      return mensajes.duplicado || 'Ya existe un registro con ese nombre.';
    case '23503':
      return mensajes.enUso || 'No se puede: hay otros registros que dependen de este.';
    case '23502':
      return 'Falta un dato obligatorio.';
    case '23514':
      return 'Algún valor no es válido.';
    case '42501':
      return 'No tienes permiso para hacer esto.';
    case 'PGRST116':
      return 'No encontramos ese registro. Recarga la página.';
    default:
      break;
  }
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
  }
  // Messages the app wrote itself (validation, "Meta no encontrada") are
  // already Spanish and safe to show; anything else from the database is not.
  if (!code && message && !/violates|constraint|relation|column|syntax|permission denied/i.test(message)) {
    return message;
  }
  return `No pudimos ${mensajes.accion || 'completar la operación'}. Intenta de nuevo.`;
}
