import React from 'react';
import Link from 'next/link';
import { Search, Plus, Pencil, Trash2, Wallet, ReceiptText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TIPO } from '@/lib/constants';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

export default function MovimientosDesktop({
  sortedMovimientos,
  tiposMovimiento,
  tags,
  searchTerm,
  setSearchTerm,
  typeFilter,
  setTypeFilter,
  monthFilter,
  setMonthFilter,
  formatCurrency,
  formatDate,
  editingId,
  editFormData,
  setEditFormData,
  handleEdit,
  handleCancelEdit,
  handleSaveEdit,
  handleDelete,
}) {
  const handleTagToggle = (tagId) => {
    const current = editFormData.tagIds || [];
    setEditFormData((prev) => ({
      ...prev,
      tagIds: current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
    }));
  };

  const monthOptions = [];
  const year = new Date().getFullYear();
  for (let m = 1; m <= 12; m++) {
    const v = `${year}-${String(m).padStart(2, '0')}`;
    const label = new Date(2000, m - 1, 1).toLocaleDateString('es-ES', { month: 'long' });
    monthOptions.push({ value: v, label: `${label} ${year}` });
  }

  const chip = (active) =>
    cn(
      'rounded-full px-3 py-1 text-sm font-medium transition-colors',
      active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
    );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Movimientos" description="Gestiona y revisa todas tus transacciones.">
        <Link href="/movimientos/nuevo" className={cn(buttonVariants())}>
          <Plus className="size-4" />
          Nuevo movimiento
        </Link>
      </PageHeader>

      <Card className="mb-6">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative w-full flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por comercio o concepto..."
                className="pl-9"
              />
            </div>
            <Select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="md:w-56"
            >
              <option value="">Todos los meses</option>
              {monthOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 border-t pt-3">
            <button onClick={() => setTypeFilter('all')} className={chip(typeFilter === 'all')}>
              Todos
            </button>
            {(tiposMovimiento || []).map((tipo) => (
              <button key={tipo.id} onClick={() => setTypeFilter(tipo.id)} className={chip(typeFilter === tipo.id)}>
                {tipo.nombre}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Fecha</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="pr-6 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMovimientos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  No hay movimientos
                </TableCell>
              </TableRow>
            ) : (
              sortedMovimientos.map((mov) => {
                const isIngreso = mov.tipo_categoria === TIPO.INGRESO;
                const isEditing = editingId === mov.id;
                if (isEditing) {
                  return (
                    <React.Fragment key={mov.id}>
                      <TableRow className="bg-primary/5">
                        <TableCell className="pl-6">
                          <Input
                            type="date"
                            value={editFormData.fecha}
                            onChange={(e) => setEditFormData((prev) => ({ ...prev, fecha: e.target.value }))}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            value={editFormData.nombre}
                            onChange={(e) => setEditFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                            className="h-8"
                            placeholder="Descripción"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editFormData.id_tipo_movimiento}
                            onChange={(e) =>
                              setEditFormData((prev) => ({ ...prev, id_tipo_movimiento: e.target.value }))
                            }
                            className="h-8"
                          >
                            <option value="">Categoría</option>
                            {(tiposMovimiento || []).map((t) => (
                              <option key={t.id} value={t.id}>{t.nombre}</option>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={editFormData.importe}
                            onChange={(e) => setEditFormData((prev) => ({ ...prev, importe: e.target.value }))}
                            className="h-8 text-right"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell className="pr-6">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={handleSaveEdit}>Guardar</Button>
                            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>Cancelar</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-primary/5">
                        <TableCell colSpan={5} className="px-6 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="mr-1 text-xs font-medium text-muted-foreground">Etiquetas:</span>
                            {(tags || []).length > 0 ? (
                              tags.map((t) => (
                                <label
                                  key={t.id}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-sm hover:bg-secondary"
                                >
                                  <input
                                    type="checkbox"
                                    checked={(editFormData.tagIds || []).includes(t.id)}
                                    onChange={() => handleTagToggle(t.id)}
                                    className="rounded"
                                  />
                                  {t.nombre}
                                </label>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                <Link href="/etiquetas" className="text-primary hover:underline">Crea etiquetas</Link> para usarlas aquí
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                }
                return (
                  <TableRow key={mov.id}>
                    <TableCell className="pl-6 text-muted-foreground">{formatDate(mov.fecha)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex size-8 items-center justify-center rounded-lg',
                            isIngreso
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                          )}
                        >
                          {isIngreso ? <Wallet className="size-4" /> : <ReceiptText className="size-4" />}
                        </div>
                        <span className="font-medium">{mov.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isIngreso ? 'success' : 'secondary'}>{mov.tipo_nombre}</Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-semibold tabular-nums',
                        isIngreso ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                      )}
                    >
                      {isIngreso ? '+' : '-'}
                      {formatCurrency(Math.abs(mov.importe))}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(mov)} title="Editar">
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('¿Eliminar este movimiento?')) handleDelete(mov.id);
                          }}
                          title="Eliminar"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
