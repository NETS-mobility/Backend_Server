const express = require("express");
const logger = require("../../config/logger");
const router = express.Router();

const jwt = require("../../modules/jwt");
const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");
const date_to_string = require("../../modules/date_to_string");
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
    const now = date_to_string(new Date());
    const sql =
      "select distinct S.`service_kind` as `service_type`, cast(C.`expect_car_pickup_time` as time) as `pickup_time`, `hope_reservation_date` as `rev_date`, C.`departure_address`, cast(R.`reservation_id` as char) as `id` " +
      "from `car_dispatch` as C, `reservation` as R, `service_info` as S " +
      "where C.`netsmanager_number`=? and C.`reservation_id`=R.`reservation_id` and R.`service_kind_id`=S.`service_kind_id` and R.`hope_reservation_date`=? and R.`reservation_state_id`>=1 " +
      "and exists(select * from `base_payment` as P where `payment_state_id`=? and R.`reservation_id`=P.`reservation_id`) " + 
      "order by `pickup_time`;";
    const sql_result = await connection.query(sql, [user_num, now, payment_state.completePay]);
    const sql_data = sql_result[0];
    res.send({
      name: user_name,
      service: sql_data,
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
