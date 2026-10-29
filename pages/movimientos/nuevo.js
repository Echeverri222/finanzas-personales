import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useTiposMovimiento } from '../../hooks/useTiposMovimiento';
import { useMovimientos } from '../../hooks/useMovimientos';
import { useTags } from '../../hooks/useTags';
import { useMovimientoTags } from '../../hooks/useMovimientoTags';
import { useCuentas } from '../../hooks/useCuentas';
import { usePatrimonioFlag } from '../../hooks/usePatrimonioFlag';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MovimientoFields } from '@/components/movimientos/MovimientoFields';
import { todayISO } from '@/lib/format';
import { TIPO } from '@/lib/constants';

const vacio = () => ({
  fecha: todayISO(),
  nombre: '',
  importe: '',
  id_tipo_movimiento: '',
  cuenta_id: '',
  sale_de_ahorros: false,
  tagIds: [],
});

/** `?tipo=ahorros` (the "Ahorrar más" button) preselects the savings category. */
const TIPO_POR_PARAM = { ahorros: TIPO.AHORRO, ingreso: TIPO.INGRESO, gasto: TIPO.GASTO };

export default function NuevoMovimientoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(vacio);
  const [errors, setErrors] = useState({});

  const { tiposMovimiento, loading: tiposLoading, error: tiposError } = useTiposMovimiento();
  const { createMovimiento } = useMovimientos();
  const { tags } = useTags();
  const { setMovimientoTags } = useMovimientoTags();
  const { habilitado: patrimonioHabilitado } = usePatrimonioFlag();
  const { cuentas } = useCuentas();

  // Applied once, when both the query and the categories are in -- and never
  // again, so it cannot overwrite a category the user then picks by hand.
  const preseleccionado = useRef(false);
  useEffect(() => {
    if (preseleccionado.current || !router.isReady || tiposLoading) return;
    preseleccionado.current = true;
    const tipo = TIPO_POR_PARAM[router.query.tipo];
    const categoria = tipo && tiposMovimiento.find((t) => t.tipo === tipo);
    if (categoria) setFormData((prev) => ({ ...prev, id_tipo_movimiento: categoria.id }));
  }, [router.isReady, router.query.tipo, tiposLoading, tiposMovimiento]);

  const limpiarError = (campo) => {
    if (errors[campo]) setErrors((prev) => ({ ...prev, [campo]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fecha) newErrors.fecha = 'La fecha es requerida';
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!formData.importe || Number(formData.importe) <= 0) {
      newErrors.importe = 'Escribe un importe mayor que cero';
    }
    if (!formData.id_tipo_movimiento) newErrors.id_tipo_movimiento = 'La categoría es requerida';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const [year, month, day] = formData.fecha.split('-').map(Number);
      const fecha = new Date(Date.UTC(year, month - 1, day));
      const movimientoData = {
        fecha: fecha.toISOString(),
        nombre: formData.nombre.trim(),
        importe: Number(formData.importe),
        id_tipo_movimiento: formData.id_tipo_movimiento,
        sale_de_ahorros: formData.sale_de_ahorros,
        // Only sent when set. A movimiento WITHOUT an account is valid and moves
        // no balance -- the whole history is in that state.
        ...(formData.cuenta_id ? { cuenta_id: formData.cuenta_id } : {}),
      };
      const { data: created, error } = await createMovimiento(movimientoData);
      if (error) throw new Error(error);
      if (created?.id && formData.tagIds?.length) {
        await setMovimientoTags(created.id, formData.tagIds);
      }
      router.push('/movimientos');
    } catch (error) {
      setErrors({ submit: error.message || 'Error al crear el movimiento' });
    } finally {
      setLoading(false);
    }
  };

  if (tiposLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-muted-foreground">Cargando formulario...</div>
      </div>
    );
  }

  if (tiposError) {
    return (
      <div className="rounded-lg border-l-4 border-destructive bg-destructive/10 p-4 text-destructive">
        Error: {tiposError}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/movimientos" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="size-4" />
          Volver
        </Link>
        <PageHeader title="Nuevo movimiento" description="Registra un nuevo ingreso, gasto o ahorro." />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del movimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.submit && (
              <div role="alert" className="rounded-lg border-l-4 border-destructive bg-destructive/10 p-4 text-destructive">
                <p className="font-semibold">Error</p>
                <p>{errors.submit}</p>
              </div>
            )}

            <MovimientoFields
              data={formData}
              setData={setFormData}
              errors={errors}
              onFieldEdited={limpiarError}
              tiposMovimiento={tiposMovimiento}
              cuentas={cuentas}
              patrimonioHabilitado={patrimonioHabilitado}
              tags={tags}
              idPrefix="nuevo"
            />

            <div className="flex flex-col justify-end gap-3 pt-2 md:flex-row">
              {/* Cancel leaves; it used to silently reset the form and stay. */}
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar movimiento'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
