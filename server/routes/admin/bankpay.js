const express = require("express");
const router = express.Router();

const jwt = require("../../modules/jwt");
const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");
const token_checker = require("../../modules/admin_token");
const formatdate = require("../../modules/formatdate");

const reservation_state = require("../../config/reservation_state");
const service_state = require("../../config/service_state");
const reservation_payment_state = require("../../config/reservation_payment_state");
const payment_state = require("../../config/payment_state");
const logger = require("../../config/logger");

// ===== 기본요금 무통장입금 결제 완료 =====
router.post("/setCompleteBaseCost", async function (req, res, next) {
  const reservationId = req.body.reservationId;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const now = formatdate.getFormatDate(new Date(), 1); // 날짜,시간

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 = `UPDATE reservation SET reservation_state_id=?, reservation_payment_state_id=? WHERE reservation_id=?;`;

    const sql2 = `UPDATE base_payment SET payment_state_id=?, complete_payment_date=? WHERE reservation_id=?;`;

    const sql3 = `INSERT INTO service_progress(reservation_id, service_state_id
                  ) VALUES(?,?);`;
    
    const result1 = await connection.query(sql1, [
      reservation_state.ready,
      reservation_payment_state.completeBasePay,
      reservationId,
    ]);

    const result2 = await connection.query(sql2, [
      payment_state.completePay,
      now,
      reservationId,
    ]);

    const result3 = await connection.query(sql3, [
      reservationId,
      service_state.ready,
    ]);

    res.status(200).send({ success: true });
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 추가요금 무통장입금 결제 완료 =====
router.post("/setCompleteExtraCost", async function (req, res, next) {
  const reservationId = req.body.reservationId;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const now = formatdate.getFormatDate(new Date(), 1); // 날짜,시간

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 = `UPDATE reservation SET reservation_payment_state_id=? WHERE reservation_id=?;`;

    const sql2 = `UPDATE extra_payment SET payment_state_id=?, complete_payment_date=? WHERE reservation_id=?;`;
    
    const result1 = await connection.query(sql1, [
      reservation_payment_state.completeAllPay,
      reservationId,
    ]);

    const result2 = await connection.query(sql2, [
      payment_state.completePay,
      now,
      reservationId,
    ]);
    
    res.status(200).send({ success: true });
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

module.exports = router;
