const express = require("express");
const router = express.Router();

const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");
const token_checker = require("../../modules/admin_token");

const logger = require("../../config/logger");

// ===== 서비스요금 & 추가요금 & 매니저 추가수당 정보 반환 =====
router.post("/extra", async function (req, res, next) {
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    // === 서비스요금 ===
    const sql0 = `SELECT service_kind_id AS id, service_kind AS name,
                  service_base_move_distance AS dist, service_base_hospital_gowith_time AS time, service_base_cost AS cost 
                  FROM service_info ORDER BY service_kind_id;`;
    const result0 = await connection.query(sql0, []);
    const data0 = result0[0];

    // === 추가요금 ===
    const sql1 = `SELECT extra_cost_kind_id, extra_cost_kind,
                  extra_cost_unit, extra_cost_unit_value,
                  CAST(extra_cost_per_unit_value AS FLOAT) AS extra_cost_per_unit_value,
                  extra_cost_free_unit_value, extra_cost_max_unit_value
                  FROM extra_cost ORDER BY extra_cost_kind_id;`;
    const result1 = await connection.query(sql1, []);
    const data1 = result1[0];

    // 심야시간
    const sql2 = `SELECT company_time_start AS start, company_time_end AS end 
                  FROM company_time_schedule WHERE company_time_kind=?;`;
    const result2 = await connection.query(sql2, ["심야시간"]);
    const data2 = result2[0];

    // === 매니저 추가수당 ===
    const sql3 = `SELECT extra_pay_id, CAST(extra_pay_percentage AS FLOAT) AS extra_pay_percentage,
                  extra_pay_start_time, extra_pay_end_time,
                  extra_pay_day_standard_time, extra_pay_week_standard_time
                  FROM manager_extra_pay ORDER BY extra_pay_id;`;
    const result3 = await connection.query(sql3, []);
    const data3 = result3[0];

    res.status(200).send({
      service_cost: data0,
      extra_cost: data1,
      extra_cost_night_time: data2[0],
      manager_extra_pay: data3,
    });
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 서비스요금 & 추가요금 & 매니저 추가수당 정보 설정 =====
router.post("/extra/setting", async function (req, res, next) {
  const { service_cost, extra_cost, extra_cost_night_time, manager_extra_pay } = req.body;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    await connection.beginTransaction();

    // === 서비스요금 ===
    // 기본 이동 거리, 기본 병원동행 시간, 기본요금
    for (let i = 1; i <= 5; i++) {
      const sqlc = `UPDATE service_info SET service_base_move_distance=?, service_base_hospital_gowith_time=?, service_base_cost=?
                    WHERE service_kind_id=?;`;
      const sqlrc = await connection.query(sqlc, [
        service_cost[i - 1].dist,
        service_cost[i - 1].time,
        service_cost[i - 1].cost,
        i,
      ]);
      if (sqlrc[0].affectedRows == 0) throw (err = 0);
    }

    // === 추가요금 ===
    // 추가요금 단위값, 추가요금 단위 금액
    for (let i = 1; i <= 5; i++) {
      const sqlc = `UPDATE extra_cost SET extra_cost_unit_value=?, extra_cost_per_unit_value=?
                    WHERE extra_cost_kind_id=?;`;
      const sqlrc = await connection.query(sqlc, [
        extra_cost[i - 1].extra_cost_unit_value,
        extra_cost[i - 1].extra_cost_per_unit_value,
        i,
      ]);
      if (sqlrc[0].affectedRows == 0) throw (err = 0);
    }

    // 승차 지연 대기요금 무료 단위값, 승차 지연 대기요금 최대 단위값
    const sqlc1 = `UPDATE extra_cost SET extra_cost_free_unit_value=?, extra_cost_max_unit_value=?
                   WHERE extra_cost_kind_id=?;`;
    const sqlrc1 = await connection.query(sqlc1, [
      extra_cost[4 - 1].extra_cost_free_unit_value,
      extra_cost[4 - 1].extra_cost_max_unit_value,
      4,
    ]);
    if (sqlrc1[0].affectedRows == 0) throw (err = 0);

    // 심야할증, 주말할증
    for (let i = 6; i <= 7; i++) {
      const sqlc = `UPDATE extra_cost SET extra_cost_per_unit_value=?
                    WHERE extra_cost_kind_id=?;`;
      const sqlrc = await connection.query(sqlc, [
        extra_cost[i - 1].extra_cost_per_unit_value,
        i,
      ]);
      if (sqlrc[0].affectedRows == 0) throw (err = 0);
    }

    // 심야시간
    const sqlc2 = `UPDATE company_time_schedule SET company_time_start=?, company_time_end=?
                   WHERE company_time_kind=?;`;
    const sqlrc2 = await connection.query(sqlc2, [
      extra_cost_night_time.start,
      extra_cost_night_time.end,
      "심야시간",
    ]);
    if (sqlrc2[0].affectedRows == 0) throw (err = 0);

    // === 매니저 추가수당 ===
    // 추가수당 비율
    for (let i = 1; i <= 7; i++) {
      const sqlc = `UPDATE manager_extra_pay SET extra_pay_percentage=? WHERE extra_pay_id=?;`;
      const sqlrc = await connection.query(sqlc, [
        manager_extra_pay[i - 1].extra_pay_percentage,
        i,
      ]);
      if (sqlrc[0].affectedRows == 0) throw (err = 0);
    }

    // 야간근로수당 시간
    const sqlc3 = `UPDATE manager_extra_pay SET extra_pay_start_time=?, extra_pay_end_time=?
                   WHERE extra_pay_id=?;`;
    const sqlrc3 = await connection.query(sqlc3, [
      manager_extra_pay[2 - 1].extra_pay_start_time,
      manager_extra_pay[2 - 1].extra_pay_end_time,
      2,
    ]);
    if (sqlrc3[0].affectedRows == 0) throw (err = 0);

    // 연장근로수당 하루 기준 시간, 연장근로수당 주간 기준 시간
    const sqlc4 = `UPDATE manager_extra_pay SET extra_pay_day_standard_time=?, extra_pay_week_standard_time=?
                   WHERE extra_pay_id=?;`;
    const sqlrc4 = await connection.query(sqlc4, [
      manager_extra_pay[1 - 1].extra_pay_day_standard_time,
      manager_extra_pay[1 - 1].extra_pay_week_standard_time,
      1,
    ]);
    if (sqlrc4[0].affectedRows == 0) throw (err = 0);

    await connection.commit();
    res.status(200).send({ success: true });
  } catch (err) {
    await connection.rollback();
    logger.error(__filename + " : " + err);
    if (err == 0) res.status(500).send({ err: "변경 실패" });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});

// ===== 시간 관련 변수(도어투도어 시간, 정돈 시간, tmap 여유 시간, 식사 시간) 반환 =====
router.post("/service/extratime", async function (req, res, next) {
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 = `SELECT * FROM service_extratime ORDER BY extratime_id;`;
    const result1 = await connection.query(sql1, []);
    const data1 = result1[0];

    res.status(200).send({ extratime: data1 });
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 시간 관련 변수(도어투도어 시간, 정돈 시간, tmap 여유 시간, 식사 시간) 설정 =====
router.post("/service/extratime/setting", async function (req, res, next) {
  const { extratime_data } = req.body;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    await connection.beginTransaction();

    for (let i = 1; i <= 5; i++) {
      const sqlc = `UPDATE service_extratime SET extratime_data=? WHERE extratime_id=?;`;
      const sqlrc = await connection.query(sqlc, [
        extratime_data[i - 1],
        i,
      ]);
      if (sqlrc[0].affectedRows == 0) throw (err = 0);
    }

    await connection.commit();
    res.status(200).send({ success: true });
  } catch (err) {
    await connection.rollback();
    logger.error(__filename + " : " + err);
    if (err == 0) res.status(500).send({ err: "변경 실패" });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});

module.exports = router;

// ===== 서비스 요금 조회 ==== => extra페이지하고 통합
/*router.post("/service", async function (req, res, next) {
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 =
      "select `service_kind_id` as `id`, `service_kind` as `name`, `service_base_move_distance` as `dist`, `service_base_hospital_gowith_time` as `time`, `service_base_cost` as `cost` from `service_info`;";
    const result1 = await connection.query(sql1, []);
    const data1 = result1[0];
    res.send(data1);
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});*/

// ===== 서비스 요금 설정 ==== => extra/setting페이지하고 통합
/*router.post("/service/setting", async function (req, res, next) {
  const { id, cost } = req.body;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 =
      "update `service_info` set `service_base_cost`=? where `service_kind_id`=?;";
    const result1 = await connection.query(sql1, [cost, id]);
    if (result1[0].affectedRows == 0) throw (err = 0);
    res.send();
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0) res.status(500).send({ err: "변경 실패!" });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});*/