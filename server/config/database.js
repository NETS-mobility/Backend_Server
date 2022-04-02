// === DB 계정정보 설정 ===

module.exports = {
  connectionLimit: 5,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PSWORD,
  database: process.env.DB_DATABASE,
  multipleStatements: true,
};
