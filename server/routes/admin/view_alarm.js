const express = require("express");
const router = express.Router();
const { user } = require("../../config/database");
const uplPath = require("../../config/upload_path");
const logger = require("../../config/logger");
const alarm_kind = require("../../config/alarm_kind");

const upload = require("../../modules/fileupload");
const jwt = require("../../modules/jwt");
const pool2 = require("../../modules/mysql2");

// ===== 알림 조회 =====
router.post("/alarmList/", async function (req, res, next) {
  const token = req.body.jwtToken;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });
  const admin_id = token_res.id; // 관리자 id
  const connection = await pool2.getConnection(async (conn) => conn);

  try {
    const sql =
      "select ca.*, u.`user_name`, cd.`netsmanager_number` " +
      "from `customer_alarm` as ca left join user as u on ca.`user_number` = u.`user_number` left join car_dispatch as cd on ca.`reservation_id` = cd.`reservation_id` " +
      "where ca.`alarm_kind` =? or ca.`alarm_kind` =? or ca.`alarm_kind` =? or ca.`alarm_kind` =? or ca.`alarm_kind` =? " +
      "order by ca.`alarm_id` desc";
    const result = await connection.query(sql, [
      alarm_kind.request_payment,
      alarm_kind.cancellation,
      alarm_kind.delay_over_20min,
      alarm_kind.extra_payment,
      alarm_kind.waiting_payment,
    ]);
    const data = result[0];
    connection.release();

    res.send(data);
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0) res.status(401).send({ err: "잘못된 인자 전달" });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err: "서버 오류" });
  } finally {
    connection.release();
  }
});
module.exports = router;
