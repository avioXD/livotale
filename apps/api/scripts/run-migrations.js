import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../../../packages/database/migrations');

function databaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }
  // node pg does not accept SQLAlchemy/asyncpg driver suffixes
  return process.env.DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://');
}

async function ensureMigrationLedger(client) {
  await client.query('CREATE SCHEMA IF NOT EXISTS audit');
  await client.query(`
    CREATE TABLE IF NOT EXISTS audit.schema_migrations (
      filename text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function checksum(sql) {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(sql).digest('hex');
}

async function main() {
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  await ensureMigrationLedger(client);

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    const hash = await checksum(sql);
    const existing = await client.query(
      'SELECT checksum FROM audit.schema_migrations WHERE filename = $1',
      [file],
    );

    if (existing.rowCount > 0) {
      if (existing.rows[0].checksum !== hash) {
        throw new Error(`Migration ${file} was already applied with a different checksum.`);
      }
      console.log(`skip ${file}`);
      continue;
    }

    console.log(`apply ${file}`);
    await client.query(sql);
    await client.query(
      'INSERT INTO audit.schema_migrations(filename, checksum) VALUES ($1, $2)',
      [file, hash],
    );
  }

  console.log('migrations complete');
  await client.end().catch(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
