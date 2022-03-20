// === DB 계정정보 설정 ===

module.exports = {
    connectionLimit: 5,
    host: 'localhost',              // 로컬계정
    user: 'root',
    password: '9575837106',              // gcp 테스트 시
//    password: '1234',                    // localhost 테스트 시
    database: 'nets',
    multipleStatements: true
}
