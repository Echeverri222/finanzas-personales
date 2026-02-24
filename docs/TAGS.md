# Etiquetas (Tags)

Las etiquetas permiten describir mejor los movimientos (ej. trabajo, vacaciones, reembolso) y filtrar en el dashboard.

## Base de datos

Ejecuta la migración en Supabase SQL Editor:

```
supabase/migrations/002_tags.sql
```

Crea:
- **tags**: id, usuario_id, nombre
- **movimiento_tags**: movimiento_id, tag_id (relación muchos a muchos)

## Uso

1. **Crear etiquetas**: Ve a Etiquetas en el menú y crea las que necesites.
2. **Asignar a movimientos**: Al crear o editar un movimiento, selecciona las etiquetas.
3. **Filtrar en dashboard**: Usa el dropdown "Todos los tags" para filtrar por etiqueta (tanto en móvil como en escritorio).
