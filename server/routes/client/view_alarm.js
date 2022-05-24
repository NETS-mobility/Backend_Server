const express = require("express");
const router = express.Router();
const { user } = require("../../config/database");
const logger = require("../../config/logger");

const jwt = require("../../modules/jwt");
const pool2 = require("../../modules/mysql2");
const alarm = require("../../modules/setting_alarm");
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
      arr[i] = new Object();
      arr[i].alarm_id = data[i].alarm_id;
      arr[i].alarm_title = "";
      arr[i].alarm_content = data[i].alarm_content; // 알림 내용
      arr[i].alarm_object_title = new Object(); // alarm object title
      arr[i].alarm_object_data = new Object(); // alarm object data
      temp_title = data[i].alarm_object_title.split(","); // TODO: 이게 object title
      temp_data = data[i].alarm_object_data.split(",");
      switch (data[i].alarm_kind) {
        case alarm_kind.request_payment:
          arr[i].alarm_title = "결제요청";

          arr[i].alarm_object_title.object1 = temp_title[0];
          arr[i].alarm_object_title.object2 = temp_title[1];
          arr[i].alarm_object_title.object3 = temp_title[2];

          arr[i].alarm_object_data.reservation_id = temp_data[0];
          arr[i].alarm_object_data.reservation_date = temp_data[1];
          arr[i].alarm_object_data.pickup_time = temp_data[2];
          break;
        case alarm_kind.press_payment:
          arr[i].alarm_title = "결제독촉";

          arr[i].alarm_object_title.object1 = temp_title[0];
          arr[i].alarm_object_title.object2 = temp_title[1];
          arr[i].alarm_object_title.object3 = temp_title[2];

          arr[i].alarm_object_data.reservation_id = temp_data[0];
          arr[i].alarm_object_data.reservation_date = temp_data[1];
          arr[i].alarm_object_data.pickup_time = temp_data[2];
          break;
        case alarm_kind.cancellation:
          arr[i].alarm_title = "취소안내";

          arr[i].alarm_object_title.object1 = temp_title[0];
          arr[i].alarm_object_title.object2 = temp_title[1];
          arr[i].alarm_object_title.object3 = temp_title[2];

          arr[i].alarm_object_data.reservation_id = temp_data[0];
          arr[i].alarm_object_data.reservation_date = temp_data[1];
          arr[i].alarm_object_data.pickup_time = temp_data[2];
          break;
        case alarm_kind.visit:
          arr[i].alarm_title = "방문예정";

          arr[i].alarm_object_title.object1 = temp_title[0];
          arr[i].alarm_object_title.object2 = temp_title[1];

          arr[i].alarm_object_data.netsmanager_name = temp_data[0];
          arr[i].alarm_object_data.visit_time = temp_data[1];
          break;
        case alarm_kind.delay:
          arr[i].alarm_title = "지연예상";

          arr[i].alarm_object_title.object1 = temp_title[0];
          arr[i].alarm_object_title.object2 = temp_title[1];

          arr[i].alarm_object_data.netsmanager_name = temp_data[0];
          arr[i].alarm_object_data.delay_time = temp_data[1];
          break;
        case alarm_kind.delay_over_20min:
          arr[i].alarm_title = "20분이상지연";

          arr[i].alarm_object_title.object1 = temp_title[0];
          arr[i].alarm_object_title.object2 = temp_title[1];
          arr[i].alarm_object_title.object3 = temp_title[2];
          arr[i][3].object4 = temp_title[3];
          arr[i][3].object5 = temp_title[4];
          arr[i][3].object6 = temp_title[5];
          arr[i][3].object7 = temp_title[6];

          arr[i].alarm_object_data.reservation_id = temp_data[0];
          arr[i].alarm_object_data.pickup_time = temp_data[1];
          arr[i].alarm_object_data.patient_name = temp_data[2];
          arr[i].alarm_object_data.patient_phone = temp_data[3];
          arr[i].alarm_object_data.protector_name = temp_data[4];
          arr[i].alarm_object_data.protector_phone = temp_data[5];
          arr[i].alarm_object_data.netsmanager_name = temp_data[6];
          break;
        case alarm_kind.report_progress:
          arr[i].alarm_title = "동행상황보고";

          arr[i].alarm_object_title.object1 = temp_title[0];
          arr[i].alarm_object_title.object2 = temp_title[1];
          arr[i].alarm_object_title.object3 = temp_title[2];
          arr[i][3].object4 = temp_title[3];

          arr[i].alarm_object_data.user_name = temp_data[0];
          arr[i].alarm_object_data.fixed_medical_detail = temp_data[1];
          arr[i].alarm_object_data.accompany_picture_path = temp_data[2];
          arr[i].alarm_object_data.servey_url = temp_data[3];
          break;
        case alarm_kind.report_end:
          arr[i].alarm_title = "동행 상황 보고(동행 완료)";

          arr[i].alarm_object_title.object1 = temp_title[0];
          arr[i].alarm_object_title.object2 = temp_title[1];
          arr[i].alarm_object_title.object3 = temp_title[2];

          arr[i].alarm_object_data.user_name = temp_data[0];
          arr[i].alarm_object_data.fixed_medical_detail = temp_data[1];
          arr[i].alarm_object_data.accompany_picture_path = temp_data[2];
          break;
        case alarm_kind.extra_payment:
          arr[i].alarm_title = "병원동행 추가요금 결제";

          arr[i].alarm_object_title.object1 = temp_title[0];
          arr[i].alarm_object_title.object2 = temp_title[1];
          arr[i].alarm_object_title.object3 = temp_title[2];
          arr[i][3].object4 = temp_title[3];
          arr[i][3].object5 = temp_title[4];

          arr[i].alarm_object_data.reservation_id = temp_data[0];
          arr[i].alarm_object_data.origin_service_time = temp_data[1];
          arr[i].alarm_object_data.real_service_time = temp_data[2];
          arr[i].alarm_object_data.over_time = temp_data[3];
          arr[i].alarm_object_data.over_cost = temp_data[4];

          break;
        case alarm_kind.waiting_payment:
          arr[i].alarm_title = "대기요금 결제";

          arr[i].alarm_object_title.object1 = temp_title[0];
          arr[i].alarm_object_title.object2 = temp_title[1];
          arr[i].alarm_object_title.object3 = temp_title[2];

          arr[i].alarm_object_data.reservation_id = temp_data[0];
          arr[i].alarm_object_data.wait_time = temp_data[1];
          arr[i].alarm_object_data.wait_cost = temp_data[2];

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

module.exports = router;
