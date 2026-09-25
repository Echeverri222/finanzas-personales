import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { TrendingUp, RefreshCw, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Amount } from '@/components/money/Amount';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { ListSkeleton } from '@/components/feedback/skeletons';
import { PosicionForm } from '@/components/patrimonio/PosicionForm';
import { CerrarPosicionDialog } from '@/components/patrimonio/CerrarPosicionDialog';
import { usePatrimonio } from '../hooks/usePatrimonio';
import { usePosiciones } from '../hooks/usePosiciones';
import { usePatrimonioFlag } from '../hooks/usePatrimonioFlag';
import { useSyncPrecios } from '../hooks/useSyncPrecios';
import { resumenPorTicker, rentabilidadRealizada, rentabilidadNoRealizada } from '../lib/patrimonio';
import { formatDate, formatNumber } from '@/lib/format';

/** Ganancia con signo y color. El verde/rojo es la lectura de un vistazo. */
function Rendimiento({ ganancia, porcentaje, moneda }) {
  const positivo = ganancia >= 0;
  return (
    <span className={positivo ? 'text-emerald-600 dark:text-emerald-500' : 'text-destructive'}>
      {positivo ? '+' : '−'}
      {formatNumber(Math.abs(ganancia).toFixed(2))} {moneda}
      <span className="ml-1 text-xs opacity-80">
        ({positivo ? '+' : '−'}
        {Math.abs(porcentaje).toFixed(1)}%)
      </span>
    </span>
  );
}

export default function InversionesPage() {
  const router = useRouter();
  const { habilitado, loading: flagLoading } = usePatrimonioFlag();
  const { cuentas, precios, loading, error, refetch } = usePatrimonio();
  const { abiertas, cerradas, comprar, cerrar, refetch: refetchPos } = usePosiciones();
  const { sincronizar, sincronizando, resultado, errorSync } = useSyncPrecios();

  const [comprando, setComprando] = useState(false);
  const [cerrandoPos, setCerrandoPos] = useState(null);

  const cuentasInversion = cuentas.filter((c) => c.tipo === 'inversion');
  const resumen = useMemo(() => resumenPorTicker(abiertas, precios), [abiertas, precios]);

  // La fecha del cierre MÁS ANTIGUO en uso, no la más reciente. Las clases se
  // sincronizan por separado y no todas cierran el mismo día: cripto opera
  // 24/7, las acciones no. Anunciar la más reciente diría que todo está
  // valorado a hoy cuando la mitad viene de ayer -- y el error caería siempre
  // del lado optimista, que es el peor lado para un número de patrimonio.
  const fechaPrecios = useMemo(() => {
    const fechas = Object.values(precios).map((p) => p.fecha).filter(Boolean);
    return fechas.length ? fechas.sort()[0] : null;
  }, [precios]);

  const handleSync = async () => {
    await sincronizar();
    refetch();
  };

  const handleComprar = async (form) => {
    const res = await comprar(form);
    if (!res.error) setComprando(false);
    refetch();
    return res;
  };

  const handleCerrar = async (form) => {
    const res = await cerrar(form);
    if (!res.error) setCerrandoPos(null);
    refetch();
    return res;
  };

  const descripcion = 'Tus posiciones en todas las cuentas de inversión, abiertas y cerradas.';

  if (flagLoading || loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Inversiones" description={descripcion} />
        <ListSkeleton rows={4} />
      </div>
    );
  }

  if (!habilitado) {
    return (
      <div className="space-y-6">
        <PageHeader title="Inversiones" description={descripcion} />
        <EmptyState
          icon={TrendingUp}
          title="Patrimonio está desactivado"
          description="Actívalo en Ajustes para registrar tus inversiones."
          action={<Button onClick={() => router.push('/configuracion')}>Ir a Ajustes</Button>}
        />
      </div>
    );
  }

  if (cuentasInversion.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Inversiones" description={descripcion} />
        <EmptyState
          icon={TrendingUp}
          title="No tienes cuentas de inversión"
          description="Crea una cuenta de tipo inversión —tu broker— y luego añade las posiciones que tengas dentro."
          action={<Button onClick={() => router.push('/patrimonio')}>Ir a Patrimonio</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Inversiones" description={descripcion}>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={sincronizando}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${sincronizando ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {sincronizando ? 'Actualizando...' : 'Actualizar precios'}
          </Button>
          {!comprando && (
            <Button onClick={() => setComprando(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Nueva posición
            </Button>
          )}
        </div>
      </PageHeader>

      {error && <ErrorAlert error={error} />}
      {errorSync && <ErrorAlert title="No se pudieron actualizar los precios" error={errorSync} />}

      {resultado && (
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            {resultado.actualizados} de {resultado.solicitados} precios actualizados
            {resultado.noEncontrados?.length > 0 &&
              ` · sin datos para ${resultado.noEncontrados.join(', ')}`}
          </p>
          {/* Sin esto, "sin datos para X" no distingue entre un ticker que no
              existe y un proveedor que respondió 429, y son dos problemas con
              soluciones opuestas: corregir el símbolo o volver a intentarlo. */}
          {resultado.errores?.length > 0 &&
            resultado.errores.map((e) => (
              <p key={e} className="text-xs">
                {e}
              </p>
            ))}
        </div>
      )}

      {/* Nunca se oculta la antigüedad del precio. Un número de patrimonio sin
          fecha invita a creer que es de ahora mismo, y con este plan de API
          nunca lo es. */}
      {fechaPrecios && (
        <p className="text-sm text-muted-foreground">
          Valorado a cierre de mercado del {formatDate(fechaPrecios)}.
        </p>
      )}

      {comprando && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva posición</CardTitle>
          </CardHeader>
          <CardContent>
            <PosicionForm
              cuentas={cuentasInversion}
              onSubmit={handleComprar}
              onCancel={() => setComprando(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* ── 1. Resumen por ticker ─────────────────────────────────────────── */}
      {resumen.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen por activo</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {resumen.map((t) => (
              <div key={t.ticker} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {t.ticker}
                    {t.lotes > 1 && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {t.lotes} lotes
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(t.cantidad)} ·{' '}
                    {/* El promedio PONDERADO, no la media de los precios:
                        1 acción a 100 y 9 a 200 dan 190, no 150. */}
                    promedio {t.precioPromedio.toFixed(2)} {t.moneda}
                    {t.precioActual != null && ` · actual ${t.precioActual.toFixed(2)}`}
                    {t.estimado && ' · sin precio de mercado'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {formatNumber(t.valorMercado.toFixed(2))} {t.moneda}
                  </p>
                  <p className="text-xs">
                    <Rendimiento ganancia={t.ganancia} porcentaje={t.rendimiento} moneda={t.moneda} />
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── 2. Lotes abiertos ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Posiciones abiertas</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {abiertas.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Sin posiciones abiertas"
              description="Registra una compra para empezar a seguir su rendimiento."
            />
          ) : (
            // Uno a uno, no agregados: dos lotes del mismo ticker rinden
            // distinto, y ese es justamente el motivo de guardarlos separados.
            abiertas.map((p) => {
              const r = rentabilidadNoRealizada(p, precios);
              const cuenta = cuentas.find((c) => c.id === p.cuenta_id);
              return (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {p.ticker}{' '}
                      <span className="font-normal text-muted-foreground">
                        {formatNumber(p.cantidad)} @ {Number(p.precio_compra).toFixed(2)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(p.fecha_compra)}
                      {cuenta && ` · ${cuenta.nombre}`}
                      {r.estimado && ' · sin precio de mercado'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-xs">
                      <Rendimiento ganancia={r.ganancia} porcentaje={r.rendimiento} moneda={p.moneda} />
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setCerrandoPos(p)}>
                      Vender
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ── 3. Historial de cerradas ──────────────────────────────────────── */}
      {cerradas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de posiciones cerradas</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {cerradas.map((p) => {
              const r = rentabilidadRealizada(p);
              if (!r) return null;
              return (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {p.ticker}{' '}
                      <span className="font-normal text-muted-foreground">
                        {formatNumber(p.cantidad)} · {Number(p.precio_compra).toFixed(2)} →{' '}
                        {Number(p.precio_venta).toFixed(2)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(p.fecha_compra)} → {formatDate(p.fecha_venta)}
                      {r.dias != null && ` · ${r.dias} días`}
                      {p.lote_origen_id && ' · venta parcial'}
                    </p>
                  </div>
                  <p className="text-xs">
                    <Rendimiento ganancia={r.ganancia} porcentaje={r.rendimiento} moneda={p.moneda} />
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {cerrandoPos && (
        <CerrarPosicionDialog
          posicion={cerrandoPos}
          precios={precios}
          onSubmit={handleCerrar}
          onCancel={() => setCerrandoPos(null)}
        />
      )}
    </div>
  );
}
