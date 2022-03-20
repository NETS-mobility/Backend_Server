const express = require("express");
const multer = require("multer");
const router = express.Router();

const jwt = require("../../modules/jwt");
const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");
const evidence_checker = require("../../modules/user_evidence_check");
const upload = require("../../modules/fileupload");
const rev_state_msg = require("../../modules/reservation_state_msg");

const reservation_state = require("../../config/reservation_state");
const service_state = require("../../config/service_state");
const uplPath = require("../../config/upload_path");
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
      "select S.`service_kind` as `service_type`, cast(R.`reservation_id` as char) as `service_id`, `expect_pickup_time` as `pickup_time`, `hope_reservation_date` as `rev_date`, `pickup_address`, " +
      "`hospital_address` as `hos_address`, `hope_hospital_arrival_time` as `hos_arrival_time`, `fixed_medical_time` as `hos_care_time`, `hope_hospital_departure_time` as `hos_depart_time`, " +
      "U.`user_name` as `user_name`, U.`user_phone` as `user_phone`, `gowithmanager_name` as `gowithumanager`, `reservation_state_id` as `reservation_state` " +
      "from `car_dispatch` as C, `reservation` as R, `service_info` as S, `user` as U, `netsmanager` as NM " +
      "where C.`netsmanager_number`=? and C.`reservation_id`=R.`reservation_id` and R.`service_kind_id`=S.`service_kind_id` and C.`netsmanager_number`=NM.`netsmanager_number` and R.`user_number`=U.`user_number` ";

    // 서비스 진행상태 분기점
    if (listType == 0) {
      sql1 += "and `reservation_state_id` in (?,?) ";
      param.push(reservation_state.ready, reservation_state.inProgress);
    } else {
      sql1 += "and `reservation_state_id`=? ";
      param.push(reservation_state.complete);
    }

    sql1 += "order by `rev_date` and `pickup_time`;";
    const result1 = await connection.query(sql1, param);
    const data1 = result1[0];

    // reservation_state 결정
    for (let i = 0; i < data1.length; i++) {
      const sqlm =
        "select * from `payment` where `payment_type`=2 and `payment_state_id`=1 and `reservation_id`=?;";
      const sqlmr = await connection.query(sqlm, [data1[i].service_id]);
      const isNeedExtraPay = sqlmr[0].length > 0;
      data1[i].reservation_state = rev_state_msg(
        data1[i].reservation_state,
        isNeedExtraPay
      );
    }

    res.send(data1);
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0) res.status(401).send({ err: "잘못된 인자 전달" });
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

  if (!(await evidence_checker(service_id)))
    return res.send({ document_isSubmit: false }); // 필수 서류 미제출

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    // 서비스 정보
    const sql_service =
      "select cast(R.`reservation_id` as char) as `service_id`, `pickup_address`, `hospital_address` as `hos_address`, U.`user_name` as `user_name`, U.`user_phone` as `user_phone`, `reservation_state_id` as `reservation_state`, " +
      "`expect_pickup_time` as `pickup_time`, `hope_hospital_arrival_time` as `hos_arrival_time`, `fixed_medical_time` as `hos_care_time`, `hope_hospital_departure_time` as `hos_depart_time`, S.`service_kind` as `service_type`, `hope_reservation_date` as `rev_date`, `gowithmanager_name` as `gowithumanager_name` " +
      "from `reservation` as R, `service_info` as S, `user` as U " +
      "where R.`reservation_id`=? and R.`service_kind_id`=S.`service_kind_id` and R.`user_number`=U.`user_number`;";
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
    if (data_prog.length > 0) {
      sstate = data_prog[0].service_state_id;
      sstate_time = [];
      sstate_time[service_state.pickup] = data_prog[0].real_pickup_time; // 픽업완료
      sstate_time[service_state.arrivalHos] =
        data_prog[0].real_hospital_arrival_time; // 병원도착
      sstate_time[service_state.carReady] =
        data_prog[0].real_return_hospital_arrival_time; // 귀가차량 병원도착
      sstate_time[service_state.goHome] = data_prog[0].real_return_start_time; // 귀가출발
      sstate_time[service_state.complete] = data_prog[0].real_service_end_time; // 서비스종료
    }

    // 매니저 정보
    const sql_manager =
      "select `netsmanager_name` as `name`, `netsmanager_notice` as `mention` " +
      "from `netsmanager` as NM where NM.`netsmanager_number`=?;";
    const result_manager = await connection.query(sql_manager, [user_num]);
    const data_manager = result_manager[0];

    // 결제 구하기
    const sqlm =
      "select * from `payment` where `payment_type`=2 and `payment_state_id`=1 and `reservation_id`=?;";
    const sqlmr = await connection.query(sqlm, [service_id]);
    const isNeedExtraPay = sqlmr[0].length > 0;
    data_service[0].reservation_state = rev_state_msg(
      data_service[0].reservation_state,
      isNeedExtraPay
    );

    res.send({
      document_isSubmit: true,
      service_state: sstate,
      service_state_time: sstate_time,
      manager: data_manager[0],
      service: data_service[0],
    });
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0)
      res.status(401).send({ err: "해당 서비스 정보가 존재하지 않습니다." });
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
      const sql_prog =
        "select * from `service_progress` where `reservation_id`=?;";
      const result_prog = await connection.query(sql_prog, [service_id]);
      const data_prog = result_prog[0];

      let sstate = 0;
      let sstate_time = undefined;
      if (data_prog.length > 0) {
        sstate = data_prog[0].service_state_id;
        sstate_time = [];
        sstate_time[service_state.pickup] = data_prog[0].real_pickup_time; // 픽업완료
        sstate_time[service_state.arrivalHos] =
          data_prog[0].real_hospital_arrival_time; // 병원도착
        sstate_time[service_state.carReady] =
          data_prog[0].real_return_hospital_arrival_time; // 귀가차량 병원도착
        sstate_time[service_state.goHome] = data_prog[0].real_return_start_time; // 귀가출발
        sstate_time[service_state.complete] =
          data_prog[0].real_service_end_time; // 서비스종료
      }

      res.send({
        service_state: sstate,
        service_state_time: sstate_time,
      });
    } catch (err) {
      logger.error(__filename + " : " + err);
      res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err: "서버 오류" });
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

    const recode_date = new Date();
    recode_date.setHours(recodeTime.hours);
    recode_date.setMinutes(recodeTime.minutes);

    const connection = await pool2.getConnection(async (conn) => conn);
    try {
      // 현재 서비스 상태 구하기
      const sql_prog =
        "select `service_state_id` from `service_progress` where `reservation_id`=?;";
      const result_prog = await connection.query(sql_prog, [service_id]);
      const data_prog = result_prog[0];
      console.log("data_prog=", data_prog);
      const next_state = data_prog[0].service_state_id + 1;
      console.log("next_state=", next_state);

      // 상태 설정
      let prog;
      switch (next_state) {
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
      console.log("prog=", prog);

      const spl =
        "update `service_progress` set `" +
        prog +
        "`=?, `service_state_id`=? where `reservation_id`=?;";
      await connection.query(spl, [recode_date, next_state, service_id]);

      res.send();
    } catch (err) {
      logger.error(__filename + " : " + err);
      if (err == 0) res.status(401).send({ err: "잘못된 인자입니다." });
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
    const file = req.body.file;
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
