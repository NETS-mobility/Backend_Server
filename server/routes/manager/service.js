const express = require("express");
const multer = require("multer");
const router = express.Router();

const jwt = require("../../modules/jwt");
const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");
const date_to_string = require("../../modules/date_to_string");
const evidence_checker = require("../../modules/user_evidence_check");
const upload = require("../../modules/fileupload");
const rev_state_msg = require("../../modules/reservation_state_msg");
const extracost = require("../../modules/extracost");
const case_finder = require("../../modules/dispatch_case_finder");
const gowith_finder = require("../../modules/dispatch_isOverPoint_finder");
const alarm = require("../../modules/setting_alarm");
const { checking_over_20min } = require("../../modules/time_alarm");

const reservation_state = require("../../config/reservation_state");
const service_state = require("../../config/service_state");
const payment_state = require("../../config/payment_state");
const reservation_payment_state = require("../../config/reservation_payment_state");
const uplPath = require("../../config/upload_path");
const logger = require("../../config/logger");
const alarm_reciever = require("../../config/push_alarm_reciever");
const alarm_kind = require("../../config/alarm_kind");

// ===== 서비스 목록 조회 =====
router.post("/serviceList/:listType/:date", async function (req, res, next) {
  const token = req.body.jwtToken;
  const listType = req.params.listType;
  const listDate = req.params.date;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });
  const user_num = token_res.num;

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const targetDate = new Date(listDate);
    if (!(listType >= 0 && listType <= 1)) throw (err = 0);
    if (
      listDate != "NONE" &&
      !(targetDate instanceof Date && !isNaN(targetDate))
    )
      throw (err = 0);

    let param = [user_num];
    let sql1 =
      "select distinct S.`service_kind` as `service_type`, cast(R.`reservation_id` as char) as `service_id`, `expect_pickup_time` as `pickup_time`, date_format(`hope_reservation_date`,'%Y-%m-%d') as `rev_date`, `pickup_address`, `drop_address`, " +
      "`hospital_address` as `hos_address`, `hope_hospital_arrival_time` as `hos_arrival_time`, `fixed_medical_time` as `hos_care_time`, `hope_hospital_departure_time` as `hos_depart_time`, `move_direction_id`, `gowith_hospital_time`, " +
      "U.`user_name` as `user_name`, U.`user_phone` as `user_phone`, `gowithumanager_name` as `gowithumanager`, `gowithumanager_phone`, `reservation_state_id` as `reservation_state` " +
      "from `car_dispatch` as C, `reservation` as R, `service_info` as S, `user` as U, `netsmanager` as NM " +
      "where C.`netsmanager_number`=? and C.`reservation_id`=R.`reservation_id` and R.`service_kind_id`=S.`service_kind_id` and C.`netsmanager_number`=NM.`netsmanager_number` and R.`user_number`=U.`user_number` ";

    // 날짜 검색
    if (listDate != "NONE") {
      sql1 += "and `hope_reservation_date`=? ";
      param.push(listDate);
    }

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
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err: "서버 오류" });
  } finally {
    connection.release();
  }
});

// ===== 서비스 상세보기 =====
router.post("/serviceDetail/:service_id", async function (req, res, next) {
  const service_id = req.params.service_id;
  const token = req.body.jwtToken;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });
  const user_num = token_res.num;

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    // 서비스 정보
    const sql_service =
      "select cast(R.`reservation_id` as char) as `service_id`, `pickup_address`, `hospital_address` as `hos_address`, `drop_address`, U.`user_name` as `user_name`, U.`user_phone` as `user_phone`, `reservation_state_id` as `reservation_state`, `move_direction_id`, `gowith_hospital_time`, " +
      "`expect_pickup_time` as `pickup_time`, `hope_hospital_arrival_time` as `hos_arrival_time`, `fixed_medical_time` as `hos_care_time`, `hope_hospital_departure_time` as `hos_depart_time`, S.`service_kind` as `service_type`, date_format(`hope_reservation_date`,'%Y-%m-%d') as `rev_date`, `gowithumanager_name` as `gowithumanager_name`, `gowithumanager_phone` " +
      "from `reservation` as R, `service_info` as S, `user` as U " +
      "where R.`reservation_id`=? and R.`service_kind_id`=S.`service_kind_id` and R.`user_number`=U.`user_number`;";
    const result_service = await connection.query(sql_service, [service_id]);
    const data_service = result_service[0];
    if (data_service.length == 0) throw (err = 0);

    // 서비스 상태정보
    const sql_prog =
      "select date_format(`real_car_departure_time`,'%Y-%m-%d %T') as `real_car_departure_time`, date_format(`real_pickup_time`,'%Y-%m-%d %T') as `real_pickup_time`, date_format(`real_hospital_arrival_time`,'%Y-%m-%d %T') as `real_hospital_arrival_time`, date_format(`real_return_hospital_arrival_time`,'%Y-%m-%d %T') as `real_return_hospital_arrival_time`, " + 
      "date_format(`real_return_start_time`,'%Y-%m-%d %T') as `real_return_start_time`, date_format(`real_service_end_time`,'%Y-%m-%d %T') as `real_service_end_time`, `service_state_id` from `service_progress` where `reservation_id`=?;";
    const result_prog = await connection.query(sql_prog, [service_id]);
    const data_prog = result_prog[0];

    let sstate = 0;
    let sstate_time = undefined;
    if (data_prog.length > 0) {
      sstate = data_prog[0].service_state_id;
      sstate_time = [ 0 ];
      if(data_service[0].move_direction_id != 2)
      {
        sstate_time.push(data_prog[0].real_car_departure_time); // 차량출발
        sstate_time.push(data_prog[0].real_pickup_time); // 픽업완료
        sstate_time.push(data_prog[0].real_hospital_arrival_time); // 병원도착
      }
      if(data_service[0].move_direction_id != 1)
      {
        sstate_time.push(data_prog[0].real_return_hospital_arrival_time); // 귀가차량 병원도착
        sstate_time.push(data_prog[0].real_return_start_time); // 귀가출발
        sstate_time.push(data_prog[0].real_service_end_time); // 서비스종료
      }
    }

    // 매니저 정보
    const sql_manager =
      "select `netsmanager_name` as `name`, `netsmanager_notice` as `mention` " +
      "from `netsmanager` as NM where NM.`netsmanager_number`=?;";
    const result_manager = await connection.query(sql_manager, [user_num]);
    const data_manager = result_manager[0];

    // 결제 구하기
    const sqlm =
      "select * from `extra_payment` where `payment_state_id`=? and `reservation_id`=?;";
    const sqlmr = await connection.query(sqlm, [payment_state.waitPay, service_id]);
    const isNeedExtraPay = sqlmr[0].length > 0;
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

    // 서류 제출 판단
    const document_isSubmit = await evidence_checker(service_id);

    res.send({
      document_isSubmit: document_isSubmit,
      service_state: sstate,
      service_state_time: sstate_time,
      manager: data_manager[0],
      service: data_service[0],
    });
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0)
      res.status(400).send({ err: "해당 서비스 정보가 존재하지 않습니다." });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err: "서버 오류" });
  } finally {
    connection.release();
  }
});

// ===== 서비스 상세보기 - 서비스 시간 반환 =====
router.post(
  "/serviceDetail/:service_id/progress",
  async function (req, res, next) {
    const service_id = req.params.service_id;
    const connection = await pool2.getConnection(async (conn) => conn);
    try {
      const sql_service =
        "select `move_direction_id` from `reservation` where `reservation_id`=?;";
      const result_service = await connection.query(sql_service, [service_id]);
      const data_service = result_service[0]; // 이동 방향 (집-병원=1, 병원-집=2, 집-집=3)
      if (data_service.length == 0) throw (err = 0);

      const sql_prog =
      "select date_format(`real_car_departure_time`,'%Y-%m-%d %T') as `real_car_departure_time`, date_format(`real_pickup_time`,'%Y-%m-%d %T') as `real_pickup_time`, date_format(`real_hospital_arrival_time`,'%Y-%m-%d %T') as `real_hospital_arrival_time`, date_format(`real_return_hospital_arrival_time`,'%Y-%m-%d %T') as `real_return_hospital_arrival_time`, " + 
      "date_format(`real_return_start_time`,'%Y-%m-%d %T') as `real_return_start_time`, date_format(`real_service_end_time`,'%Y-%m-%d %T') as `real_service_end_time`, `service_state_id` from `service_progress` where `reservation_id`=?;";
      const result_prog = await connection.query(sql_prog, [service_id]);
      const data_prog = result_prog[0];

      let sstate = 0;
      let sstate_time = undefined;
      if (data_prog.length > 0) {
        sstate = data_prog[0].service_state_id;
        sstate_time = [ 0 ];
        if(data_service[0].move_direction_id != 2)
        {
          sstate_time.push(data_prog[0].real_car_departure_time); // 차량출발
          sstate_time.push(data_prog[0].real_pickup_time); // 픽업완료
          sstate_time.push(data_prog[0].real_hospital_arrival_time); // 병원도착
        }
        if(data_service[0].move_direction_id != 1)
        {
          sstate_time.push(data_prog[0].real_return_hospital_arrival_time); // 귀가차량 병원도착
          sstate_time.push(data_prog[0].real_return_start_time); // 귀가출발
          sstate_time.push(data_prog[0].real_service_end_time); // 서비스종료
        }
      }
      if (sstate == service_state.carDep) {
        checking_over_20min(service_id);
      }
      res.send({
        service_state: sstate,
        service_state_time: sstate_time,
      });
    } catch (err) {
      logger.error(__filename + " : " + err);
      if (err == 0)
        res.status(400).send({ err: "해당 서비스 정보가 존재하지 않습니다." });
      else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err: "서버 오류" });
    } finally {
      connection.release();
    }
  }
);

// ===== 서비스 상세보기 - 완료 시간 설정 =====
router.post(
  "/serviceDetail/:service_id/recodeTime",
  async function (req, res, next) {
    const service_id = req.params.service_id;
    const recodeTime = req.body.recodeTime;
    const rh = recodeTime.hours;
    const rm = recodeTime.minutes;

    let recode_date = date_to_string(new Date()).substr(0, 10) + " ";
    recode_date += (rh >= 10) ? rh : "0" + rh;
    recode_date += ":";
    recode_date += (rm >= 10) ? rm : "0" + rm;
    recode_date += ":00";

    let result_extraCost; // 추가요금 계산 결과

    const connection = await pool2.getConnection(async (conn) => conn);
    try {
      await connection.beginTransaction();

      const sql_dire =
        "select `move_direction_id` from `reservation` where `reservation_id`=?;";
      const result_dire = await connection.query(sql_dire, [service_id]);
      const data_dire = result_dire[0];
      const direction = data_dire[0].move_direction_id; // 이동 방향 (집-병원=1, 병원-집=2, 집-집=3)

      // 현재 서비스 상태 구하기
      const sql_prog =
        "select `service_state_id` from `service_progress` where `reservation_id`=?;";
      const result_prog = await connection.query(sql_prog, [service_id]);
      const data_prog = result_prog[0];
      
      let next_state = data_prog[0].service_state_id + 1;
      if (direction == 2 && next_state == service_state.carDep)
        next_state = service_state.carReady;
      if (direction != 1 && next_state > service_state.complete)
        next_state = service_state.complete;
      if (direction == 1 && next_state > service_state.arrivalHos)
        next_state = service_state.arrivalHos;
      
      // 상태 설정
      let prog;
      switch (next_state) {
        case service_state.carDep:
          prog = "real_car_departure_time";
          break; // 차량출발
        case service_state.pickup:
          prog = "real_pickup_time";
          break; // 픽업완료
        case service_state.arrivalHos:
          prog = "real_hospital_arrival_time";
          break; // 병원도착
        case service_state.carReady:
          prog = "real_return_hospital_arrival_time";
          break; // 귀가차량 병원도착
        case service_state.goHome:
          prog = "real_return_start_time";
          break; // 귀가출발
        default:
          prog = "real_service_end_time";
          break; // 서비스종료
      }

      const spl =
        "update `service_progress` set `" +
        prog +
        "`=?, `service_state_id`=? where `reservation_id`=?;";
      await connection.query(spl, [recode_date, next_state, service_id]);

      // 서비스 진행 중 설정
      if (next_state == service_state.carDep) {
        const sqln = `UPDATE reservation SET reservation_state_id=? WHERE reservation_id=?;`;
        await connection.query(sqln, [
          reservation_state.inProgress,
          service_id,
        ]);
      }

      /*
      const sql_alarm =
        "select user_id as id from user as u join reservation as r on u.user_number = r.user_number " +
        "where r.reservation_id =?;";
      const alarm_res = await connection.query(sql_alarm, [service_id]);
      const user_id = alarm_res[0].id;
      console.log("userid =", user_id);

      // 동행상황 보고(알림)
      alarm.set_alarm(
        alarm_reciever.customer,
        service_id,
        alarm_kind.report_end,
        "A1@naver.com"
      );*/

      // 서비스 종료 후 추가 요금 정보
      let next_pay_state;
      const srv_end = (direction != 1) ? next_state == service_state.complete : next_state == service_state.arrivalHos;
      
      if (srv_end) {
        /*result_extraCost = await extracost.calExtracost(service_id);
        if (extraCost > 0) {
          const sql_cost = `INSERT INTO extra_payment(reservation_id, merchant_uid, payment_state_id, payment_amount,
                            over_gowith_cost, over_gowith_time, delay_cost, delay_time
                            ) VALUES(?,?,?,?,?,?,?,?);`;
          await connection.query(sql_cost, [
            service_id,
            String(service_id)+"E",
            payment_state.waitPay,
            result_extraCost.TotalExtraCost,
            result_extraCost.overGowithTimeCost,
            result_extraCost.overGowithTime,
            result_extraCost.delayTimeCost,
            result_extraCost.delayTime,
          ]);
          next_pay_state = reservation_payment_state.waitExtraPay;
        } else {
          next_pay_state = reservation_payment_state.completeAllPay;
        }
        const sql_pay_prog = `UPDATE reservation SET reservation_state_id=?, reservation_payment_state_id=? WHERE reservation_id=?;`;
        await connection.query(sql_pay_prog, [
          reservation_state.complete,
          next_pay_state,
          service_id,
        ]);*/

        /*// == 알림 전송 ==

        // 대기요금 요청
        alarm.set_alarm(
          alarm_reciever.customer,
          service_id,
          alarm_kind.waiting_payment,
          user_id,
          [alarm_res.real_hospital_gowith_time, result_extraCost.overGowithCost]
        );
        // 동행 추가요금 결제 요청
        alarm.set_alarm(
          alarm_reciever.customer,
          service_id,
          alarm_kind.extra_payment,
          user_id,
          [result_extraCost.delayTime, result_extraCost.delayTimeCost]
        );*/

        res
          .status(200)
          .send({ success: true, extraCost: 0 }); // extraCost: result_extraCost.TotalExtraCost
      } else res.status(200).send({ success: true });
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      logger.error(__filename + " : " + err);
      if (err == 0) res.status(400).send({ err: "잘못된 인자입니다." });
      else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err: "서버 오류" });
    } finally {
      connection.release();
    }
  }
);

// ===== 서비스 상세보기 - 필수서류 제출 =====
router.post(
  "/serviceDetail/:service_id/submitDoc",
  upload(uplPath.customer_document).single("file"),
  async function (req, res, next) {
    const file = req.file;
    if (file === undefined)
      return res.status(400).send({ err: "파일이 업로드되지 않았습니다." });

    const service_id = req.params.service_id;
    const filepath = uplPath.customer_document + file.filename; // 업로드 파일 경로

    const connection = await pool2.getConnection(async (conn) => conn);
    try {
      const spl =
        "update `reservation_user` set `valid_target_evidence_path`=?, `is_submit_evidence`=1 where `reservation_id`=?;";
      const sqlr = await connection.query(spl, [filepath, service_id]);
      if (sqlr[0].affectedRows == 0) throw (err = 0);
      res.send();
    } catch (err) {
      logger.error(__filename + " : " + err);
      if (err == 0) res.status(500).send({ err: "파일 업로드 등록 실패!" });
      else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err: "서버 오류" });
    } finally {
      connection.release();
    }
  }
);

module.exports = router;
