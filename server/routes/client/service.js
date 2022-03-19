const express = require("express");
const router = express.Router();

const jwt = require("../../modules/jwt");
const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");

const reservation_state = require("../../config/reservation_state");
const service_state = require("../../config/service_state");

// ===== 서비스 목록 조회 =====
router.post("/serviceList/:listType", async function (req, res, next) {
  const token = req.body.jwtToken;
  const listType = req.params.listType;

  console.log("token==", token);
  console.log("listType==", listType);

  const token_res = await jwt.verify(token);
  console.log("token_res==", token_res);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });
  const user_num = token_res.num;
  console.log("user_num==", user_num);

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    if (!(listType >= 0 && listType <= 1)) throw (err = 0);

    let param = [user_num];
    console.log("param==", param);
    let sql1 =
      "select S.`service_kind` as `service_type`, cast(R.`reservation_id` as char) as `service_id`, `expect_pickup_time` as `pickup_time`, `hope_reservation_date` as `rev_date`, `pickup_address`, " +
      "`hospital_address` as `hos_address`, `hope_hospital_arrival_time` as `hos_arrival_time`, `fixed_medical_time` as `hos_care_time`, `hope_hospital_departure_time` as `hos_depart_time`, " +
      "`gowithmanager_name` as `gowithumanager`, `reservation_state_id` as `reservation_state` " +
      "from `reservation` as R, `service_info` as S " +
      "where `user_number`=? and R.`service_kind_id`=S.`service_kind_id` ";

    // 서비스 진행상태 분기점
    if (listType == 0) {
      sql1 += "and `reservation_state_id` in (?,?) ";
      param.push(reservation_state.ready, reservation_state.inProgress);
    } else {
      sql1 += "and `reservation_state_id`=? ";
      param.push(reservation_state.complete);
    }
    console.log("sql1 after concat==", sql1);
    console.log("param after push==", param);

    sql1 += "order by `rev_date` and `pickup_time`;";
    const result1 = await connection.query(sql1, param);
    const data1 = result1[0];
    console.log("data1 (sql1)", data1);

    // 매니저 & 차량 구하기
    for (let i = 0; i < data1.length; i++) {
      const sqlm =
        "select C.`car_id`, `car_number`, NM.`netsmanager_id`, NM.`netsmanager_number`, NM.`netsmanager_name` " +
        "from `reservation` as R, `car_dispatch`as D, `netsmanager` as NM, `car` as C " +
        "where R.`reservation_id`=? and R.`reservation_id`=D.`reservation_id` and D.`netsmanager_number`=NM.`netsmanager_number` and D.`car_id`=C.`car_id`;";
      const sqlmr = await connection.query(sqlm, [data1[i].service_id]);
      data1[i].dispatch = sqlmr[0];
    }
    console.log("data1 (sqlm)", data1);

    // 결제 구하기
    for (let i = 0; i < data1.length; i++) {
      const sqlm =
        "select * from `payment` where `payment_type`=2 and `payment_state_id`=1 and `reservation_id`=?;";
      const sqlmr = await connection.query(sqlm, [data1[i].service_id]);
      data1[i].isNeedExtraPay = sqlmr[0].length > 0;
    }
    console.log("data1 (sqlmr)", data1);
    res.send(data1);
  } catch (err) {
    console.error("err : " + err);
    if (err == 0) res.status(401).send({ err: "잘못된 인자 전달" });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});

// ===== 서비스 상세보기 =====
router.post("/serviceDetail/:service_id", async function (req, res, next) {
  const service_id = req.params.service_id;

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    // 서비스 정보
    const sql_service =
      "select cast(`reservation_id` as char) as `service_id`, `expect_pickup_time` as `pickup_time`, `hope_reservation_date` as `rev_date`, `pickup_address` as `pickup_address`, `hospital_address` as `hos_address`, " +
      "`hope_hospital_arrival_time` as `hos_arrival_time`, `fixed_medical_time` as `hos_care_time`, `hope_hospital_departure_time` as `hos_depart_time`, `gowithmanager_name` as `gowithumanager`, `reservation_state_id` as `reservation_state` " +
      "from `reservation` where `reservation_id`=?;";
    const result_service = await connection.query(sql_service, [service_id]);
    const data_service = result_service[0];

    if (data_service.length == 0) throw (err = 0);

    // 서비스 상태정보
    const sql_prog =
      "select * from `service_progress` where `reservation_id`=?;";
    const result_prog = await connection.query(sql_prog, [service_id]);
    const data_prog = result_prog[0];

    let sstate = 0;
    let sstate_time = undefined;
    if (data_prog.length > 0)
    {
      sstate = data_prog[0].service_state_id;
      sstate_time = [];
      sstate_time[service_state.pickup] = data_prog[0].real_pickup_time; // 픽업완료
      sstate_time[service_state.arrivalHos] = data_prog[0].real_hospital_arrival_time; // 병원도착
      sstate_time[service_state.carReady] = data_prog[0].real_return_hospital_arrival_time; // 귀가차량 병원도착
      sstate_time[service_state.goHome] = data_prog[0].real_return_start_time; // 귀가출발
      sstate_time[service_state.complete] = data_prog[0].real_service_end_time; // 서비스종료
    }

    // 매니저 정보
    const sqld =
      "select C.`car_id`, `car_number`, NM.`netsmanager_id`, NM.`netsmanager_number`, NM.`netsmanager_name`, " +
      "`netsmanager_about_me` as `netsmanager_intro`, `netsmanager_phone` as `netsmanager_tel`, `netsmanager_notice` as `netsmanager_mention` " +
      "from `reservation` as R, `car_dispatch`as D, `netsmanager` as NM, `car` as C " +
      "where R.`reservation_id`=? and R.`reservation_id`=D.`reservation_id` and D.`netsmanager_number`=NM.`netsmanager_number` and D.`car_id`=C.`car_id`;";
    const sqldr = await connection.query(sqld, [service_id]);

    // 결제 정보
    const sqlp =
      "select `payment_amount` as `cost` from `payment` where  `reservation_id`=? order by `payment_type`;";
    const sqlpr = await connection.query(sqlp, [service_id]);

    res.send({
      dispatch: sqldr[0],
      service: data_service[0],
      service_state: sstate,
      service_state_time: sstate_time,
      payment: {
        charge: sqlpr[0][0].cost,
        extraPay: sqlpr[0][1].cost,
      },
    });
  } catch (err) {
    console.error("err : " + err);
    if (err == 0)
      res.status(401).send({ err: "해당 서비스 정보가 존재하지 않습니다." });
    else if (err == 1)
      res
        .status(401)
        .send({ err: "해당 서비스 진행정보가 존재하지 않습니다." });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});

module.exports = router;
