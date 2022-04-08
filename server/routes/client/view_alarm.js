const express = require("express");
const router = express.Router();
const { user } = require("../../config/database");
const logger = require("../../config/logger");

const jwt = require("../../modules/jwt");
const pool2 = require("../../modules/mysql2");
const alarm = require("../../modules/setting_alarm");
const fcm = require("../../config/fcm");
const alarm_kind = require("../../config/alarm_kind");

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
      "select ca.* from `customer_alarm` as ca left join `user` as u on ca.`user_number` = u.`user_number`" +
      "where u.user_id =? " +
      "order by ca.`alarm_id` desc";
    const result = await connection.query(sql, param);
    const data = result[0];
    let temp_title, temp_data;

    let arr = new Array();
    for (let i = 0; i < data.length; i++) {
      arr[i] = new Array();
      arr[i][0] = data[i].alarm_id;
      arr[i][1] = "";
      arr[i][2] = data[i].alarm_content; // 알림 내용
      arr[i][3] = new Object();
      arr[i][4] = new Object();
      temp_title = data[i].alarm_object_title.split(","); // TODO: 이게 object title
      temp_data = data[i].alarm_object_data.split(",");
      switch (data[i].alarm_kind) {
        case alarm_kind.request_payment:
          arr[i][1] = "결제요청";

          arr[i][3].object1 = temp_title[0];
          arr[i][3].object2 = temp_title[1];
          arr[i][3].object3 = temp_title[2];

          arr[i][4].reservation_id = temp_data[0];
          arr[i][4].reservation_date = temp_data[1];
          arr[i][4].pickup_time = temp_data[2];
          break;
        case alarm_kind.press_payment:
          arr[i][1] = "결제독촉";

          arr[i][3].object1 = temp_title[0];
          arr[i][3].object2 = temp_title[1];
          arr[i][3].object3 = temp_title[2];

          arr[i][4].reservation_id = temp_data[0];
          arr[i][4].reservation_date = temp_data[1];
          arr[i][4].pickup_time = temp_data[2];
          break;
        case alarm_kind.cancellation:
          arr[i][1] = "취소안내";

          arr[i][3].object1 = temp_title[0];
          arr[i][3].object2 = temp_title[1];
          arr[i][3].object3 = temp_title[2];

          arr[i][4].reservation_id = temp_data[0];
          arr[i][4].reservation_date = temp_data[1];
          arr[i][4].pickup_time = temp_data[2];
          break;
        case alarm_kind.visit:
          arr[i][1] = "방문예정";

          arr[i][3].object1 = temp_title[0];
          arr[i][3].object2 = temp_title[1];

          arr[i][4].netsmanager_name = temp_data[0];
          arr[i][4].visit_time = temp_data[1];
          break;
        case alarm_kind.delay:
          arr[i][1] = "지연예상";

          arr[i][3].object1 = temp_title[0];
          arr[i][3].object2 = temp_title[1];

          arr[i][4].netsmanager_name = temp_data[0];
          arr[i][4].delay_time = temp_data[1];
          break;
        case alarm_kind.delay_over_20min:
          arr[i][1] = "20분이상지연";

          arr[i][3].object1 = temp_title[0];
          arr[i][3].object2 = temp_title[1];
          arr[i][3].object3 = temp_title[2];
          arr[i][3].object4 = temp_title[3];
          arr[i][3].object5 = temp_title[4];
          arr[i][3].object6 = temp_title[5];
          arr[i][3].object7 = temp_title[6];

          arr[i][4].reservation_id = temp_data[0];
          arr[i][4].pickup_time = temp_data[1];
          arr[i][4].patient_name = temp_data[2];
          arr[i][4].patient_phone = temp_data[3];
          arr[i][4].protector_name = temp_data[4];
          arr[i][4].protector_phone = temp_data[5];
          arr[i][4].netsmanager_name = temp_data[6];
          break;
        case alarm_kind.report_progress:
          arr[i][1] = "동행상황보고";

          arr[i][3].object1 = temp_title[0];
          arr[i][3].object2 = temp_title[1];
          arr[i][3].object3 = temp_title[2];
          arr[i][3].object4 = temp_title[3];

          arr[i][4].user_name = temp_data[0];
          arr[i][4].fixed_medical_detail = temp_data[1];
          arr[i][4].accompany_picture_path = temp_data[2];
          arr[i][4].servey_url = temp_data[3];
          break;
        case alarm_kind.report_end:
          arr[i][1] = "동행 상황 보고(동행 완료)";

          arr[i][3].object1 = temp_title[0];
          arr[i][3].object2 = temp_title[1];
          arr[i][3].object3 = temp_title[2];

          arr[i][4].user_name = temp_data[0];
          arr[i][4].fixed_medical_detail = temp_data[1];
          arr[i][4].accompany_picture_path = temp_data[2];
          break;
        case alarm_kind.extra_payment:
          arr[i][1] = "병원동행 추가요금 결제";

          arr[i][3].object1 = temp_title[0];
          arr[i][3].object2 = temp_title[1];
          arr[i][3].object3 = temp_title[2];
          arr[i][3].object4 = temp_title[3];
          arr[i][3].object5 = temp_title[4];

          arr[i][4].reservation_id = temp_data[0];
          arr[i][4].origin_service_time = temp_data[1];
          arr[i][4].real_service_time = temp_data[2];
          arr[i][4].over_time = temp_data[3];
          arr[i][4].over_cost = temp_data[4];

          break;
        case alarm_kind.waiting_payment:
          arr[i][1] = "대기요금 결제";

          arr[i][3].object1 = temp_title[0];
          arr[i][3].object2 = temp_title[1];
          arr[i][3].object3 = temp_title[2];

          arr[i][4].reservation_id = temp_data[0];
          arr[i][4].wait_time = temp_data[1];
          arr[i][4].wait_cost = temp_data[2];

          break;
      }
    }

    res.send(arr);
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0) res.status(401).send({ err: "잘못된 인자 전달" });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err: "서버 오류" });
  } finally {
    connection.release();
  }
});

// ===== fcm 서버키 획득 =====
router.post("/serverKey", async function (req, res, next) {
  const token = req.body.jwtToken;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });

  try {
    const data = fcm.serverKey;

    res.send(data);
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0) res.status(401).send({ err: "잘못된 인자 전달" });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err: "서버 오류" });
  } finally {
  }
});

module.exports = router;
