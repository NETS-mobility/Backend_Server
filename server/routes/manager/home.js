const express = require("express");
const ToKoreanTime = require("../../algorithm/util/toKoreanTime");
const router = express.Router();

const jwt = require("../../modules/jwt");
const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");

// ===== 홈페이지 =====
router.post("", async function (req, res, next) {
  console.log("req==", req);
  const token = req.body.jwtToken;
  console.log("token==", token);
  const token_res = await jwt.verify(token);
  console.log("token_res==", token_res);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });
  const user_num = token_res.num;
  console.log("user_num==", user_num);
  const user_name = token_res.name;

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const now = new Date();
    console.log("now===", now);
    console.log("koreanTime=", ToKoreanTime(now));
    const sql =
      "select distinct S.`service_kind` as `service_type`, cast(C.`expect_car_pickup_time` as time) as `pickup_time`, `hope_reservation_date` as `rev_date`, C.`departure_address`, cast(R.`reservation_id` as char) as `id` " +
      "from `car_dispatch` as C, `reservation` as R, `service_info` as S " +
      "where C.`netsmanager_number`=? and C.`reservation_id`=R.`reservation_id` and R.`service_kind_id`=S.`service_kind_id` and R.`hope_reservation_date`=? " +
      "order by `pickup_time`;";
    const sql_result = await connection.query(sql, [
      user_num,
      ToKoreanTime(now),
    ]);
    console.log("sql_result===", sql_result);
    const sql_data = sql_result[0];
    console.log("sql_data===", sql_data);

    res.send({
      name: user_name,
      service: sql_data,
    });
  } catch (err) {
    console.error("err : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

module.exports = router;
