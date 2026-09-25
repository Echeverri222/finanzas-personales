import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Landmark, PiggyBank, Wallet, TrendingUp, Home, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { HeroCard, HeroBadge } from '@/components/layout/HeroCard';
import { StatCard } from '@/components/layout/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Amount } from '@/components/money/Amount';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { ListSkeleton } from '@/components/feedback/skeletons';
import { CuentaForm } from '@/components/patrimonio/CuentaForm';
import { usePatrimonio } from '../hooks/usePatrimonio';
import { useCuentas } from '../hooks/useCuentas';
import { usePatrimonioFlag } from '../hooks/usePatrimonioFlag';
import { valorCuenta } from '../lib/patrimonio';

const GRUPOS = [
  { tipo: 'ahorros', label: 'Cuentas de ahorros', icon: PiggyBank },
  { tipo: 'efectivo', label: 'Efectivo', icon: Wallet },
  { tipo: 'inversion', label: 'Cuentas de inversión', icon: TrendingUp },
  { tipo: 'activo', label: 'Activos', icon: Home },
];

export default function PatrimonioPage() {
  const router = useRouter();
  const { habilitado, loading: flagLoading } = usePatrimonioFlag();
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const { cuentas, posiciones, precios, tasas, total, desglose, sinConvertir, loading, error } =
    usePatrimonio({ guardarSnapshot: true });
  const { createCuenta } = useCuentas();

  const handleCrear = async (form) => {
    setGuardando(true);
    const res = await createCuenta(form);
    setGuardando(false);
    if (!res.error) setCreando(false);
    return res;
  };

  const descripcion = 'Cuentas, activos e inversiones: cuánto tienes, no solo en qué se te va.';

  if (flagLoading || loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Patrimonio" description={descripcion} />
        <ListSkeleton rows={4} />
      </div>
    );
  }

  // Con el flag apagado esta ruta no debería alcanzarse desde el menú, pero una
  // URL escrita a mano o un enlace viejo sí llegan aquí. Se manda a Ajustes en
  // vez de a un 404: el usuario pidió esta pantalla, solo le falta encenderla.
  if (!habilitado) {
    return (
      <div className="space-y-6">
        <PageHeader title="Patrimonio" description={descripcion} />
        <EmptyState
          icon={Landmark}
          title="Patrimonio está desactivado"
          description="Actívalo en Ajustes para empezar a registrar tus cuentas, activos e inversiones."
          action={
            <Button onClick={() => router.push('/configuracion')}>Ir a Ajustes</Button>
          }
        />
      </div>
    );
  }

  const cuentasPorTipo = (tipo) => cuentas.filter((c) => c.tipo === tipo);

  return (
    <div className="space-y-6">
      <PageHeader title="Patrimonio" description={descripcion}>
        {cuentas.length > 0 && !creando && (
          <Button onClick={() => setCreando(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Nueva cuenta
          </Button>
        )}
      </PageHeader>

      {error && <ErrorAlert error={error} />}

      <HeroCard
        label="Patrimonio neto"
        value={<Amount value={total} size="hero" />}
        badge={
          desglose.deuda > 0 ? (
            <HeroBadge>Deuda descontada</HeroBadge>
          ) : null
        }
      />

      {/* Un valor que no se pudo pasar a pesos se está sumando en su moneda
          original. Decirlo es preferible a inventar una tasa: el número que ve
          el usuario sería falso y no tendría cómo saberlo. */}
      {sinConvertir > 0 && (
        <ErrorAlert
          title="Falta la tasa de cambio"
          error={`${sinConvertir} ${
            sinConvertir === 1 ? 'posición está' : 'posiciones están'
          } en otra moneda y no se pudieron convertir a pesos. Actualiza los precios en Inversiones.`}
        />
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Ahorros" value={<Amount value={desglose.ahorros} />} icon={PiggyBank} tone="savings" />
        <StatCard label="Efectivo" value={<Amount value={desglose.efectivo} />} icon={Wallet} tone="neutral" />
        <StatCard label="Inversiones" value={<Amount value={desglose.inversion} />} icon={TrendingUp} tone="primary" />
        <StatCard
          label="Activos"
          value={<Amount value={desglose.activos - desglose.deuda} />}
          icon={Home}
          tone="income"
          hint={desglose.deuda > 0 ? <>Menos <Amount value={desglose.deuda} size="sm" /> de deuda</> : null}
        />
      </div>

      {creando && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva cuenta</CardTitle>
          </CardHeader>
          <CardContent>
            <CuentaForm
              onSubmit={handleCrear}
              onCancel={() => setCreando(false)}
              saving={guardando}
            />
          </CardContent>
        </Card>
      )}

      {cuentas.length === 0 && !creando ? (
        <EmptyState
          icon={Landmark}
          title="Todavía no tienes cuentas"
          description="Crea tu primera cuenta —de ahorros, efectivo, un activo o un broker— para ver tu patrimonio."
          action={<Button onClick={() => setCreando(true)}>Crear cuenta</Button>}
        />
      ) : (
        GRUPOS.map(({ tipo, label, icon: Icon }) => {
          const delTipo = cuentasPorTipo(tipo);
          if (delTipo.length === 0) return null;

          return (
            <Card key={tipo}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                {delTipo.map((cuenta) => (
                  <Link
                    key={cuenta.id}
                    href={`/patrimonio/cuentas/${cuenta.id}`}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{cuenta.nombre}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {cuenta.banco || label}
                        {cuenta.tiene_deuda && ' · con deuda'}
                        {!cuenta.activa && ' · inactiva'}
                      </p>
                    </div>
                    <Amount
                      value={valorCuenta(cuenta, posiciones, precios, tasas)}
                      className="shrink-0"
                    />
                  </Link>
                ))}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
