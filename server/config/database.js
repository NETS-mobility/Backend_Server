// === DB 계정정보 설정 ===

module.exports = {
  connectionLimit: 5,
  host: process.env.DB_HOST, // 로컬계정
  user: process.env.DB_USER,
  password: process.env.DB_PSWORD, // gcp 테스트 시
  //    password: '1234',                    // localhost 테스트 시
  database: process.env.DB_DATABASE,
  multipleStatements: true,
};
