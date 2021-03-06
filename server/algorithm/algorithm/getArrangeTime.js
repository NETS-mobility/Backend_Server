// === 서비스 정리 시간 구하는 모듈 ===
// service_kind_id: 예약 서비스 종류 ID
// 네츠 휠체어 편도 = 2
// 네츠 휠체어 왕복 = 3
// 네츠 휠체어 플러스 편도 = 4
// 네츠 휠체어 플러스 왕복 = 5

const pool2 = require("../util/mysql2");
const logger = require("../../config/logger");

const GetArrangeTime = async (service_kind_id) => {
  let result;
  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    let time_id;
    if(service_kind_id == 2 || service_kind_id == 3) time_id = 2;
    else time_id = 1;

    const sql = "select `extratime_data` as `freeTime` from `service_extratime` where `extratime_id`=?;";
    const sql_result = await connection.query(sql, [time_id]);
    const sql_data = sql_result[0];
    result = sql_data[0].freeTime;
  } catch (err) {
    logger.error(__filename + " : " + err);
  } finally {
    connection.release();
    return result;
  }
};

module.exports = GetArrangeTime;
