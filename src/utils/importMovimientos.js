import { supabase } from '../supabaseClient';

const movimientos = [
  { fecha: '2025-05-15', nombre: 'Monitoria', importe: 350000, tipo_movimiento: 'Ingresos' },
  { fecha: '2025-05-05', nombre: 'Recarga cívica', importe: 50000, tipo_movimiento: 'Transporte' },
  { fecha: '2025-05-19', nombre: 'Regalo mamá', importe: 70000, tipo_movimiento: 'Compras' },
  { fecha: '2025-05-12', nombre: 'Abono mamá', importe: 100000, tipo_movimiento: 'Otros' },
  { fecha: '2025-05-12', nombre: 'Nu', importe: 200000, tipo_movimiento: 'Ahorro' },
  { fecha: '2025-05-19', nombre: 'Salpicón', importe: 5000, tipo_movimiento: 'Alimentacion' },
  { fecha: '2025-05-22', nombre: 'Fruta', importe: 3000, tipo_movimiento: 'Alimentacion' },
  { fecha: '2025-05-23', nombre: 'Medicamentos', importe: 4700, tipo_movimiento: 'Otros' },
  { fecha: '2025-05-26', nombre: 'Crispetas', importe: 23500, tipo_movimiento: 'Salidas' },
  { fecha: '2025-05-27', nombre: 'Inscripción SOL', importe: 41500, tipo_movimiento: 'Compras' },
  { fecha: '2025-05-27', nombre: 'Mamá', importe: 30000, tipo_movimiento: 'Ingresos' },
  { fecha: '2025-05-28', nombre: 'Cívica y moto', importe: 35000, tipo_movimiento: 'Transporte' },
  { fecha: '2025-05-28', nombre: 'Empanada', importe: 5000, tipo_movimiento: 'Alimentacion' }
];

export const importarMovimientos = async (userId) => {
  try {
    const movimientosConUsuario = movimientos.map(mov => ({
      ...mov,
      usuario_id: userId,
      fecha: new Date(mov.fecha).toISOString()
    }));

    const { data, error } = await supabase
      .from('movimientos')
      .insert(movimientosConUsuario);

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error al importar movimientos:', error);
    return { success: false, error: error.message };
  }
}; 