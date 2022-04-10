// === 배차 결과를 가공하는 모듈 ===

// === 배차 선택 ===
// 픽업장소 출발 => 픽업에서 가장 가까운 곳에 있는 최적 차량 선택
// 병원에서 출발 => 병원과 가장 가까운 곳에 있는 최적 차량 선택
// prevDepartureTime이 가장 큰 순서대로 정렬되어 있으므로, dispatch의 인덱스가 작을수록 최적인 차량 (가장 최적은 dispatch[0])

const logger = require("../../config/logger");
const pool2 = require("../util/mysql2");

const resultDispatch = async (dispatchResult, revData, dire, is3) => {
  let result = undefined;
  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    let car_id;
    let car_num;
    let manager_num;
    let manager_name;
    let manager_id;

    // 매니저 매칭 - 기본적으로 차량의 운전자로 배정
    for(let i = 0; i < dispatchResult.dispatch.length; i++)
    {
      car_id = dispatchResult.dispatch[i].car_id;
      const sqlm =
      "select M.`netsmanager_number`, `netsmanager_id`, `netsmanager_name`, `car_number` from `car` as C, `netsmanager` as M where C.`car_id`=? and C.`netsmanager_number`=M.`netsmanager_number` and M.`netsmanager_possible`!=0;";
      const sqlmd = await connection.query(sqlm, [car_id]);
      if (sqlmd[0].length != 0)
      {
        manager_num = sqlmd[0][0].netsmanager_number;
        manager_id = sqlmd[0][0].netsmanager_id;
        manager_name = sqlmd[0][0].netsmanager_name;
        car_num = sqlmd[0][0].car_number;
        break;
      }
    }
    if(manager_num === undefined) throw err = "매니저 매칭 실패!";
    
    let time_start = dispatchResult.expect_pickup_time;
    let time_end = dispatchResult.expect_terminate_service_time;
    let expect_move_distance = dispatchResult.expect_move_distance;
    let expect_move_time = dispatchResult.expect_move_time;
    if (is3) {
      if (dire == 1)
        time_end = revData.rev_date + " " + revData.old_hos_arr_time; // case 3일 경우, 병원 도착 시간을 기준으로 2개로 분할
      if (dire == 2)
      {
        time_start = revData.rev_date + " " + revData.old_hos_arr_time; // case 3 후반 배차의 출발 시각은 동행 시작 시간으로 설정
        expect_move_distance = dispatchResult.expect_move_distance2; // 병원->집 이동데이터
        expect_move_time = dispatchResult.expect_move_time2;
      }
    }
    time_start = time_start.substr(0, 10) + " " + time_start.substr(11, 8);
    time_end = time_end.substr(0, 10) + " " + time_end.substr(11, 8);

    result = {
      netsmanagerNum: manager_num,
      carId: car_id,
      expMoveDistance: expect_move_distance,
      expMoveTime: expect_move_time,
      expCarPickupTime: time_start,
      expCarTerminateServiceTime: time_end,
      carNumber: car_num,
      netsmanagerName: manager_name,
      netsmanagerId: manager_id,
    };
  } catch (err) {
    logger.error(__filename + " : " + err);
  } finally {
    connection.release();
    return result;
  }
};

module.exports = resultDispatch;
