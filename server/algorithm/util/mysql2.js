const config = require("../../config/database.js");

const mysql2 = require("mysql2/promise");
const pool = mysql2.createPool(config);

module.exports = pool; // 모듈 반환
