import { useState } from 'react';
import Link from 'next/link';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useTags } from '../hooks/useTags';

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
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-slate-500 dark:text-slate-400">Cargando etiquetas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-primary hover:underline text-sm font-medium">
          ← Volver al inicio
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">Etiquetas</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Crea etiquetas para describir tus movimientos (ej. trabajo, vacaciones, reembolso)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nueva etiqueta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); setError(''); }}
              placeholder="Nombre de la etiqueta"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
            />
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear'}
            </Button>
          </form>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Etiquetas creadas</CardTitle>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">No hay etiquetas. Crea una para usarla en tus movimientos y filtrar en el dashboard.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <div
                  key={t.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg"
                >
                  <span className="font-medium">{t.nombre}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id, t.nombre)}
                    className="p-0.5 rounded hover:bg-primary/20 text-primary"
                    title="Eliminar"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
