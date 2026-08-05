const { closeStorage, importFileConfigIfDatabaseIsEmpty, isDatabaseConfigured, runMigration } = require('../storage');

async function main() {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL is not set. Add it to your environment before running db:import.');
  }

  await runMigration();
  const imported = await importFileConfigIfDatabaseIsEmpty();
  console.log(imported ? 'Configuration imported.' : 'Database already has configuration; nothing changed.');
}

main()
  .catch((error) => {
    console.error('Configuration import failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => closeStorage());
