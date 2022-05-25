// === mysql2 오브젝트 ===

const config = require('../config/database.js')

const mysql2 = require('mysql2/promise');
const pool = mysql2.createPool(config);

module.exports = pool;
