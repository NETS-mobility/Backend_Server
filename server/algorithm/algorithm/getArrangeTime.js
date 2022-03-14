// === 서비스 정리 시간 구하는 모듈 ===
// service_kind_id: 예약 서비스 종류 ID
// 네츠 휠체어 편도 = 2
// 네츠 휠체어 왕복 = 3
// 네츠 휠체어 플러스 편도 = 4
// 네츠 휠체어 플러스 왕복 = 5

const pool2 = require("../util/mysql2");

const GetArrangeTime = async (service_kind_id) => {
  let result;
  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql =
      "select `service_free_time` as `freeTime` from `service_info` where `service_kind_id`=?;";
    const sql_result = await connection.query(sql, [service_kind_id]);
    const sql_data = sql_result[0];
    result = sql_data[0].freeTime;
  } catch (err) {
    console.error("err : " + err);
  } finally {
    connection.release();
    return result;
  }
};

module.exports = GetArrangeTime;
