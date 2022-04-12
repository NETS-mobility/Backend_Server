const express = require("express");
const router = express.Router();
const { user } = require("../../config/database");
const upload = require("../../modules/fileupload");
const logger = require("../../config/logger");

const jwt = require("../../modules/jwt");
const pool2 = require("../../modules/mysql2");
const uplPath = require("../../config/upload_path");
const alarm_kind = require("../../config/alarm_kind");

// ===== 알림 조회 =====
router.post("/alarmList/", async function (req, res, next) {
  const token = req.body.jwtToken;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });
  const manager_id = token_res.id; // 매니저 id
  const connection = await pool2.getConnection(async (conn) => conn);

  try {
    let param = [manager_id];

    const sql =
      "select ma.* from `manager_alarm` as ma left join `netsmanager` as m on ma.`netsmanager_number` = m.`netsmanager_number` " +
      "where m.netsmanager_id =? " +
      "order by ma.`alarm_id` desc;";
    const result = await connection.query(sql, param);
    const data = result[0];

    let temp_title, temp_data;

    let arr = new Array();
    for (let i = 0; i < data.length; i++) {
      arr[i] = new Object();
      arr[i].alarm_id = data[i].alarm_id;
      arr[i].alarm_title = "";
      arr[i].alarm_content = data[i].alarm_content; // 알림 내용
      arr[i].alarm_object_title = new Object();
      arr[i].alarm_object_data = new Object();
      temp_title = data[i].alarm_object_title.split(","); // TODO: 이게 object title
      temp_data = data[i].alarm_object_data.split(",");
      switch (data[i].alarm_kind) {
        case alarm_kind.m_confirm_reservation:
          arr[i].alarm_title = "예약확정";

          arr[i].alarm_object_title.object1 = temp_title[0];
          arr[i].alarm_object_title.object2 = temp_title[1];
          arr[i].alarm_object_title.object3 = temp_title[2];
          arr[i].alarm_object_title.object4 = temp_title[3];
          arr[i].alarm_object_title.object5 = temp_title[4];

          arr[i].alarm_object_data.reservation_id = temp_data[0];
          arr[i].alarm_object_data.reservation_date = temp_data[1];
          arr[i].alarm_object_data.pickup_time = temp_data[2];
          arr[i].alarm_object_data.pickup_address = temp_data[3];
          arr[i].alarm_object_data.customer_name = temp_data[4];
          break;
        case alarm_kind.m_prev_notice:
          arr[i].alarm_title = "하루 전 알림";

          arr[i].alarm_object_title.object1 = temp_title[0];
          arr[i].alarm_object_title.object2 = temp_title[1];
          arr[i].alarm_object_title.object3 = temp_title[2];
          arr[i].alarm_object_title.object4 = temp_title[3];

          arr[i].alarm_object_data.reservation_date = temp_data[0];
          arr[i].alarm_object_data.pickup_time = temp_data[1];
          arr[i].alarm_object_data.pickup_address = temp_data[2];
          arr[i].alarm_object_data.customer_name = temp_data[3];
          break;
      }
    }

    res.send(arr);
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0) res.status(401).send({ err: "잘못된 인자 전달" });
    else res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ==== 동행 파일 업로드 ====
router.post(
  "/alarmDetail/:service_id/submitAccompanyPicture",
  upload(uplPath.customer_document).single("file"),
  async function (req, res, next) {
    const file = req.file;
    if (file === undefined)
      return res.status(400).send({ err: "파일이 업로드되지 않았습니다." });

    const service_id = req.params.service_id;
    const filepath = uplPath.accompany_picture + file.filename; // 업로드 파일 경로

    const connection = await pool2.getConnection(async (conn) => conn);
    try {
      const spl =
        "update `reservation` set `accompany_picture_path`=? where `reservation_id`=?;";
      await connection.query(spl, [filepath, service_id]);
      res.send();
    } catch (err) {
      logger.error(__filename + " : " + err);
      // res.status(500).send({ err: "서버 오류" });
      res.status(500).send({ err: "오류-" + err });
    } finally {
      connection.release();
    }
  }
);
module.exports = router;
