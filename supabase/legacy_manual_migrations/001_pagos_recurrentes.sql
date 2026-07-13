-- ============================================================
-- Recurring payments: same amount every month on a chosen day
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- 1) Create table: pagos_recurrentes (recurring payment templates)
CREATE TABLE IF NOT EXISTS pagos_recurrentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,  -- same id as in usuarios table (profile id)
  nombre text NOT NULL,
  importe numeric NOT NULL CHECK (importe <> 0),
  id_tipo_movimiento uuid NOT NULL,
  dia_mes smallint NOT NULL CHECK (dia_mes >= 1 AND dia_mes <= 31),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- FK to usuarios and tipo_movimiento (adjust table names if yours differ)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pagos_recurrentes_usuario_fkey') THEN
    ALTER TABLE pagos_recurrentes ADD CONSTRAINT pagos_recurrentes_usuario_fkey
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pagos_recurrentes_tipo_fkey') THEN
    ALTER TABLE pagos_recurrentes ADD CONSTRAINT pagos_recurrentes_tipo_fkey
      FOREIGN KEY (id_tipo_movimiento) REFERENCES tipo_movimiento(id) ON DELETE RESTRICT;
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL; -- skip if usuarios/tipo_movimiento not found; add FKs manually later
END $$;

CREATE INDEX IF NOT EXISTS idx_pagos_recurrentes_usuario_activo_dia
  ON pagos_recurrentes(usuario_id, activo, dia_mes);

-- 2) Add column to movimientos ONLY if that table exists (e.g. you may have "transactions" instead)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movimientos') THEN
    ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS recurring_id uuid;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'movimientos_recurring_id_fkey') THEN
      ALTER TABLE movimientos ADD CONSTRAINT movimientos_recurring_id_fkey
        FOREIGN KEY (recurring_id) REFERENCES pagos_recurrentes(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 3) RLS: only the owner can see/edit their recurring payments
ALTER TABLE pagos_recurrentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own recurring" ON pagos_recurrentes;
CREATE POLICY "Users can manage own recurring"
  ON pagos_recurrentes
  FOR ALL
  USING (
    usuario_id IN (SELECT id FROM usuarios WHERE user_id = auth.uid())
  )
  WITH CHECK (
    usuario_id IN (SELECT id FROM usuarios WHERE user_id = auth.uid())
  );

-- 4) Trigger to keep updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pagos_recurrentes_updated_at ON pagos_recurrentes;
CREATE TRIGGER pagos_recurrentes_updated_at
  BEFORE UPDATE ON pagos_recurrentes
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

COMMENT ON TABLE pagos_recurrentes IS 'Recurring payments: same amount every month on dia_mes (1-31). Processed by app to insert into movimientos.';
