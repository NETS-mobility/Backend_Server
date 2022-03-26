const express = require("express");
const router = express.Router();

const jwt = require("../../modules/jwt");
const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");
const token_checker = require("../../modules/admin_token");

const logger = require("../../config/logger");

// ===== 기본요금 무통장입금 결제 완료 =====
router.post("/setCompleteBaseCost", async function (req, res, next) {
  const reservationId = req.body.reservationId;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 = `UPDATE reservation SET reservation_state_id=?, reservation_payment_state_id=? WHERE reservation_id=?;`;

    const sql2 = `UPDATE base_payment SET payment_state_id=? WHERE reservation_id=?;`;

    const sql3 = `INSERT INTO service_progress(reservation_id, service_state_id
                  ) VALUES(?,?);`;
    
    const result1 = await connection.query(sql1, [
      1, // 예약 확정(결제 완료)
      2, // 기본 결제 완료
      reservationId,
    ]);

    const result2 = await connection.query(sql2, [
      3, // 결제 완료
      reservationId,
    ]);

    const result3 = await connection.query(sql3, [
      reservationId,
      0, // 픽업 이전
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

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 = `UPDATE reservation SET reservation_payment_state_id=? WHERE reservation_id=?;`;

    const sql2 = `UPDATE extra_payment SET payment_state_id=? WHERE reservation_id=?;`;
    
    const result1 = await connection.query(sql1, [
      4, // 최종 결제 완료
      reservationId,
    ]);

    const result2 = await connection.query(sql2, [
      3, // 결제 완료
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
