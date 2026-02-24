-- ============================================================
-- Tags: labels to describe movimientos (e.g. "trabajo", "vacíos")
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- 1) Table: tags (one per user)
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  nombre text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(usuario_id, nombre)
);

-- FK to usuarios
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usuarios') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tags_usuario_fkey') THEN
      ALTER TABLE tags ADD CONSTRAINT tags_usuario_fkey
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tags_usuario ON tags(usuario_id);

-- 2) Junction: movimiento_tags (many-to-many)
CREATE TABLE IF NOT EXISTS movimiento_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movimiento_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(movimiento_id, tag_id)
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movimientos') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'movimiento_tags_movimiento_fkey') THEN
      ALTER TABLE movimiento_tags ADD CONSTRAINT movimiento_tags_movimiento_fkey
        FOREIGN KEY (movimiento_id) REFERENCES movimientos(id) ON DELETE CASCADE;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tags') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'movimiento_tags_tag_fkey') THEN
      ALTER TABLE movimiento_tags ADD CONSTRAINT movimiento_tags_tag_fkey
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_movimiento_tags_mov ON movimiento_tags(movimiento_id);
CREATE INDEX IF NOT EXISTS idx_movimiento_tags_tag ON movimiento_tags(tag_id);

-- 3) RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimiento_tags ENABLE ROW LEVEL SECURITY;

-- Tags: users see/manage only their own
DROP POLICY IF EXISTS "Users can manage own tags" ON tags;
CREATE POLICY "Users can manage own tags"
  ON tags FOR ALL
  USING (
    usuario_id IN (SELECT id FROM usuarios WHERE user_id = auth.uid())
  )
  WITH CHECK (
    usuario_id IN (SELECT id FROM usuarios WHERE user_id = auth.uid())
  );

-- movimiento_tags: users can manage only for their own movimientos and tags
DROP POLICY IF EXISTS "Users can manage movimiento_tags for own movimientos" ON movimiento_tags;
CREATE POLICY "Users can manage movimiento_tags for own movimientos"
  ON movimiento_tags FOR ALL
  USING (
    tag_id IN (SELECT id FROM tags WHERE usuario_id IN (SELECT id FROM usuarios WHERE user_id = auth.uid()))
    AND movimiento_id IN (SELECT id FROM movimientos WHERE usuario_id IN (SELECT id FROM usuarios WHERE user_id = auth.uid()))
  )
  WITH CHECK (
    tag_id IN (SELECT id FROM tags WHERE usuario_id IN (SELECT id FROM usuarios WHERE user_id = auth.uid()))
    AND movimiento_id IN (SELECT id FROM movimientos WHERE usuario_id IN (SELECT id FROM usuarios WHERE user_id = auth.uid()))
  );

-- Allow read for movimientos owned by user (movimiento_tags links to movimientos; we allow if tag is user's)
-- The above policy already restricts to user's tags, so any tag_id in movimiento_tags must be user's tag.
-- But we also need to ensure we don't allow linking to another user's movimiento. The tag belongs to user,
-- so we trust that the app only links tags to movimientos the user owns. The movimientos table has RLS.
-- For movimiento_tags: INSERT/UPDATE/DELETE only when tag is user's. SELECT: we need to allow reading
-- movimiento_tags for movimientos the user can see. Actually the USING clause allows SELECT when tag_id
-- is in user's tags - so we can see all movimiento_tags for our tags. That could include tags on someone
-- else's movimiento if such a row existed, but we'd never create that. We're good.

COMMENT ON TABLE tags IS 'User-defined labels for movimientos (e.g. trabajo, vacaciones).';
COMMENT ON TABLE movimiento_tags IS 'Junction: which tags are assigned to which movimientos.';
