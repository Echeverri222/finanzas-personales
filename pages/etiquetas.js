import { useState } from 'react';
import { X, Tag as TagIcon } from 'lucide-react';
import { useTags } from '../hooks/useTags';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// No ErrorAlert here on purpose: the only failure this page surfaces is an
// empty-name validation error, which belongs beside the field it refers to.
import { EmptyState } from '@/components/feedback/EmptyState';
import { ListSkeleton } from '@/components/feedback/skeletons';

export default function EtiquetasPage() {
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { tags, loading, createTag, deleteTag } = useTags();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    setError('');
    const { error: err } = await createTag(nombre.trim());
    if (err) setError(err);
    else setNombre('');
    setSaving(false);
  };

  const handleDelete = async (id, nombreTag) => {
    if (!confirm(`¿Eliminar la etiqueta "${nombreTag}"?`)) return;
    await deleteTag(id);
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Etiquetas"
          description="Crea etiquetas para describir tus movimientos (ej. trabajo, vacaciones, reembolso)."
        />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Etiquetas"
        description="Crea etiquetas para describir tus movimientos (ej. trabajo, vacaciones, reembolso)."
      />

      <Card>
        <CardHeader>
          <CardTitle>Nueva etiqueta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="text"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setError('');
              }}
              placeholder="Nombre de la etiqueta"
              className="flex-1"
              aria-label="Nombre de la etiqueta"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'etiqueta-error' : undefined}
            />
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear'}
            </Button>
          </form>
          {error ? (
            <p id="etiqueta-error" role="alert" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Etiquetas creadas</CardTitle>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <EmptyState
              icon={TagIcon}
              title="No hay etiquetas"
              description="Crea una para usarla en tus movimientos y filtrar en el dashboard."
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground"
                >
                  {t.nombre}
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id, t.nombre)}
                    className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Eliminar etiqueta ${t.nombre}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
