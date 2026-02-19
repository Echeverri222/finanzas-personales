# Pagos recurrentes (recurring payments)

Pagos que se repiten cada mes el mismo día y se añaden automáticamente a **gastos** o **ingresos** según la categoría (`tipo_movimiento`).

## 1. Qué crear en la base de datos

Ejecuta el SQL de la migración en **Supabase → SQL Editor → New query**:

- **Archivo:** `supabase/migrations/001_pagos_recurrentes.sql`

Ese script:

1. Crea la tabla **`pagos_recurrentes`** con:
   - `usuario_id` – dueño (mismo id que en `usuarios`)
   - `nombre` – descripción (ej. "Alquiler", "Nómina")
   - `importe` – cantidad (positivo o negativo según quieras; en la app se usa el tipo de movimiento para gasto/ingreso)
   - `id_tipo_movimiento` – categoría (de `tipo_movimiento`: Ingresos, Gastos fijos, etc.)
   - `dia_mes` – día del mes (1–31) en que se genera el movimiento
   - `activo` – si está activo o pausado

2. Añade a **`movimientos`** la columna **`recurring_id`** (opcional) para enlazar el movimiento generado con la regla recurrente y no duplicar.

3. Crea políticas RLS para que cada usuario solo vea y edite sus propios pagos recurrentes.

Si tu proyecto no tiene `usuarios` o `tipo_movimiento`, crea antes esas tablas o adapta los `REFERENCES` en el SQL.

## 2. Cómo funciona en la app

- Al **abrir la app** (con sesión iniciada), se ejecuta **una vez** la lógica de “pagos recurrentes de hoy”:
  - Se buscan `pagos_recurrentes` activos del usuario cuyo `dia_mes` coincida con el día de hoy (o con el último día del mes si el recurrente es 29, 30 o 31 y el mes es corto).
  - Para cada uno se comprueba si **ya existe** un `movimiento` con ese `recurring_id` en el mes actual.
  - Si **no** existe, se inserta un nuevo registro en `movimientos` con la misma fecha (día de ejecución), nombre, importe y categoría, y se rellena `recurring_id`.

Cuando llega el día programado (o abres la app más tarde en el mes), el movimiento se crea en la base de datos **una sola vez por mes** por cada recurrente.

## 3. Cómo dar de alta un pago recurrente

Desde la app (cuando tengas una pantalla de “Pagos recurrentes”):

- **Nombre:** ej. "Alquiler", "Nómina".
- **Importe:** cantidad (ej. 1200).
- **Categoría:** un `id_tipo_movimiento` existente (Ingresos, Gastos fijos, etc.). Eso define si cuenta como gasto o ingreso.
- **Día del mes:** 1–31 (ej. 5 = cada día 5; 31 en febrero se usará el 28 o 29).

O desde Supabase / SQL:

```sql
INSERT INTO pagos_recurrentes (usuario_id, nombre, importe, id_tipo_movimiento, dia_mes, activo)
VALUES (
  'TU_USUARIO_ID',           -- id de la fila en tabla usuarios
  'Alquiler',
  -800,
  'ID_TIPO_GASTOS_FIJOS',    -- id de tipo_movimiento
  5,                         -- día 5 de cada mes
  true
);
```

## 4. Resumen

| En la base de datos | Uso |
|--------------------|-----|
| Tabla **`pagos_recurrentes`** | Plantillas: nombre, importe, categoría, día del mes, activo. |
| Columna **`movimientos.recurring_id`** | Enlaza el movimiento generado con la regla y evita duplicados. |
| Ejecutar **`001_pagos_recurrentes.sql`** | Una vez en Supabase para crear tabla, columna y RLS. |

La app ya tiene el hook **`useRecurring()`** y el **`RecurringProcessor`** que se ejecuta al cargar; solo falta la UI para listar/crear/editar/eliminar filas en `pagos_recurrentes` cuando quieras.
