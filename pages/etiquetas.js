import { useState } from 'react';
import { X } from 'lucide-react';
import { useTags } from '../hooks/useTags';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-muted-foreground">Cargando etiquetas...</div>
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
            />
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear'}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Etiquetas creadas</CardTitle>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <p className="text-muted-foreground">
              No hay etiquetas. Crea una para usarla en tus movimientos y filtrar en el dashboard.
            </p>
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
                    className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-destructive"
                    title="Eliminar"
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
