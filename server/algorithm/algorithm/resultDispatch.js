// === 배차 결과를 가공하는 모듈 ===

// === 배차 선택 ===
// 픽업장소 출발 => 픽업에서 가장 가까운 곳에 있는 최적 차량 선택
// 병원에서 출발 => 병원과 가장 가까운 곳에 있는 최적 차량 선택
// prevDepartureTime이 가장 큰 순서대로 정렬되어 있으므로, 최적 차량 = dispatch[0]

const pool2 = require("../util/mysql2");

const resultDispatch = async (dispatchResult, revData, direction, is3) => {
  let result = undefined;
  const connection = await pool2.getConnection(async (conn) => conn);
  try {
      const car_id = dispatchResult.dispatch[0].car_id;

      // 매니저 매칭 - 기본적으로 차량의 운전자로 배정
      const sqlm = "select M.`netsmanager_number` from `car` as C, `netsmanager` as M where C.`car_id`=? and C.`netsmanager_number`=M.`netsmanager_number`;";
      const sqlmd = await connection.query(sqlm, [car_id]);
      if(sqlmd[0].length == 0) throw err = "매니저 매칭 실패";

      let time_start = dispatchResult.expect_pickup_time;
      let time_end = dispatchResult.expect_terminate_service_time;
      if(is3)
      {
        if(dire == 1) time_end = revData.rev_date + " " + revData.old_hos_arr_time; // case 3일 경우, 병원 도착 시간을 기준으로 2개로 분할
        if(dire == 2) time_start = revData.rev_date + " " + revData.old_hos_arr_time; // case 3 후반 배차의 출발 시각은 동행 시작 시간으로 설정
      }

      result = {
        netsmanagerNum: sqlmd[0][0].netsmanager_number,
        carId: car_id,
        expMoveDistance: dispatchResult.expect_move_distance,
        expMoveTime: dispatchResult.expect_move_time,
        expCarPickupTime: time_start,
        expCarTerminateServiceTime: time_end
      }
  }
  catch (err) {
    console.error("err : " + err);
  }
  finally {
    connection.release();
    return result;
  }
};

module.exports = resultDispatch;
