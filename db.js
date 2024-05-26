const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'carlinha2',
  port: 5432, // default PostgreSQL port
});

module.exports = pool;    