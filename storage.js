require('dotenv').config({ quiet: true });

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

const configPath = path.join(__dirname, 'config.json');
const viewStatsPath = path.join(__dirname, 'view-stats.json');
const migrationsDir = path.join(__dirname, 'migrations');

let pool;

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!pool) {
    const sslEnabled = String(process.env.DATABASE_SSL || '').toLowerCase() === 'true';
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_MAX || 10),
      ssl: sslEnabled
        ? { rejectUnauthorized: String(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED || 'true') !== 'false' }
        : undefined
    });

    pool.on('error', (error) => {
      console.error('Database pool error:', error);
    });
  }

  return pool;
}

async function readFileConfig() {
  const text = await fs.readFile(configPath, 'utf8');
  return JSON.parse(text);
}

async function writeFileConfig(config) {
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
}

async function runMigration() {
  const database = getPool();
  if (!database) {
    return;
  }

  await database.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationFiles = (await fs.readdir(migrationsDir))
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort();

  for (const fileName of migrationFiles) {
    const applied = await database.query('SELECT 1 FROM schema_migrations WHERE id = $1', [fileName]);
    if (applied.rowCount > 0) {
      continue;
    }

    const migrationSql = await fs.readFile(path.join(migrationsDir, fileName), 'utf8');
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      await client.query(migrationSql);
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [fileName]);
      await client.query('COMMIT');
      console.log(`Applied database migration: ${fileName}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

async function importFileConfigIfDatabaseIsEmpty() {
  const database = getPool();
  if (!database) {
    return false;
  }

  const result = await database.query('SELECT data FROM app_config WHERE id = 1');
  if (result.rowCount > 0) {
    return false;
  }

  let config;
  try {
    config = await readFileConfig();
  } catch (error) {
    if (error.code === 'ENOENT') {
      config = {};
    } else {
      throw error;
    }
  }

  await database.query(
    `INSERT INTO app_config (id, data)
     VALUES (1, $1::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [JSON.stringify(config)]
  );

  console.log('Imported config.json into the remote database.');
  return true;
}

async function initializeStorage() {
  if (!isDatabaseConfigured()) {
    console.warn('DATABASE_URL is not set. Using local config.json storage.');
    return { mode: 'file' };
  }

  await runMigration();
  await importFileConfigIfDatabaseIsEmpty();
  await getPool().query('SELECT 1');
  console.log('Using PostgreSQL database storage.');
  return { mode: 'database' };
}

async function loadConfig() {
  const database = getPool();
  if (!database) {
    return readFileConfig();
  }

  const result = await database.query('SELECT data FROM app_config WHERE id = 1');
  return result.rows[0]?.data || {};
}

async function saveConfig(config) {
  const database = getPool();
  if (!database) {
    return writeFileConfig(config);
  }

  await database.query(
    `INSERT INTO app_config (id, data)
     VALUES (1, $1::jsonb)
     ON CONFLICT (id)
     DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [JSON.stringify(config)]
  );
}

async function readLocalViewStats() {
  try {
    const text = await fs.readFile(viewStatsPath, 'utf8');
    return JSON.parse(text);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { totalViews: 0, todayViews: 0, date: new Date().toISOString().slice(0, 10), pages: {} };
    }
    throw error;
  }
}

async function writeLocalViewStats(stats) {
  await fs.writeFile(viewStatsPath, JSON.stringify(stats, null, 2), 'utf8');
}

async function recordPageView(pagePath) {
  const normalizedPath = pagePath === '/guide' ? '/guide' : '/';
  const database = getPool();
  if (database) {
    await database.query(
      `INSERT INTO site_page_views (page_path, total_views, today_views, stat_date)
       VALUES ($1, 1, 1, CURRENT_DATE)
       ON CONFLICT (page_path)
       DO UPDATE SET
         total_views = site_page_views.total_views + 1,
         today_views = CASE
           WHEN site_page_views.stat_date = CURRENT_DATE THEN site_page_views.today_views + 1
           ELSE 1
         END,
         stat_date = CURRENT_DATE,
         updated_at = NOW()`,
      [normalizedPath]
    );
    return;
  }

  const stats = await readLocalViewStats();
  const today = new Date().toISOString().slice(0, 10);
  if (stats.date !== today) {
    stats.date = today;
    stats.todayViews = 0;
    Object.values(stats.pages || {}).forEach((page) => {
      page.todayViews = 0;
    });
  }
  stats.totalViews = Number(stats.totalViews || 0) + 1;
  stats.todayViews = Number(stats.todayViews || 0) + 1;
  stats.pages = stats.pages || {};
  stats.pages[normalizedPath] = stats.pages[normalizedPath] || { totalViews: 0, todayViews: 0 };
  stats.pages[normalizedPath].totalViews += 1;
  stats.pages[normalizedPath].todayViews += 1;
  await writeLocalViewStats(stats);
}

async function getViewStats() {
  const database = getPool();
  if (database) {
    const result = await database.query(
      `SELECT page_path, total_views::text, today_views::text
       FROM site_page_views
       ORDER BY page_path`
    );
    const pages = {};
    let totalViews = 0;
    let todayViews = 0;
    result.rows.forEach((row) => {
      const pageStats = {
        totalViews: Number(row.total_views),
        todayViews: Number(row.today_views)
      };
      pages[row.page_path] = pageStats;
      totalViews += pageStats.totalViews;
      todayViews += pageStats.todayViews;
    });
    return { totalViews, todayViews, pages };
  }

  const stats = await readLocalViewStats();
  const today = new Date().toISOString().slice(0, 10);
  if (stats.date !== today) {
    stats.date = today;
    stats.todayViews = 0;
    Object.values(stats.pages || {}).forEach((page) => {
      page.todayViews = 0;
    });
    await writeLocalViewStats(stats);
  }
  return {
    totalViews: Number(stats.totalViews || 0),
    todayViews: Number(stats.todayViews || 0),
    pages: stats.pages || {}
  };
}

async function getAdminPassword() {
  if (process.env.ADMIN_PASSWORD) {
    return process.env.ADMIN_PASSWORD;
  }

  throw new Error('ADMIN_PASSWORD is not configured. Refusing to use a default admin password.');
}

async function closeStorage() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  closeStorage,
  getAdminPassword,
  importFileConfigIfDatabaseIsEmpty,
  initializeStorage,
  isDatabaseConfigured,
  loadConfig,
  getViewStats,
  recordPageView,
  runMigration,
  saveConfig
};
