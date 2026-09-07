import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { HeroCard } from '@/components/layout/HeroCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Amount } from '@/components/money/Amount';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { ListSkeleton } from '@/components/feedback/skeletons';
import { CuentaForm } from '@/components/patrimonio/CuentaForm';
import { useCuentas } from '../../../hooks/useCuentas';
import { usePatrimonio } from '../../../hooks/usePatrimonio';
import { useMovimientos } from '../../../hooks/useMovimientos';
import { useOperaciones } from '../../../hooks/useOperaciones';
import { valorCuenta, desgloseInversion, rentabilidadNoRealizada } from '../../../lib/patrimonio';
import { formatDate, formatNumber } from '@/lib/format';

const ETIQUETA_TIPO = {
  ahorros: 'Cuenta de ahorros',
  efectivo: 'Efectivo',
  inversion: 'Cuenta de inversión',
  activo: 'Activo',
};

export default function CuentaDetallePage() {
  const router = useRouter();
  const { id } = router.query;

  const { cuentas, posiciones, precios, tasas, loading, error } = usePatrimonio();
  const { updateCuenta, deleteCuenta } = useCuentas();
  const { movimientos } = useMovimientos();
  const { operaciones, ajustarSaldo } = useOperaciones(id);

  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nuevoSaldo, setNuevoSaldo] = useState('');
  const [errorAjuste, setErrorAjuste] = useState('');

  const cuenta = cuentas.find((c) => c.id === id);

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Cuenta" />
        <ListSkeleton rows={4} />
      </div>
    );
  }

  if (!cuenta) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cuenta" />
        <EmptyState
          title="Cuenta no encontrada"
          description="Puede que la hayas eliminado."
          action={<Button onClick={() => router.push('/patrimonio')}>Volver a Patrimonio</Button>}
        />
      </div>
    );
  }

  const esActivo = cuenta.tipo === 'activo';
  const esInversion = cuenta.tipo === 'inversion';
  const movimientosDeCuenta = movimientos.filter((m) => m.cuenta_id === cuenta.id);
  const posicionesDeCuenta = posiciones.filter((p) => p.cuenta_id === cuenta.id);
  const desglose = desgloseInversion(cuenta, posiciones, precios, tasas);

  const handleGuardar = async (form) => {
    setGuardando(true);
    const res = await updateCuenta(cuenta.id, form);
    setGuardando(false);
    if (!res.error) setEditando(false);
    return res;
  };

  const handleEliminar = async () => {
    if (
      !confirm(
        `¿Eliminar "${cuenta.nombre}"? Los movimientos asociados se conservan, pero dejarán de estar ligados a esta cuenta.`
      )
    ) {
      return;
    }
    const { error: err } = await deleteCuenta(cuenta.id);
    if (!err) router.push('/patrimonio');
  };

  const handleAjuste = async (e) => {
    e.preventDefault();
    setErrorAjuste('');
    const { error: err } = await ajustarSaldo(cuenta.id, nuevoSaldo);
    if (err) setErrorAjuste(err);
    else setNuevoSaldo('');
  };

  return (
    <div className="space-y-6">
      <Link
        href="/patrimonio"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Patrimonio
      </Link>

      <PageHeader
        title={cuenta.nombre}
        description={`${ETIQUETA_TIPO[cuenta.tipo]}${cuenta.banco ? ` · ${cuenta.banco}` : ''}`}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditando((v) => !v)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            Editar
          </Button>
          <Button variant="outline" onClick={handleEliminar} aria-label={`Eliminar ${cuenta.nombre}`}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </PageHeader>

      {error && <ErrorAlert error={error} />}

      <HeroCard
        label={esActivo ? 'Valor neto' : 'Valor total'}
        value={<Amount value={valorCuenta(cuenta, posiciones, precios, tasas)} size="hero" />}
      />

      {/* De qué se compone el total. Sin esto el número es imposible de
          cuadrar: comprar descuenta el costo del efectivo, así que un aporte
          al broker sin registrar deja el saldo en negativo y restándose del
          valor de las acciones. El total es correcto y aun así parece un
          error. */}
      {esInversion && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Efectivo sin invertir</p>
                <Amount value={desglose.efectivo} size="lg" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Valor de las posiciones</p>
                <Amount value={desglose.invertido} size="lg" />
              </CardContent>
            </Card>
          </div>

          {desglose.efectivo < 0 && (
            <ErrorAlert
              title="El efectivo de esta cuenta está en negativo"
              error={
                `Las compras descontaron más de lo que hay registrado como saldo, así que ese ` +
                `saldo se está restando del valor de tus posiciones. Suele significar que falta ` +
                `registrar lo que depositaste en el broker: ajusta el efectivo abajo al valor que ` +
                `realmente tienes sin invertir.`
              }
            />
          )}
        </>
      )}

      {esActivo && cuenta.tiene_deuda && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Valor del activo</p>
              <Amount value={cuenta.valor_total} size="lg" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Deuda pendiente</p>
              <Amount value={cuenta.valor_deuda} size="lg" />
            </CardContent>
          </Card>
        </div>
      )}

      {editando && (
        <Card>
          <CardHeader>
            <CardTitle>Editar cuenta</CardTitle>
          </CardHeader>
          <CardContent>
            <CuentaForm
              cuenta={cuenta}
              onSubmit={handleGuardar}
              onCancel={() => setEditando(false)}
              saving={guardando}
            />
          </CardContent>
        </Card>
      )}

      {/* El efectivo de una cuenta es AUTÓNOMO: entra por el saldo inicial, por
          ventas, dividendos, intereses y ajustes, no solo por movimientos. Este
          formulario es cómo el usuario dice "el banco marca otra cosa" sin
          tener que inventarse un movimiento de flujo que falsearía su
          dashboard. */}
      {!esActivo && (
        <Card>
          <CardHeader>
            <CardTitle>Ajustar efectivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={handleAjuste} className="flex flex-wrap gap-2">
              <Input
                type="number"
                step="0.01"
                value={nuevoSaldo}
                onChange={(e) => setNuevoSaldo(e.target.value)}
                placeholder={String(cuenta.saldo)}
                className="max-w-xs flex-1"
                aria-label="Nuevo saldo"
                required
              />
              <Button type="submit">Ajustar</Button>
            </form>
            <p className="text-xs text-muted-foreground">
              Actual: <Amount value={cuenta.saldo} size="sm" />. La diferencia queda
              registrada abajo y no toca tu dashboard.
            </p>
            {errorAjuste && (
              <p role="alert" className="text-sm text-destructive">
                {errorAjuste}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {esInversion && posicionesDeCuenta.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Posiciones</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {posicionesDeCuenta.map((p) => {
              const r = rentabilidadNoRealizada(p, precios);
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {p.ticker}{' '}
                      <span className="font-normal text-muted-foreground">
                        {formatNumber(p.cantidad)} @ {Number(p.precio_compra).toFixed(2)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(p.fecha_compra)} ·{' '}
                      {p.estado === 'abierta' ? 'abierta' : `cerrada ${formatDate(p.fecha_venta)}`}
                    </p>
                  </div>
                  {p.estado === 'abierta' && (
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(r.actual.toFixed(2))} {p.moneda}
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {!esActivo && (
        <Card>
          <CardHeader>
            <CardTitle>Movimientos asociados</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {movimientosDeCuenta.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Ningún movimiento se causa contra esta cuenta todavía. Puedes marcar
                uno al crearlo — y no hace falta: el saldo de arriba es válido por sí
                solo.
              </p>
            ) : (
              movimientosDeCuenta.slice(0, 20).map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(m.fecha)} · {m.tipo_nombre}
                    </p>
                  </div>
                  <Amount value={m.importe} tipo={m.tipo_categoria} signed toned />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {operaciones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Operaciones internas</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {operaciones.map((op) => (
              <div key={op.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize">{op.tipo}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(op.fecha)}
                    {op.nota ? ` · ${op.nota}` : ''}
                  </p>
                </div>
                <span
                  className={
                    op.monto >= 0
                      ? 'text-sm text-emerald-600 dark:text-emerald-500'
                      : 'text-sm text-destructive'
                  }
                >
                  {op.monto >= 0 ? '+' : '−'}
                  {formatNumber(Math.abs(op.monto).toFixed(2))}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
