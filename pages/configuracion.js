import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ListSkeleton } from '@/components/feedback/skeletons';
import { usePatrimonioFlag } from '../hooks/usePatrimonioFlag';
import { CURRENCY } from '@/lib/constants';

export default function ConfiguracionPage() {
  const { habilitado, loading, setHabilitado } = usePatrimonioFlag();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const handleToggle = async (valor) => {
    setGuardando(true);
    setError('');
    const { error: err } = await setHabilitado(valor);
    if (err) setError(err);
    setGuardando(false);
  };

  const descripcion = 'Ajustes de la aplicación.';

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Ajustes" description={descripcion} />
        <ListSkeleton rows={2} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes" description={descripcion} />

      <Card>
        <CardHeader>
          <CardTitle>Funciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Wallet className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <label htmlFor="patrimonio" className="text-sm font-medium">
                  Patrimonio
                </label>
                <p className="text-sm text-muted-foreground">
                  Lleva tus cuentas, activos e inversiones para ver cuánto tienes,
                  no solo en qué se te va la plata. Puedes marcar un gasto o un
                  ingreso para que descuente de una cuenta concreta.
                </p>
                {/* Lo primero que un usuario se pregunta antes de tocar un
                    interruptor es qué pierde si lo apaga. Decirlo aquí evita
                    que la respuesta sea "probémoslo a ver". */}
                <p className="text-sm text-muted-foreground">
                  Apagarlo solo oculta las pantallas: tus cuentas y posiciones se
                  conservan y vuelven tal cual al reactivarlo.
                </p>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>
            </div>

            <Switch
              id="patrimonio"
              checked={habilitado}
              disabled={guardando}
              onCheckedChange={handleToggle}
              aria-label="Activar patrimonio"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Moneda</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Solo lectura por ahora. `usuarios.currency` existe desde M11 y
              `lib/format.js` ya la acepta como argumento, pero ninguna pantalla
              se la pasa todavía: hacer editable el campo sin recorrer esos call
              sites cambiaría el símbolo y dejaría los importes sin convertir. */}
          <p className="text-sm text-muted-foreground">
            Tus importes se muestran en{' '}
            <span className="font-medium text-foreground">{CURRENCY.CURRENCY}</span>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
