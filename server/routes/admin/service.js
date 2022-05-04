const express = require("express");
const router = express.Router();

const jwt = require("../../modules/jwt");
const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");
const token_checker = require("../../modules/admin_token");
const case_finder = require("../../modules/dispatch_case_finder");
const gowith_finder = require("../../modules/dispatch_isOverPoint_finder");
const rev_state_msg = require("../../modules/reservation_state_msg");
const get_service_progress = require("../../modules/get_service_progress");

const reservation_state = require("../../config/reservation_state");
const service_state = require("../../config/service_state");
const payment_state = require("../../config/payment_state");
const logger = require("../../config/logger");

// ===== 서비스 목록 조회 =====
router.post(
  "/serviceList/:listType/:listDate",
  async function (req, res, next) {
    const listType = req.params.listType;
    const listDate = req.params.listDate; // 전체 날짜 출력시 "NONE"
    if (!(await token_checker(req.body.jwtToken))) {
      res.status(401).send({ err: "접근 권한이 없습니다." });
      return;
    }

    const connection = await pool2.getConnection(async (conn) => conn);
    try {
      const targetDate = new Date(listDate);
      if (!(listType >= 0 && listType <= 3)) throw (err = 0);
      if (
        listDate != "NONE" &&
        !(targetDate instanceof Date && !isNaN(targetDate))
      )
        throw (err = 0);

      const param = [];
      let sql1 =
        "select cast(`reservation_id` as char) as `service_id`, `expect_pickup_time` as `pickup_time`, date_format(`hope_reservation_date`,'%Y-%m-%d') as `rev_date` " +
        "from `reservation` where `reservation_state_id`=? ";

      if (listType == 0) param.push(reservation_state.new); // 결제 전
      if (listType == 1) param.push(reservation_state.ready); // 운행 전
      else if (listType == 2) param.push(reservation_state.inProgress); // 운행 시작
      else param.push(reservation_state.complete); // 운행 종료

      if (listDate != "NONE") {
        sql1 += "and `hope_reservation_date`=? ";
        param.push(listDate);
      }
      sql1 += "order by `rev_date`, `pickup_time`;";

      const result1 = await connection.query(sql1, param);
      const data1 = result1[0];

      for (
        let i = 0;
        i < data1.length;
        i++ // 매니저 구하기
      ) {
        const sqlm =
          "select NM.`netsmanager_id` as `id`, NM.`netsmanager_number` as `number` from `reservation` as R, `car_dispatch`as D, `netsmanager` as NM " +
          "where R.`reservation_id`=? and R.`reservation_id`=D.`reservation_id` and D.`netsmanager_number`=NM.`netsmanager_number`;";
        const sqlmr = await connection.query(sqlm, [data1[i].service_id]);
        data1[i].netsmanager = sqlmr[0];
      }
      res.send(data1);
    } catch (err) {
      logger.error(__filename + " : " + err);
      if (err == 0) res.status(400).send({ err: "잘못된 인자 전달" });
      else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
    } finally {
      connection.release();
    }
  }
);

// ===== 서비스 상세보기 =====
router.post("/serviceDetail/:service_id", async function (req, res, next) {
  const service_id = req.params.service_id;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    // 서비스 정보
    const sql_service =
      "select cast(R.`reservation_id` as char) as `service_id`, `expect_pickup_time` as `pickup_time`, `pickup_address`, `hospital_address` as `hos_address`, `drop_address`, date_format(`hope_reservation_date`,'%Y-%m-%d') as `rev_date`, " +
      "`hope_hospital_arrival_time` as `hos_arrival_time`, `fixed_medical_time` as `hos_care_time`, `hope_hospital_departure_time` as `hos_depart_time`, `gowithumanager_name` as `gowithumanager`, `gowithumanager_phone`, " +
      "`reservation_state_id` as `reservation_state`, R.`user_number` as `customer_number`, U.`user_name` as `customer_name`, S.`service_kind` as `service_type`, `move_direction_id`, `gowith_hospital_time` " +
      "from `reservation` as R, `user` as U, `service_info` as S " +
      "where R.`reservation_id`=? and R.`user_number`=U.`user_number` and R.`service_kind_id`=S.`service_kind_id`;";
    const result_service = await connection.query(sql_service, [service_id]);
    const data_service = result_service[0];
    if (data_service.length == 0) throw (err = 0);

    // 서비스 상태정보
    const service_prog = await get_service_progress(service_id, data_service[0].move_direction_id);
    if(service_prog === undefined) throw (err = 0);

    // 배차 (매니저 & 차량)
    const sqld =
      "select C.`car_id`, `car_number`, NM.`netsmanager_id`, NM.`netsmanager_number`, NM.`netsmanager_name`, " +
      "`car_dispatch_number`, `departure_address`, `destination_address`, date_format(`expect_car_pickup_time`,'%Y-%m-%d %T') as `pickup_time`, date_format(`expect_car_terminate_service_time`,'%Y-%m-%d %T') as `terminate_time`, `car_move_direction_id` as `dire` " +
      "from `reservation` as R, `car_dispatch`as D, `netsmanager` as NM, `car` as C " +
      "where R.`reservation_id`=? and R.`reservation_id`=D.`reservation_id` and D.`netsmanager_number`=NM.`netsmanager_number` and D.`car_id`=C.`car_id`;";
    const sqldr = await connection.query(sqld, [service_id]);

    // 결제
    const sqlm =
      "select * from `extra_payment` where `payment_state_id`=? and `reservation_id`=?;";
    const sqlmr = await connection.query(sqlm, [payment_state.waitPay, service_id]);
    const isNeedExtraPay = sqlmr[0].length > 0;
    data_service[0].reservation_state = rev_state_msg(
      data_service[0].reservation_state,
      isNeedExtraPay
    );

    const sqlm2 =
      "select `payment_method`, `payment_amount` from `base_payment` where `reservation_id`=?;";
    const sqlmr2 = await connection.query(sqlm2, [service_id]);
    let payMethod = "";
    let payCost = 0;
    if (sqlmr2[0].length > 0) {
      payMethod = sqlmr2[0][0].payment_method;
      payCost = sqlmr2[0][0].payment_amount;
    }

    // 배차 case 결정
    data_service[0].dispatch_case = case_finder(data_service[0].move_direction_id, data_service[0].gowith_hospital_time);
    data_service[0].isOverPoint = gowith_finder(data_service[0].gowith_hospital_time);

    res.send({
      service_state: service_prog.service_state,
      service_state_time: service_prog.service_state_time,
      service: data_service[0],
      dispatch: sqldr[0],
      payMethod: payMethod,
      payCost: payCost,
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

// ===== 서비스 상세보기 - 진행상태 변경 =====
router.post(
  "/serviceDetail/:service_id/changeProg",
  async function (req, res, next) {
    const service_id = req.params.service_id;
    const next_state = req.body.service_state;
    const recTime = req.body.service_state_time;
    if (!(await token_checker(req.body.jwtToken))) {
      res.status(401).send({ err: "접근 권한이 없습니다." });
      return;
    }

    const connection = await pool2.getConnection(async (conn) => conn);
    try {
      const param = [next_state, recTime.carDep, recTime.pickup, recTime.arrivalHos, recTime.carReady, recTime.goHome, recTime.complete];
      const target = ["service_state_id", "real_car_departure_time", "real_pickup_time", "real_hospital_arrival_time", "real_return_hospital_arrival_time", "real_return_start_time", "real_service_end_time"];
      for(let i = 0; i <= 6; i++)
      {
        if(param[i] === undefined) continue;
        const sql = "update `service_progress` set `" + target[i] + "`=? where `reservation_id`=?;";
        const result = await connection.query(sql, [param[i], service_id]);
        if (result[0].affectedRows == 0) throw (err = 0);
      }
      res.status(200).send();
    } catch (err) {
      logger.error(__filename + " : " + err);
      if (err == 0) res.status(500).send({ err: "정보 변경 실패" });
      else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
    } finally {
      connection.release();
    }
  }
);

// ===== 서비스 상세보기 - 네츠매니저 목록 반환 =====
router.post(
  "/serviceDetail/:service_id/getNetsmanList",
  async function (req, res, next) {
    const service_id = req.params.service_id;
    if (!(await token_checker(req.body.jwtToken))) {
      res.status(401).send({ err: "접근 권한이 없습니다." });
      return;
    }

    const connection = await pool2.getConnection(async (conn) => conn);
    try {
      // 예약날짜 구하기
      const sql_date =
        "select `hope_reservation_date` from `reservation` where `reservation_id`=?;";
      const result_date = await connection.query(sql_date, [service_id]);
      const data_date = result_date[0];
      if (data_date.length == 0) throw (err = 0);

      // 매니저 구하기 (승인된 휴가 날짜가 예약날짜를 포함하는 매니저 필터링)
      const revDate = data_date[0].hope_reservation_date;
      const sql_man =
        "select `netsmanager_name` as `name`, `netsmanager_id` as `id`, `netsmanager_number` as `number` from `netsmanager` as M where " +
        "not exists (select * from `manager_holiday` as H where M.`netsmanager_number`=H.`netsmanager_number` and `holiday_certified`=1 and `start_holiday_date`<=? and `end_holiday_date`>=?);";
      const result_man = await connection.query(sql_man, [revDate, revDate]);
      const data_man = result_man[0];

      res.send(data_man);
    } catch (err) {
      logger.error(__filename + " : " + err);
      if (err == 0) res.status(500).send({ err: "검색 실패" });
      else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
    } finally {
      connection.release();
    }
  }
);

// ===== 서비스 상세보기 - 네츠매니저 변경 =====
router.post(
  "/serviceDetail/:service_id/changeNetsman",
  async function (req, res, next) {
    const dispatch_id = req.body.dispatch_id;
    const manager_number = req.body.manager_number;
    if (!(await token_checker(req.body.jwtToken))) {
      res.status(401).send({ err: "접근 권한이 없습니다." });
      return;
    }

    const connection = await pool2.getConnection(async (conn) => conn);
    try {
      const spl =
        "update `car_dispatch` set `netsmanager_number`=? where `car_dispatch_number`=?;";
      const result = await connection.query(spl, [manager_number, dispatch_id]);
      if (result[0].affectedRows == 0) throw (err = 0);
      res.status(200).send();
    } catch (err) {
      logger.error(__filename + " : " + err);
      if (err == 0) res.status(500).send({ err: "매니저 변경 실패" });
      else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
    } finally {
      connection.release();
    }
  }
);

module.exports = router;
