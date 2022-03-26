const express = require("express");
const router = express.Router();

const jwt = require("../../modules/jwt");
const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");
const formatdate = require("../../modules/formatdate");

const reservation_payment_state = require("../../config/reservation_payment_state");
const payment_state = require("../../config/payment_state");
const logger = require("../../config/logger");

// ===== 회사은행정보 조회 =====
router.post("/getCompanyBankInfo", async function (req, res, next) {
  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 = `SELECT company_bank_name1, company_bank_account1,
                  company_bank_name2, company_bank_account2
                  FROM company_info;`;

    const result1 = await connection.query(sql1);
    const sql_data1 = result1[0];

    res.status(200).send({
      bankName1: sql_data1[0].company_bank_name1,
      bankAccount1: sql_data1[0].company_bank_account1,
      bankName2: sql_data1[0].company_bank_name2,
      bankAccount2: sql_data1[0].company_bank_account2,
    });
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 기본요금 무통장입금 결제 =====
router.post("/payBaseCost", async function (req, res, next) {
  const reservationId = req.body.reservationId;
  const bankName = req.body.bankName;
  const token = req.body.jwtToken;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 = `UPDATE base_payment SET payment_state_id=?, payment_method=?, bank_name=?,
                  submit_payment_date=?, valid_payment_date=? WHERE reservation_id=?;`;

    const sql2 = `UPDATE reservation SET reservation_payment_state_id=? WHERE reservation_id=?;`;
    
    const now = new Date(); // 오늘
    const submitDate = formatdate.getFormatDate(new Date(), 1); // 날짜,시간
    let validDate = new Date(now.setDate(now.getDate() + 1)); // 내일
    validDate = formatdate.getFormatDate(validDate, 1); // 날짜
    validDate = validDate + " 11:59:59";

    const result1 = await connection.query(sql1, [
      payment_state.waitDepositPay,
      "무통장입금",
      bankName,
      submitDate,
      validDate,
      reservationId,
    ]);
    
    const result2 = await connection.query(sql2, [
      reservation_payment_state.waitBaseDepositPay,
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

// ===== 추가요금 무통장입금 결제 =====
router.post("/payExtraCost", async function (req, res, next) {
  const reservationId = req.body.reservationId;
  const bankName = req.body.bankName;
  const token = req.body.jwtToken;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 = `UPDATE extra_payment SET payment_state_id=?, payment_method=?, bank_name=?,
                  submit_payment_date=?, valid_payment_date=? WHERE reservation_id=?;`;

    const sql2 = `UPDATE reservation SET reservation_payment_state_id=? WHERE reservation_id=?;`;

    const now = new Date(); // 오늘
    const submitDate = formatdate.getFormatDate(new Date(), 1); // 날짜,시간
    let validDate = new Date(now.setDate(now.getDate() + 1)); // 내일
    validDate = formatdate.getFormatDate(validDate, 1); // 날짜
    validDate = validDate + " 11:59:59";
    
    const result1 = await connection.query(sql1, [
      payment_state.waitDepositPay,
      "무통장입금",
      bankName,
      submitDate,
      validDate,
      reservationId,
    ]);

    const result2 = await connection.query(sql2, [
      reservation_payment_state.waitExtraDepositPay,
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
