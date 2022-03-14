// === DB에 배차 정보를 저장하는 모듈 ===

// dispatchResult: 배차 목록 (배열)
// revData: 예약 데이터 (= 클라이언트 입력)
// direction: 방향 목록 (배열, 인덱스는 dispatchResult와 동일)
// is3: case 3 여부

/*
 * dire: 방향 (문자열, 집->병원 or 편도 - "1", 병원->집 - "2")
 * rev_id: 예약 아이디 (문자열, DB의 reservation 테이블에 먼저 tuple이 있어야 함)
 * car_id: 차량 아이디
 * manager_number: 네츠매니저 아이디
 * adr_start: 시작 주소
 * adr_end: 도착 주소
 * time_start: 시작 시간 (날짜 포함, ex. "2022-03-04 19:00")
 * time_end: 도착 시간 (날짜 포함)
*/

// 성공시 true 반환


const pool2 = require("../util/mysql2");

const InsertDispatch = async (dispatchResult, revData, direction, is3) => {
  let success = true;
  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    await connection.beginTransaction(); // 트랜잭션 시작

    for(let i = 0; i < dispatchResult.length; i++)
    {
      const dire = direction[i];
      const rev_id = revData.rev_id;
      const car_id = dispatchResult[i].dispatch[0].car_id;
      const adr_start = (dire == 1) ? revData.pickup : revData.hos;
      const adr_end = (dire == 1) ? revData.hos : revData.drop;
      let time_start = dispatchResult[i].expect_pickup_time;
      let time_end = dispatchResult[i].expect_terminate_service_time;
      let prev_dep_time = dispatchResult[i].dispatch[0].prevDepartureTime;
      if(is3)
      {
        if(dire == 1) time_end = revData.rev_date + " " + revData.old_hos_arr_time; // case 3일 경우, 병원 도착 시간을 기준으로 2개로 분할
        if(dire == 2) 
        {
          time_start = revData.rev_date + " " + revData.old_hos_arr_time;
          prev_dep_time = time_start; // case 3 후반 배차의 출발 시각은 동행 시작 시간으로 설정
        }
      }

       // 매니저 매칭: 기본적으로 차량의 운전자로 배정
      const sqlm = "select M.`netsmanager_number` from `car` as C, `netsmanager` as M where C.`car_id`=? and C.`netsmanager_number`=M.`netsmanager_number`;";
      const sqlmd = await connection.query(sqlm, [car_id]);
      if(sqlmd[0].length == 0) throw err = "매니저 매칭 실패";
      const manager_number = sqlmd[0][0].netsmanager_number;

      // address_coordinate 테이블에 주소 tuple 추가
      for(let w = 0; w < 2; w++)
      {
        const adr = (w == 0) ? adr_start : adr_end;
        const sql1 = "select * from `address_coordinate` where `address`=?;"
        const sqlr1 = await connection.query(sql1, [adr]);
        if(sqlr1[0].length == 0)
        {
          let x = 0;
          let y = 0;
          switch(adr)
          {
            case revData.pickup: x = revData.pickup_x; y = revData.pickup_y; break;
            case revData.hos: x = revData.hos_x; y = revData.hos_y; break;
            case revData.drop: x = revData.drop_x; y = revData.drop_y; break;
          }
          const sql2 = "insert into `address_coordinate` values (?,?,?);"
          await connection.query(sql2, [adr, x, y]);
        }
      }

      const time_startd = new Date(time_start);
      const time_endd = new Date(time_end);
      const prev_dep_timed = new Date(prev_dep_time);
      const time_start2 = time_startd.getFullYear() + "-" + (time_startd.getMonth()+1) + "-" + time_startd.getDate() + " " + time_startd.getHours() + ":" + time_startd.getMinutes();
      const time_end2 = time_endd.getFullYear() + "-" + (time_endd.getMonth()+1) + "-" + time_endd.getDate() + " " + time_endd.getHours() + ":" + time_endd.getMinutes();
      const prev_dep_time2 = prev_dep_timed.getFullYear() + "-" + (prev_dep_timed.getMonth()+1) + "-" + prev_dep_timed.getDate() + " " + prev_dep_timed.getHours() + ":" + prev_dep_timed.getMinutes();

      const sql = "insert into `car_dispatch`(`reservation_id`,`car_id`,`netsmanager_number`,`departure_address`,`destination_address`,`expect_car_pickup_time`,`expect_car_terminate_service_time`) values (?,?,?,?,?,?,?);"
      await connection.query(sql, ["200209000000", car_id, manager_number, adr_start, adr_end, time_start2, time_end2, prev_dep_time2]);
    }

    await connection.commit() // 완료시 커밋
  }
  catch (err) {
    await connection.rollback() // 실패시 롤백
    console.error("err : " + err);
    success = false;
  }
  finally {
    connection.release();
    return success;
  }
};

module.exports = InsertDispatch;
