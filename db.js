const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'Bananas42',
  port: 4242, // default PostgreSQL port
});

module.exports = pool;