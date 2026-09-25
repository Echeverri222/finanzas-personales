import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { NativeSelect as Select } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';

const TIPOS = [
  { value: 'ahorros', label: 'Cuenta de ahorros' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'inversion', label: 'Cuenta de inversión' },
  { value: 'activo', label: 'Activo' },
];

const VACIO = {
  tipo: 'ahorros',
  nombre: '',
  banco: '',
  saldo: '',
  valor_total: '',
  tiene_deuda: false,
  valor_deuda: '',
};

/**
 * Alta y edición de una cuenta.
 *
 * El formulario **cambia de forma según el tipo**, en vez de mostrar los diez
 * campos y dejar que el usuario adivine cuáles aplican. No es cosmético: los
 * CHECK de M20 prohíben que un activo lleve saldo o que una cuenta líquida
 * lleve deuda, así que un formulario plano ofrecería combinaciones que la base
 * de datos va a rechazar.
 */
export function CuentaForm({ cuenta, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cuenta) {
      setForm(VACIO);
      return;
    }
    setForm({
      tipo: cuenta.tipo,
      nombre: cuenta.nombre ?? '',
      banco: cuenta.banco ?? '',
      saldo: cuenta.saldo ?? '',
      valor_total: cuenta.valor_total ?? '',
      tiene_deuda: cuenta.tiene_deuda ?? false,
      valor_deuda: cuenta.valor_deuda ?? '',
    });
  }, [cuenta]);

  const set = (campo) => (e) => {
    const valor = e?.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setError('');
  };

  const esActivo = form.tipo === 'activo';
  const esAhorros = form.tipo === 'ahorros';
  const esInversion = form.tipo === 'inversion';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error: err } = await onSubmit(form);
    if (err) setError(err);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Tipo *" htmlFor="tipo">
          <Select id="tipo" name="tipo" value={form.tipo} onChange={set('tipo')} required>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Nombre *" htmlFor="nombre">
          <Input
            id="nombre"
            name="nombre"
            value={form.nombre}
            onChange={set('nombre')}
            placeholder={esActivo ? 'Ej. Apartamento' : 'Ej. Cuenta principal'}
            required
          />
        </Field>

        {/* El documento original lo pide explícitamente: si es cuenta de
            ahorros, hay que preguntar por el banco. En una de inversión el
            mismo campo nombra al broker, que es la pregunta equivalente. */}
        {(esAhorros || esInversion) && (
          <Field
            label={esAhorros ? 'Banco *' : 'Broker'}
            htmlFor="banco"
          >
            <Input
              id="banco"
              name="banco"
              value={form.banco}
              onChange={set('banco')}
              placeholder={esAhorros ? 'Ej. Bancolombia' : 'Ej. Interactive Brokers'}
              required={esAhorros}
            />
          </Field>
        )}

        {!esActivo && (
          <Field
            label={esInversion ? 'Efectivo disponible' : 'Saldo actual'}
            htmlFor="saldo"
          >
            <Input
              id="saldo"
              name="saldo"
              type="number"
              step="0.01"
              value={form.saldo}
              onChange={set('saldo')}
              placeholder="0"
            />
          </Field>
        )}

        {esActivo && (
          <Field label="Valor total *" htmlFor="valor_total">
            <Input
              id="valor_total"
              name="valor_total"
              type="number"
              step="0.01"
              value={form.valor_total}
              onChange={set('valor_total')}
              placeholder="0"
              required
            />
          </Field>
        )}
      </div>

      {esInversion && (
        <p className="text-sm text-muted-foreground">
          Este es el efectivo sin invertir del broker. Las acciones se agregan
          después como posiciones, y no todo lo que hay aquí tiene que venir de
          un movimiento.
        </p>
      )}

      {/* La deuda se activa o no: no siempre hay deuda sobre un activo. */}
      {esActivo && (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="tiene_deuda" className="text-sm font-medium">
              Tiene deuda asociada
            </label>
            <Switch
              id="tiene_deuda"
              checked={Boolean(form.tiene_deuda)}
              onCheckedChange={(v) => setForm((prev) => ({ ...prev, tiene_deuda: v }))}
            />
          </div>

          {form.tiene_deuda && (
            <Field label="Valor en deuda *" htmlFor="valor_deuda">
              <Input
                id="valor_deuda"
                name="valor_deuda"
                type="number"
                step="0.01"
                value={form.valor_deuda}
                onChange={set('valor_deuda')}
                placeholder="0"
                required
              />
            </Field>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : cuenta ? 'Guardar cambios' : 'Crear cuenta'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
