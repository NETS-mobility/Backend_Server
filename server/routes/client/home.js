const express = require("express");
const logger = require("../../config/logger");
const router = express.Router();

const jwt = require("../../modules/jwt");
const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");
const payment_state = require("../../config/payment_state");

// ===== 홈페이지 =====
router.post("", async function (req, res, next) {
  const token = req.body.jwtToken;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });
  const user_num = token_res.num;
  const user_name = token_res.name;

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql =
      "select S.`service_kind` as `service_type`, `expect_pickup_time` as `pickup_time`, date_format(`hope_reservation_date`,'%Y-%m-%d') as `rev_date`, cast(`reservation_id` as char) as `id` " +
      "from `reservation` as R, `service_info` as S " +
      "where `user_number`=? and R.`service_kind_id`=S.`service_kind_id` and R.`reservation_state_id` < 3 " + //and `reservation_state_id`>=0 and (`reservation_state_id`=2 " +
      //"or exists(select * from `base_payment` as P where `payment_state_id`=? and R.`reservation_id`=P.`reservation_id`) " +
      //"or exists(select * from `extra_payment` as P where `payment_state_id`=? and R.`reservation_id`=P.`reservation_id`)) " +
      "order by `pickup_time`;";
    const sql_result = await connection.query(sql, [user_num, payment_state.waitPay, payment_state.waitPay]);
    const data1 = sql_result[0];

    for (let i = 0; i < data1.length; i++) {
      const sql2 = "select * from `base_payment` where `payment_state_id`=1 and `reservation_id`=?;";
      const sqlr2 = await connection.query(sql2, [data1[i].id]);
      const isNeedBasePay = sqlr2[0].length > 0;

      const sql3 = "select * from `extra_payment` where `payment_state_id`=1 and`reservation_id`=?;";
      const sqlr3 = await connection.query(sql3, [data1[i].id]);
      const isNeedExtraPay = sqlr3[0].length > 0;

      if (isNeedBasePay) data1[i].pay_state = 2;
      else if (isNeedExtraPay) data1[i].pay_state = 3;
      else data1[i].pay_state = 1;
    }

    res.send({
      name: user_name,
      service: data1,
    });
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 토큰 생성 =====
router.post("/getNewToken", async function (req, res, next) {
  const token = req.body.jwtToken;

  try {
    const token_res = await jwt.verify(token);
    if (token_res == jwt.TOKEN_EXPIRED)
      return res.status(401).send({ err: "만료된 토큰입니다." });
    if (token_res == jwt.TOKEN_INVALID)
      return res.status(401).send({ err: "유효하지 않은 토큰입니다." });

    const payload = {
      // 고객 정보
      id: token_res.id,
      name: token_res.name,
      num: token_res.num,
    };

    const new_token_res = await jwt.sign(payload); // 토큰 생성
    res.status(200).send({ success: true, token: new_token_res });
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  }
});

module.exports = router;
