import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { NativeSelect as Select } from '@/components/ui/native-select';
import { todayISO } from '@/lib/format';

/**
 * Las clases que Massive sirve, con el prefijo que usa cada una.
 *
 * El prefijo NO es cosmético: el ticker se guarda ya en forma Massive
 * (`VOO`, `X:BTCUSD`, `C:USDCOP`) porque es lo que la sincronización busca en
 * la respuesta *grouped*. Guardar "BTC" a secas dejaría esa posición sin precio
 * para siempre, en silencio.
 */
const CLASES = [
  { value: 'stocks', label: 'Acción o ETF', prefijo: '', ejemplo: 'VOO' },
  { value: 'crypto', label: 'Cripto', prefijo: 'X:', ejemplo: 'BTCUSD' },
];

const VACIO = {
  cuentaId: '',
  clase: 'stocks',
  ticker: '',
  nombre: '',
  cantidad: '',
  precio: '',
  fecha: todayISO(),
  moneda: 'USD',
};

export function PosicionForm({ cuentas, onSubmit, onCancel }) {
  const [form, setForm] = useState({ ...VACIO, cuentaId: cuentas[0]?.id ?? '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const clase = CLASES.find((c) => c.value === form.clase) ?? CLASES[0];

  const set = (campo) => (e) => {
    setForm((prev) => ({ ...prev, [campo]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const ticker = `${clase.prefijo}${form.ticker.trim().toUpperCase().replace(/^[XC]:/, '')}`;
    const { error: err } = await onSubmit({
      cuentaId: form.cuentaId,
      ticker,
      nombre: form.nombre,
      clase: form.clase,
      cantidad: form.cantidad,
      precio: form.precio,
      fecha: form.fecha,
      moneda: form.moneda,
    });
    setSaving(false);
    if (err) setError(err);
    else setForm({ ...VACIO, cuentaId: form.cuentaId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Cuenta *" htmlFor="cuentaId">
          <Select id="cuentaId" value={form.cuentaId} onChange={set('cuentaId')} required>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
                {c.banco ? ` · ${c.banco}` : ''}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Tipo de activo *" htmlFor="clase">
          <Select id="clase" value={form.clase} onChange={set('clase')} required>
            {CLASES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Ticker *" htmlFor="ticker">
          <div className="flex items-center gap-2">
            {clase.prefijo && (
              <span className="text-sm text-muted-foreground">{clase.prefijo}</span>
            )}
            <Input
              id="ticker"
              value={form.ticker}
              onChange={set('ticker')}
              placeholder={clase.ejemplo}
              className="flex-1"
              required
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {form.clase === 'crypto'
              ? 'Incluye la moneda: BTCUSD, ETHUSD.'
              : 'El símbolo tal como cotiza: VOO, AAPL.'}
          </p>
        </Field>

        <Field label="Nombre (opcional)" htmlFor="nombre">
          <Input
            id="nombre"
            value={form.nombre}
            onChange={set('nombre')}
            placeholder="Vanguard S&P 500 ETF"
          />
        </Field>

        <Field label="Cantidad *" htmlFor="cantidad">
          {/* step permite fracciones porque BTC. Un entero haría imposible
              registrar 0,05 BTC, que es el caso normal. */}
          <Input
            id="cantidad"
            type="number"
            step="0.00000001"
            min="0"
            value={form.cantidad}
            onChange={set('cantidad')}
            placeholder="10"
            required
          />
        </Field>

        <Field label="Precio de compra *" htmlFor="precio">
          <Input
            id="precio"
            type="number"
            step="0.01"
            min="0"
            value={form.precio}
            onChange={set('precio')}
            placeholder="700"
            required
          />
        </Field>

        <Field label="Fecha de compra *" htmlFor="fecha">
          <Input id="fecha" type="date" value={form.fecha} onChange={set('fecha')} required />
        </Field>

        <Field label="Moneda *" htmlFor="moneda">
          <Select id="moneda" value={form.moneda} onChange={set('moneda')} required>
            <option value="USD">USD</option>
            <option value="COP">COP</option>
          </Select>
        </Field>
      </div>

      {/* Esta es la regla que más sorprende, así que se dice en el formulario
          y no solo en la documentación. */}
      <p className="text-sm text-muted-foreground">
        Cada compra se guarda como un lote aparte, así puedes ver el rendimiento
        de cada una. El costo se descuenta del efectivo de la cuenta y no genera
        ningún movimiento en tu dashboard.
      </p>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : 'Registrar compra'}
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
