const express = require("express");
const router = express.Router();
const { user } = require("../../config/database");

const jwt = require("../../modules/jwt");
const pool2 = require("../../modules/mysql2");

// ===== 알람 조회 =====
router.post("/alarmList/", async function (req, res, next) {
  const token = req.body.jwtToken;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });
  const user_id = token_res.id; // 이용자 id
  const connection = await pool2.getConnection(async (conn) => conn);

  try {
    let param = [user_id];

    const sql =
      "select *, u.`user_name` from `customer_alarm` as ca left join `user` as u on ca.`user_number` = u.`user_number` " +
      "where u.user_id =? " +
      "order by ca.`alarm_id` desc";
    const result = await connection.query(sql, param);
    const data = result[0];
    connection.release();

    res.send(data);
  } catch (err) {
    console.error("err : " + err);
    if (err == 0) res.status(401).send({ err: "잘못된 인자 전달" });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err: "서버 오류" });
  } finally {
    connection.release();
  }
});

module.exports = router;
