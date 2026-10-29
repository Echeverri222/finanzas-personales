import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { esLiquida } from '@/types/domain';
import { TIPO } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { NativeSelect as Select } from '@/components/ui/native-select';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { MoneyInput } from '@/components/money/MoneyInput';

const TIPOS_DE_SALIDA = [TIPO.GASTO, TIPO.INVERSION, TIPO.PRESTAMO];

const GRUPOS = [
  { tipo: TIPO.GASTO, label: 'Gastos' },
  { tipo: TIPO.INGRESO, label: 'Ingresos' },
  { tipo: TIPO.AHORRO, label: 'Ahorro' },
  { tipo: TIPO.INVERSION, label: 'Inversión' },
  { tipo: TIPO.PRESTAMO, label: 'Préstamos' },
];

export function esCategoriaDeSalida(tiposMovimiento, idTipo) {
  const categoria = (tiposMovimiento || []).find((t) => String(t.id) === String(idTipo));
  return TIPOS_DE_SALIDA.includes(categoria?.tipo);
}

/** "Bancolombia · Bancolombia" said the same thing twice. */
export function etiquetaCuenta(c) {
  return c.banco && c.banco.trim().toLowerCase() !== c.nombre.trim().toLowerCase()
    ? `${c.nombre} · ${c.banco}`
    : c.nombre;
}

function ErrorCampo({ children }) {
  return children ? <p className="mt-1 text-sm text-destructive">{children}</p> : null;
}

/**
 * The movimiento fields, shared by /movimientos/nuevo and the edit dialog.
 *
 * They were two hand-written copies that had already drifted: different amount
 * input, different "Sale de ahorros" copy, tags collapsible in one and not the
 * other. One component now; `compact` stacks everything in a single column for
 * the dialog.
 *
 * `data` holds { fecha, nombre, importe, id_tipo_movimiento, cuenta_id,
 * sale_de_ahorros, tagIds }; `setData` is a functional setState.
 */
export function MovimientoFields({
  data,
  setData,
  errors = {},
  onFieldEdited,
  tiposMovimiento,
  cuentas,
  patrimonioHabilitado,
  tags,
  idPrefix = 'mov',
  compact = false,
}) {
  const [tagsOpen, setTagsOpen] = useState(() => (data.tagIds || []).length > 0);
  const cuentasLiquidas = (cuentas || []).filter((c) => esLiquida(c) && c.activa !== false);
  const esSalida = esCategoriaDeSalida(tiposMovimiento, data.id_tipo_movimiento);
  const id = (campo) => `${idPrefix}-${campo}`;

  const set = (campo) => (e) => {
    const value = e.target.value;
    setData((prev) => {
      const next = { ...prev, [campo]: value };
      // Only an outflow can come out of savings; switching to an income
      // category must not leave the flag silently on.
      if (campo === 'id_tipo_movimiento' && !esCategoriaDeSalida(tiposMovimiento, value)) {
        next.sale_de_ahorros = false;
      }
      return next;
    });
    onFieldEdited?.(campo);
  };

  const toggleTag = (tagId) =>
    setData((prev) => {
      const actuales = prev.tagIds || [];
      return {
        ...prev,
        tagIds: actuales.includes(tagId)
          ? actuales.filter((t) => t !== tagId)
          : [...actuales, tagId],
      };
    });

  // Group the categories by what they do, so "Ahorro" or "Inversiones" can't be
  // mistaken for an expense in a flat list of nine names.
  const gruposConCategorias = GRUPOS.map((g) => ({
    ...g,
    items: (tiposMovimiento || []).filter((t) => (t.tipo || TIPO.GASTO) === g.tipo),
  })).filter((g) => g.items.length > 0);

  const seleccionadas = (data.tagIds || []).length;

  return (
    <div className={cn('grid grid-cols-1 gap-4', !compact && 'md:grid-cols-2')}>
      <Field label="Fecha *" htmlFor={id('fecha')}>
        <Input
          id={id('fecha')}
          type="date"
          value={data.fecha || ''}
          onChange={set('fecha')}
          className={errors.fecha ? 'border-destructive' : ''}
          required
        />
        <ErrorCampo>{errors.fecha}</ErrorCampo>
      </Field>

      <Field label="Importe *" htmlFor={id('importe')}>
        <MoneyInput
          id={id('importe')}
          value={data.importe}
          onChange={set('importe')}
          placeholder="Ej. 45.000"
          className={errors.importe ? 'border-destructive' : ''}
          required
        />
        <ErrorCampo>{errors.importe}</ErrorCampo>
      </Field>

      <Field label="Nombre *" htmlFor={id('nombre')}>
        <Input
          id={id('nombre')}
          value={data.nombre || ''}
          onChange={set('nombre')}
          placeholder="Ej. Mercado, Salario"
          className={errors.nombre ? 'border-destructive' : ''}
          required
        />
        <ErrorCampo>{errors.nombre}</ErrorCampo>
      </Field>

      <Field label="Categoría *" htmlFor={id('tipo')}>
        <Select
          id={id('tipo')}
          value={data.id_tipo_movimiento || ''}
          onChange={set('id_tipo_movimiento')}
          className={errors.id_tipo_movimiento ? 'border-destructive' : ''}
          required
        >
          <option value="">Elige una categoría</option>
          {gruposConCategorias.map((g) => (
            <optgroup key={g.tipo} label={g.label}>
              {g.items.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </optgroup>
          ))}
        </Select>
        <ErrorCampo>{errors.id_tipo_movimiento}</ErrorCampo>
      </Field>

      {/* Optional, and absent entirely when Patrimonio is off. Only liquid
          accounts: an asset (a car, a house) has no cash to debit, and the M21
          trigger would reject the link -- offering it would promise something
          the database is going to refuse. */}
      {patrimonioHabilitado && cuentasLiquidas.length > 0 && (
        <Field label="Cuenta (opcional)" htmlFor={id('cuenta')}>
          <Select id={id('cuenta')} value={data.cuenta_id || ''} onChange={set('cuenta_id')}>
            <option value="">Sin cuenta</option>
            {cuentasLiquidas.map((c) => (
              <option key={c.id} value={c.id}>{etiquetaCuenta(c)}</option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            Si eliges una, el saldo de esa cuenta se ajusta solo.
          </p>
        </Field>
      )}

      <div className={cn('flex items-start justify-between gap-4 rounded-lg border p-4', !compact && 'md:col-span-2')}>
        <div>
          <label htmlFor={id('sale-de-ahorros')} className="text-sm font-medium">
            Sale de ahorros
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            Resta del ahorro acumulado y conserva el movimiento, pero no cuenta como gasto
            ni afecta el balance del mes.
          </p>
          {!esSalida && (
            <p className="mt-1 text-xs text-muted-foreground">
              Disponible para gastos, inversiones y préstamos.
            </p>
          )}
        </div>
        <Switch
          id={id('sale-de-ahorros')}
          checked={Boolean(data.sale_de_ahorros)}
          disabled={!esSalida}
          onCheckedChange={(checked) => setData((prev) => ({ ...prev, sale_de_ahorros: checked }))}
          aria-label="Marcar como consumo de ahorros"
        />
      </div>

      <div className={cn('space-y-2', !compact && 'md:col-span-2')}>
        {(tags || []).length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => setTagsOpen((prev) => !prev)}
              aria-expanded={tagsOpen}
              aria-controls={id('etiquetas')}
              className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium hover:bg-secondary"
            >
              <span className="flex items-center gap-2">
                Etiquetas (opcional)
                {seleccionadas > 0 && (
                  <Badge variant="secondary">
                    {seleccionadas} seleccionada{seleccionadas > 1 ? 's' : ''}
                  </Badge>
                )}
              </span>
              <ChevronDown className={cn('size-4 shrink-0 transition-transform', tagsOpen && 'rotate-180')} />
            </button>
            <div id={id('etiquetas')} className={tagsOpen ? 'flex flex-wrap gap-2 pt-1' : 'hidden'}>
              {tags.map((t) => (
                <label
                  key={t.id}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-secondary"
                >
                  <input
                    type="checkbox"
                    checked={(data.tagIds || []).includes(t.id)}
                    onChange={() => toggleTag(t.id)}
                    className="rounded"
                  />
                  <span>{t.nombre}</span>
                </label>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link href="/etiquetas" className="text-primary hover:underline">Crea etiquetas</Link>{' '}
            para agrupar movimientos (viajes, reembolsos...).
          </p>
        )}
      </div>
    </div>
  );
}
