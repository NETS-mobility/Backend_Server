// === 실제 병원동행시간 반환 ===

const pool2 = require('./mysql2');
const service_state = require("../config/service_state");
const date_to_string = require("./date_to_string");
const logger = require("../config/logger");

// 서비스 id, 방향
module.exports = async function (service_id, move_direction_id) {
  let res = undefined;
  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql_prog =
      "select date_format(`real_car_departure_time`,'%Y-%m-%d %T') as `real_car_departure_time`, date_format(`real_pickup_time`,'%Y-%m-%d %T') as `real_pickup_time`, date_format(`real_hospital_arrival_time`,'%Y-%m-%d %T') as `real_hospital_arrival_time`, date_format(`real_return_hospital_arrival_time`,'%Y-%m-%d %T') as `real_return_hospital_arrival_time`, " + 
      "date_format(`real_return_start_time`,'%Y-%m-%d %T') as `real_return_start_time`, date_format(`real_service_end_time`,'%Y-%m-%d %T') as `real_service_end_time`, `service_state_id` from `service_progress` where `reservation_id`=?;";
    const result_prog = await connection.query(sql_prog, [service_id]);
    const data_prog = result_prog[0];

    if (data_prog.length > 0) {
      const arrivalHos = new Date(data_prog[0].real_hospital_arrival_time); // 병원도착
      const goHome = new Date(data_prog[0].real_return_start_time); // 귀가출발
      const complete = new Date(data_prog[0].real_service_end_time); // 서비스종료
      let gotime = 0;

      if(move_direction_id == 1) // 편도(집-병원)
        gotime = Math.floor(Math.abs(complete.getTime() - arrivalHos.getTime()) / (1000 * 60))
      if(move_direction_id == 3) // 왕복
        gotime = Math.floor(Math.abs(goHome.getTime() - arrivalHos.getTime()) / (1000 * 60))

      res = gotime;
    }
  } catch (err) {
    logger.error(__filename + " : " + err);
  } finally {
    connection.release();
    return res;
  }
};
