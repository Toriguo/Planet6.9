-- 在 Supabase SQL Editor 中运行此脚本，创建用户连接表

CREATE TABLE IF NOT EXISTS connections (
  id BIGSERIAL PRIMARY KEY,
  slug_a TEXT NOT NULL,
  slug_b TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT connections_unique UNIQUE (slug_a, slug_b),
  CONSTRAINT connections_order CHECK (slug_a < slug_b)
);

CREATE INDEX IF NOT EXISTS connections_slug_a_idx ON connections (slug_a);
CREATE INDEX IF NOT EXISTS connections_slug_b_idx ON connections (slug_b);

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read connections" ON connections;
CREATE POLICY "Allow public read connections" ON connections
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert connections" ON connections;
CREATE POLICY "Allow public insert connections" ON connections
  FOR INSERT WITH CHECK (true);

-- 删除连接策略
DROP POLICY IF EXISTS "Allow public delete connections" ON connections;
CREATE POLICY "Allow public delete connections" ON connections
  FOR DELETE USING (true);
