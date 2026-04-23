// config/db.js – PostgreSQL connection pool
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,           // max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err);
  process.exit(-1);
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌  DB connection failed:', err.stack);
  } else {
    console.log('✅  PostgreSQL connected');
    release();
  }
});

module.exports = pool;
