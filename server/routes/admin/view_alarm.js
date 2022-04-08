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
      "select distinct ca.`alarm_id`, ca.`alarm_kind`, ca.`alarm_content`, ca.`alarm_object_title`, ca.`alarm_object_data`, u.`user_name`, nm.`netsmanager_name` " +
      "from `customer_alarm` as ca left join user as u on ca.`user_number` = u.`user_number` join car_dispatch as cd on ca.`reservation_id` = cd.`reservation_id` left join `netsmanager` as nm on cd.`netsmanager_number` = nm.`netsmanager_number` " +
      "where ca.`alarm_kind` =? or ca.`alarm_kind` =? or ca.`alarm_kind` =? or ca.`alarm_kind` =? or ca.`alarm_kind` =? " +
      "order by ca.`alarm_id` desc;";
    const result = await connection.query(sql, [
      alarm_kind.request_payment,
      alarm_kind.cancellation,
      alarm_kind.delay_over_20min,
      alarm_kind.extra_payment,
      alarm_kind.waiting_payment,
    ]);
    const data = result[0];
    let temp_title, temp_data;

    let arr = new Array();

    for (let i = 0; i < data.length; i++) {
      arr[i] = new Array();
      arr[i][0] = data[i].alarm_id;
      arr[i][1] = "";
      arr[i][2] = data[i].alarm_content; // 알림 내용
      arr[i][3] = new Object(); // alarm object title
      arr[i][4] = new Object(); // alarm object data
      arr[i][5] = new Object(); // 예약자명과 매니저명
      arr[i][5].user_name = data[i].user_name;
      arr[i][5].netsmanager_name = data[i].netsmanager_name;
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
        case alarm_kind.cancellation:
          arr[i][1] = "취소안내";

          arr[i][3].object1 = temp_title[0];
          arr[i][3].object2 = temp_title[1];
          arr[i][3].object3 = temp_title[2];

          arr[i][4].reservation_id = temp_data[0];
          arr[i][4].reservation_date = temp_data[1];
          arr[i][4].pickup_time = temp_data[2];
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
module.exports = router;
