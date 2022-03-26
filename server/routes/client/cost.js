const express = require("express");
const router = express.Router();

const jwt = require("../../modules/jwt");
const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");

const logger = require("../../config/logger");

// ===== 기본요금 상세 조회 =====
router.post("/baseCostDetail", async function (req, res, next) {
  const reservationId = req.body.reservationId;
  const token = req.body.jwtToken;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 = `SELECT payment_state_id, payment_amount,
                  base_cost,
                  over_move_distance_cost, over_move_distance,
                  over_gowith_cost, over_gowith_time,
                  night_cost, night_time,
                  weekend_cost
                  FROM base_payment WHERE reservation_id=?;`;

    const result1 = await connection.query(sql1, [reservationId]);
    const sql_data1 = result1[0];

    if (sql_data1.length == 0)
      res.status(200).send({ msg: "해당하는 예약이 존재하지 않음" });
    else
      res.status(200).send({
        paymentState: sql_data1[0].payment_state_id,
        baseCost: {
          TotalBaseCost: sql_data1[0].payment_amount,
          baseCost: sql_data1[0].base_cost,
          overMoveDistanceCost: sql_data1[0].over_move_distance_cost,
          overMoveDistance: sql_data1[0].over_move_distance,
          overGowithTimeCost: sql_data1[0].over_gowith_cost,
          overGowithTime: sql_data1[0].over_gowith_time,
          nightCost: sql_data1[0].night_cost,
          nightmin: sql_data1[0].night_time,
          weekendCost: sql_data1[0].weekend_cost,
        },
      });
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 추가요금 상세 조회 =====
router.post("/extraCostDetail", async function (req, res, next) {
  const reservationId = req.body.reservationId;
  const token = req.body.jwtToken;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 = `SELECT payment_state_id, payment_amount,
                  over_gowith_cost, over_gowith_time,
                  delay_cost, delay_time,
                  FROM extra_payment WHERE reservation_id=?;`;

    const result1 = await connection.query(sql1, [reservationId]);
    const sql_data1 = result1[0];

    if (sql_data1.length == 0)
      res.status(200).send({ msg: "해당하는 예약이 존재하지 않음" });
    else
      res.status(200).send({
        paymentState: sql_data1[0].payment_state_id,
        extraCost: {
          TotalExtraCost: sql_data1[0].payment_amount,
          overGowithTimeCost: sql_data1[0].over_gowith_cost,
          overGowithTime: sql_data1[0].over_gowith_time,
          delayCost: sql_data1[0].delay_cost,
          delayTime: sql_data1[0].delay_time,
        },
      });
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

module.exports = router;
