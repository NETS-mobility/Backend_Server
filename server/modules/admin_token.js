// === 관리자 페이지 접근 검사 ===
// 토큰을 통해 관리자 계정이 맞는지 확인
const jwt = require("./jwt");
const pool2 = require("./mysql2");

module.exports = async function (token) {
  let checker = false;
  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const token_res = await jwt.verify(token);
    if (token_res == jwt.TOKEN_EXPIRED) throw (err = "유효하지 않은 토큰");
    if (token_res == jwt.TOKEN_INVALID) throw (err = "유효하지 않은 토큰");
    const user_num = token_res.num;

    const sql = "select * from `administrator` where `admin_number`=?;";
    const sqlr = await connection.query(sql, [user_num]);

    if (sqlr[0].length == 0) checker = false;
    else checker = true;
  } catch (err) {
    console.error("err : " + err);
  } finally {
    connection.release();
    return checker;
  }
};
