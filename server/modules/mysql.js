// === mysql 오브젝트 ===

const config = require('../config/database.js')

const mysql = require('mysql');
const pool = mysql.createPool(config);

module.exports = pool;
