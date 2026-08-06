CREATE TABLE IF NOT EXISTS site_page_views (
  page_path TEXT PRIMARY KEY,
  total_views BIGINT NOT NULL DEFAULT 0 CHECK (total_views >= 0),
  today_views BIGINT NOT NULL DEFAULT 0 CHECK (today_views >= 0),
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
