// === L1 구하는 함수 모듈 ===

// a1: 예상 이동시간 (분 단위) = 자택 -> 병원 예상 소요시간
// b1: 픽업시작 시각 (문자열, ex. "13:00") = 픽업 장소에 도착해야 되는 시간
// rd: 예약 날짜 (문자열, ex. "2022-03-04")
// 반환: rd날짜에서 b1 ~ b1 + a1 시간 내에 스케줄이 없는 차량 목록 = 여유시작시간 < b1 && 여유시간 > a1

const pool2 = require("../util/mysql2");

const GetL1 = async (a, b, rd) => {
  let result;
  const rtime = rd + " " + b;
  const start = new Date(rtime);
  const end = new Date(rtime);
  end.setMinutes(end.getMinutes()+a);

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql = "select `car_id` from `car` as C where not exists (select * from `car_dispatch` as D where D.`car_id`=C.`car_id` and " + 
      "((`expect_car_pickup_time` < ? and `expect_car_terminate_service_time` > ?) or (`expect_car_pickup_time` < ? and `expect_car_terminate_service_time` > ?)));"
    const sql_result = await connection.query(sql, [start, start, end, end]);
    result = sql_result[0];
  } catch (err) {
    console.error("err : " + err);
  } finally {
    connection.release();
    return result;
  }
};

module.exports = GetL1;
