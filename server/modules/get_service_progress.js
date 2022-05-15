// === 서비스 진행상황 반환 ===
const pool2 = require('./mysql2');
const service_state = require("../config/service_state");
const logger = require("../config/logger");

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
      const sstate = data_prog[0].service_state_id;
      const sstate_time = {};
      if(move_direction_id != 2)
      {
        sstate_time.carDep = data_prog[0].real_car_departure_time; // 차량출발
        sstate_time.pickup = data_prog[0].real_pickup_time; // 픽업완료
        sstate_time.arrivalHos = data_prog[0].real_hospital_arrival_time; // 병원도착
        sstate_time.complete = data_prog[0].real_service_end_time; // 서비스종료
      }
      if(move_direction_id != 1)
      {
        sstate_time.carDep = data_prog[0].real_car_departure_time; // 귀가차량출발
        sstate_time.carReady = data_prog[0].real_return_hospital_arrival_time; // 귀가차량 병원도착
        sstate_time.goHome = data_prog[0].real_return_start_time; // 귀가출발
        sstate_time.complete = data_prog[0].real_service_end_time; // 서비스종료
      }
      res = {service_state: sstate, service_state_time: sstate_time};
    }
  } catch (err) {
    logger.error(__filename + " : " + err);
  } finally {
    connection.release();
    return res;
  }
};
