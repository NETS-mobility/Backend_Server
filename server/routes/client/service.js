const express = require("express");
const router = express.Router();

const jwt = require("../../modules/jwt");
const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");

const reservation_state = require("../../config/reservation_state");
const service_state = require("../../config/service_state");
const payment_state = require("../../config/payment_state");
const rev_state_msg = require("../../modules/reservation_state_msg");
const case_finder = require("../../modules/dispatch_case_finder");
const gowith_finder = require("../../modules/dispatch_isOverPoint_finder");
const get_service_progress = require("../../modules/get_service_progress");
const logger = require("../../config/logger");

// ===== 서비스 목록 조회 =====
router.post("/serviceList/:listType", async function (req, res, next) {
  const token = req.body.jwtToken;
  const listType = req.params.listType;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });
  const user_num = token_res.num;

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    if (!(listType >= 0 && listType <= 1)) throw (err = 0);

    let param = [user_num];
    let sql1 =
      "select S.`service_kind` as `service_type`, cast(R.`reservation_id` as char) as `service_id`, `expect_pickup_time` as `pickup_time`, date_format(`hope_reservation_date`,'%Y-%m-%d') as `rev_date`, `pickup_address`, `drop_address`, " +
      "`hospital_address` as `hos_address`, `hospital_name` as `hos_name`, `hope_hospital_arrival_time` as `hos_arrival_time`, `fixed_medical_time` as `hos_care_time`, `hope_hospital_departure_time` as `hos_depart_time`, " +
      "`gowithumanager_name` as `gowithumanager`, `gowithumanager_phone`, `reservation_state_id` as `reservation_state`, `move_direction_id`, `gowith_hospital_time` " +
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

    sql1 += "order by `rev_date`, `pickup_time`;";
    const result1 = await connection.query(sql1, param);
    const data1 = result1[0];

    // 매니저 & 차량 구하기
    for (let i = 0; i < data1.length; i++) {
      const sqlm =
        "select C.`car_id`, `car_number`, NM.`netsmanager_id`, NM.`netsmanager_number`, NM.`netsmanager_name`, date_format(`expect_car_pickup_time`,'%Y-%m-%d %T') as `expCarPickupTime`, date_format(`expect_car_terminate_service_time`,'%Y-%m-%d %T') as `expCarTerminateServiceTime` " +
        "from `reservation` as R, `car_dispatch`as D, `netsmanager` as NM, `car` as C " +
        "where R.`reservation_id`=? and R.`reservation_id`=D.`reservation_id` and D.`netsmanager_number`=NM.`netsmanager_number` and D.`car_id`=C.`car_id`;";
      const sqlmr = await connection.query(sqlm, [data1[i].service_id]);
      data1[i].dispatch = sqlmr[0];
    }

    // reservation_state 결정
    for (let i = 0; i < data1.length; i++) {
      const sqlm =
        "select * from `extra_payment` where `payment_state_id`=? and `reservation_id`=?;";
      const sqlmr = await connection.query(sqlm, [payment_state.waitPay, data1[i].service_id]);
      const isNeedExtraPay = sqlmr[0].length > 0;
      data1[i].reservation_state = rev_state_msg(
        data1[i].reservation_state,
        isNeedExtraPay
      );

      // 배차 case 결정
      data1[i].dispatch_case = case_finder(
        data1[i].move_direction_id,
        data1[i].gowith_hospital_time
      );
      data1[i].isOverPoint = gowith_finder(data1[i].gowith_hospital_time);
    }

    res.send(data1);
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0) res.status(400).send({ err: "잘못된 인자 전달" });
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
      "select cast(`reservation_id` as char) as `service_id`, `expect_pickup_time` as `pickup_time`, date_format(`hope_reservation_date`,'%Y-%m-%d') as `rev_date`, `pickup_address` as `pickup_address`, `hospital_address` as `hos_address`, `hospital_name` as `hos_name`, `drop_address`, `reservation_payment_state_id`, " +
      "`hope_hospital_arrival_time` as `hos_arrival_time`, `fixed_medical_time` as `hos_care_time`, `hope_hospital_departure_time` as `hos_depart_time`, `gowithumanager_name` as `gowithumanager`, `gowithumanager_phone`, `reservation_state_id` as `reservation_state`, `move_direction_id`, `gowith_hospital_time` " +
      "from `reservation` where `reservation_id`=?;";
    const result_service = await connection.query(sql_service, [service_id]);
    const data_service = result_service[0];
    if (data_service.length == 0) throw (err = 0);

    // 서비스 상태정보
    const service_prog = await get_service_progress(service_id, data_service[0].move_direction_id);
    let service_state;
    let service_state_time;
    if(service_prog !== undefined) {
      service_state = service_prog.service_state;
      service_state_time = service_prog.service_state_time;
    }

    // 매니저 정보
    const sqld =
      "select C.`car_id`, `car_number`, NM.`netsmanager_id`, NM.`netsmanager_number`, NM.`netsmanager_name`, " +
      "`netsmanager_about_me` as `netsmanager_intro`, `netsmanager_phone` as `netsmanager_tel`, `netsmanager_notice` as `netsmanager_mention`, date_format(`expect_car_pickup_time`,'%Y-%m-%d %T') as `expCarPickupTime`, date_format(`expect_car_terminate_service_time`,'%Y-%m-%d %T') as `expCarTerminateServiceTime`  " +
      "from `reservation` as R, `car_dispatch`as D, `netsmanager` as NM, `car` as C " +
      "where R.`reservation_id`=? and R.`reservation_id`=D.`reservation_id` and D.`netsmanager_number`=NM.`netsmanager_number` and D.`car_id`=C.`car_id`;";
    const sqldr = await connection.query(sqld, [service_id]);
    const sqldd = sqldr[0];

    // 매니저 자격증
    for (let i = 0; i < sqldd.length; i++) {
      const sqlmc =
        "select `netsmanager_certificate_name` as `name` from `manager_certificate` where `netsmanager_number`=?;";
      const sqlmcr = await connection.query(sqlmc, [
        sqldd[i].netsmanager_number,
      ]);
      sqldd[i].netsmanager_certificate = sqlmcr[0];
    }

    // 결제 정보
    const sqlp =
      "select `payment_amount` as `cost` from `base_payment` where  `reservation_id`=?;";
    const sqlpr = await connection.query(sqlp, [service_id]);
    const sqlpd = sqlpr[0];

    // reservation_state 결정
    const sqlm =
      "select * from `extra_payment` where `payment_state_id`=? and `reservation_id`=?;";
    const sqlmr = await connection.query(sqlm, [payment_state.waitPay, service_id]);
    const isNeedExtraPay = sqlmr[0].length > 0;
    data_service[0].reservation_state_id = data_service[0].reservation_state; // 기존 reservation_state_id
    data_service[0].reservation_state = rev_state_msg(
      data_service[0].reservation_state,
      isNeedExtraPay
    );

    // 배차 case 결정
    data_service[0].dispatch_case = case_finder(
      data_service[0].move_direction_id,
      data_service[0].gowith_hospital_time
    );
    data_service[0].isOverPoint = gowith_finder(
      data_service[0].gowith_hospital_time
    );

    let charge = "";
    let extraPay = "";
    if (sqlpd.length >= 1) charge = sqlpd[0].cost;
    if (sqlpd.length >= 2) extraPay = sqlpd[1].cost;

    res.send({
      dispatch: sqldd,
      service: data_service[0],
      service_state: service_state,
      service_state_time: service_state_time,
      payment: {
        charge: charge,
        extraPay: extraPay,
      },
    });
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0)
      res.status(400).send({ err: "해당 서비스 정보가 존재하지 않습니다." });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});

module.exports = router;
