// === 특정 차량이 맡은 인접 예약의 병원-집 도착 장소를 구하는 모듈 ===
// 인접 기준 - 서비스 시작 시간

// id: 차량 아이디
// rtime: 서비스 시작 시간 (Date 객체)

/*
 * 이전 예약정보: prev 
 *    종료시간: time (없을 경우 운행시작시간)
 *    예약장소 x: x
 *    예약장소 y: y
 * 다음 예약정보: next (없을 경우 운행종료시간)
 *    종료시간: time
 *    예약장소 x: x
 *    예약장소 y: y
 * (예약정보가 없을 경우, 장소는 차고지주소)
 */

const work_start_time = "09:00:00"; // 운행시작시간
const work_close_time = "21:00:00"; // 운행종료시간

const pool2 = require("../util/mysql2");

const getCarAdjRev = async (id, pickupTime) => {
  let result;
  
  const pickupDate = new Date(pickupTime);
  const year = pickupDate.getFullYear();
  let month = (pickupDate.getMonth()+1);
  month = (month < 10) ? "0" + month : month;
  let day = pickupDate.getDate();
  day = (day < 10) ? "0" + day : day;
  const rd = year + "-" + month + "-" + day;

  let hours = pickupDate.getHours();
  hours = (hours < 10) ? "0" + hours : hours;
  let minutes = pickupDate.getMinutes();
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  const rt = hours + ":" + minutes;

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 = "select * from `car_reservation` where `car_id`=? and `date`=? and `terminate_time`<? order by `terminate_time` DESC;";
    const sqlr1 = await connection.query(sql1, [id, rd, rt]);
    const sqld1 = sqlr1[0];
    const sql2 = "select * from `car_reservation` where `car_id`=? and `date`=? and `pickup_time`>? order by `pickup_time`;";
    const sqlr2 = await connection.query(sql2, [id, rd, rt]);
    const sqld2 = sqlr2[0];
    const sql3 = "select `x_coordinate` as `x`, `y_coordinate` as `y` from `car` as C, `address_coordinate` as A where C.`car_id`=? and C.`garage_detail_address`=A.`address`;";

    let prev, next;
    if(sqld1.length > 0)
    {
      prev = {
        time: rd + "T" + sqld1[0].terminate_time + "+0900",
        x: sqld1[0].arrival_x,
        y: sqld1[0].arrival_y
      }
    }
    else
    {
      const sqlr3 = await connection.query(sql3, [id]);
      const sqld3 = sqlr3[0]; // 차고지주소 가져오기
      prev = {
        time: rd + "T" + work_start_time + "+0900",
        x: sqld3[0].x,
        y: sqld3[0].y
      }
    }
    if(sqld2.length > 0)
    {
      next = {
        time: rd + "T" + sqld2[0].pickup_time + "+0900",
        x: sqld2[0].start_x,
        y: sqld2[0].start_y
      }
    }
    else
    {
      const sqlr3 = await connection.query(sql3, [id]);
      const sqld3 = sqlr3[0];
      next = {
        time: rd + "T" + work_close_time + "+0900",
        x: sqld3[0].x,
        y: sqld3[0].y
      }
    }

    result = {
        prev: prev,
        next: next
    };
  } catch (err) {
    console.error("err : " + err);
  } finally {
    connection.release();
    return result;
  }
};
module.exports = getCarAdjRev;
