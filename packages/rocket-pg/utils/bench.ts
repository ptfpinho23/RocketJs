import { RocketPGClient } from '../src/client';
import { Client as PgClient } from 'pg';

async function runBenchmark() {
  const rocketpgClient = new RocketPGClient({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'testdb',
  });

  const pgClient = new PgClient({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'testdb',
  });

  // Connect to the database.
  await rocketpgClient.connect();
  await pgClient.connect();

  // Execute the same SQL query using both clients and measure the execution time.
  const query = 'SELECT * FROM users';
  const startCustom = Date.now();
  await rocketpgClient.query(query);
  const endCustom = Date.now();
  const startPg = Date.now();
  await pgClient.query(query);
  const endPg = Date.now();

  console.log(`Custom client execution time: ${endCustom - startCustom}ms`);
  console.log(`pg client execution time: ${endPg - startPg}ms`);

  // Disconnect from the database.
  await rocketpgClient.end();
  await pgClient.end();
}

runBenchmark();
