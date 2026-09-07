/**
 * El interruptor de Patrimonio, en un solo sitio.
 *
 * Lo leen el sidebar, el formulario de movimientos y las tres pantallas nuevas.
 * Vive aquí y no inline en cada uno para que "¿está activo?" tenga una única
 * respuesta: si el sidebar y el formulario discreparan, el usuario vería un
 * campo de cuenta en una app que dice no tener cuentas.
 *
 * `loading` importa tanto como `habilitado`. `userProfile` llega null en el
 * primer render, y tratar eso como "apagado" haría parpadear el menú en cada
 * carga.
 */
import { useUser } from '../contexts/UserContext';

export function usePatrimonioFlag() {
  const { userProfile, loading, updateProfile } = useUser();

  const habilitado = Boolean(userProfile?.patrimonio_habilitado);

  /**
   * Apagarlo NO borra nada: oculta las pantallas y el selector de cuenta, y
   * los datos vuelven intactos al reactivar. Un interruptor que destruye datos
   * no es un interruptor.
   *
   * Normaliza el `{ error }` de `updateProfile`, que devuelve un Error y no un
   * string como los hooks de datos.
   */
  const setHabilitado = async (valor) => {
    const { error } = await updateProfile({ patrimonio_habilitado: Boolean(valor) });
    return { error: error ? error.message || String(error) : null };
  };

  return { habilitado, loading, setHabilitado };
}
