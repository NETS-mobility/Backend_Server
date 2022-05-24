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

router.post("/checkState", async function (req, res, next) {
  const token = req.body.jwtToken;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });

  const user_id = token_res.id; // 이용자 id

  const state_kind = req.body.kind;
  const reservation_id = req.body.reservation_id;
  try {
    const connection = await pool2.getConnection(async (conn) => conn);
    let sql;
    if (state_kind == "결제") {
      sql =
        "select `payment_state_id` from `base_payment` as bp where `reservation_id` = ?";
    } else if (state_kind == "예약") {
      sql =
        "select `reservation_state_id` from `reservation` where `reservation_id` = ?";
    } else {
      res.status(200).send({ message: "해당사항이 없습니다." });
      return 0;
    }
    const result = await connection.query(sql, reservation_id);
    const data = result[0];
    let message;
    try {
      if (state_kind == "결제") {
        if (data[0].payment_state_id == 3)
          message = { message: "결제 완료 되었습니다." };
        else if (data[0].payment_state_id < 3)
          message = { message: "결제를 진행해주세요." };
        else message = { message: "결제 취소 상태입니다." };
      } else if (state_kind == "예약") {
        if (data[0].reservation_state_id < 4) {
          message = { message: "서비스 진행중입니다." };
        }
        if (
          data[0].reservation_state_id == 4 ||
          data[0].reservation_state_id == 5
        ) {
          message = { message: "예약 취소 상태입니다." };
        }
      } else {
        message = { message: "fail" };
      }
    } catch (err) {
      logger.error(__filename + " : " + err);
    }
    console.log(data[0].payment_state_id);
    if (data[0] == null) message = { message: "내역이 없습니다." };
    res.status(200).send(message);
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0) res.status(401).send({ err: "잘못된 인자 전달" });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err: "서버 오류" });
  } finally {
  }
});
module.exports = router;
