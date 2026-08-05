require('dotenv').config({ quiet: true });

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

const configPath = path.join(__dirname, 'config.json');
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

async function getAdminPassword() {
  if (process.env.ADMIN_PASSWORD) {
    return process.env.ADMIN_PASSWORD;
  }

  try {
    const config = await readFileConfig();
    return config.adminPassword || 'admin123';
  } catch (_error) {
    return 'admin123';
  }
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
  runMigration,
  saveConfig
};
