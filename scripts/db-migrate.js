const { closeStorage, initializeStorage, isDatabaseConfigured } = require('../storage');

async function main() {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL is not set. Add it to your environment before running db:migrate.');
  }

  await initializeStorage();
  console.log('Database migration completed.');
}

main()
  .catch((error) => {
    console.error('Database migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => closeStorage());
