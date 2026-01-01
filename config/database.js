const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'iw0071',
  password: process.env.DB_PASSWORD || 'c$Ow7-9haSwLSPI4',
  database: process.env.DB_NAME || 'inquiry_master',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;

