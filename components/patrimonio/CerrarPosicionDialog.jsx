import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { todayISO, formatNumber } from '@/lib/format';

/**
 * Vender un lote, entero o en parte.
 *
 * **El cierre parcial es el motivo de que este diálogo exista.** Si solo se
 * pudiera vender el lote completo, vender 2 de 5 acciones obligaría al usuario
 * a borrar el lote y recrear uno de 3 —perdiendo la fecha de compra original y,
 * con ella, la rentabilidad realizada de esas 2. Por eso la cantidad es
 * editable y arranca en el total, que es el caso más común.
 */
export function CerrarPosicionDialog({ posicion, precios, onSubmit, onCancel }) {
  const precioSugerido = precios?.[posicion.ticker]?.cierre ?? posicion.precio_compra;

  const [cantidad, setCantidad] = useState(String(posicion.cantidad));
  const [precioVenta, setPrecioVenta] = useState(String(Number(precioSugerido).toFixed(2)));
  const [fechaVenta, setFechaVenta] = useState(todayISO());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const cant = Number(cantidad);
  const precio = Number(precioVenta);
  const parcial = cant > 0 && cant < Number(posicion.cantidad);

  const ganancia =
    Number.isFinite(cant) && Number.isFinite(precio)
      ? cant * (precio - Number(posicion.precio_compra))
      : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { error: err } = await onSubmit({
      posicionId: posicion.id,
      cantidad,
      precioVenta,
      fechaVenta,
    });
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vender {posicion.ticker}</DialogTitle>
          <DialogDescription>
            Lote de {formatNumber(posicion.cantidad)} comprado a{' '}
            {Number(posicion.precio_compra).toFixed(2)} {posicion.moneda}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Cantidad a vender *" htmlFor="cantidad">
            <Input
              id="cantidad"
              type="number"
              step="0.00000001"
              min="0"
              max={posicion.cantidad}
              value={cantidad}
              onChange={(e) => {
                setCantidad(e.target.value);
                setError('');
              }}
              required
            />
            {parcial && (
              <p className="mt-1 text-xs text-muted-foreground">
                Venta parcial: quedarán {formatNumber(Number(posicion.cantidad) - cant)} abiertas
                al mismo precio de compra.
              </p>
            )}
          </Field>

          <Field label="Precio de venta *" htmlFor="precioVenta">
            <Input
              id="precioVenta"
              type="number"
              step="0.01"
              min="0"
              value={precioVenta}
              onChange={(e) => {
                setPrecioVenta(e.target.value);
                setError('');
              }}
              required
            />
            {precios?.[posicion.ticker] && (
              <p className="mt-1 text-xs text-muted-foreground">
                Sugerido: último cierre conocido ({precios[posicion.ticker].fecha}).
              </p>
            )}
          </Field>

          <Field label="Fecha de venta *" htmlFor="fechaVenta">
            <Input
              id="fechaVenta"
              type="date"
              value={fechaVenta}
              min={posicion.fecha_compra}
              onChange={(e) => {
                setFechaVenta(e.target.value);
                setError('');
              }}
              required
            />
          </Field>

          <p className="text-sm">
            Rentabilidad realizada:{' '}
            <span className={ganancia >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-destructive'}>
              {ganancia >= 0 ? '+' : '−'}
              {formatNumber(Math.abs(ganancia).toFixed(2))} {posicion.moneda}
            </span>
          </p>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Vendiendo...' : 'Confirmar venta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
