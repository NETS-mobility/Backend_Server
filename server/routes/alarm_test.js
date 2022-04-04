const express = require("express");
const logger = require("../config/logger");
const router = express.Router();

const alarm_kind = require("../config/alarm_kind");

const alarm = require("../modules/setting_alarm");
const push_alarm = require("../modules/push_alarm");
const {
  extra_payment,
  delay,
  visit,
  waiting_payment,
} = require("../config/alarm_kind");

router.post("/manager", async function (req, res, next) {
  const title = "푸시알림 테스트입니다.";
  const alarm_text = req.body.text;
  const device_token = req.body.device_token;

  try {
    push_alarm.pushAlarm(alarm_text, title, device_token);
    res.status(200).send("");
  } catch (err) {
    logger.error(__filename + " : " + err);
    res.status(500).send({ err: "오류-" + err });
    logger.error("Fail about sending testing manager's push message router!");
  }
});

router.post("/makingAlarm", async function (req, res, next) {
  const reservation_id = req.body.reservation_id;
  const user_id = req.body.user_id;
  const receiver = req.body.receiver;
  const kind = req.body.kind;

  try {
    switch (kind) {
      case visit: {
        const expect_visit_time = req.body.visit_time;
        alarm.set_alarm(receiver, reservation_id, kind, user_id, [
          expect_visit_time,
        ]);
        break;
      }
      case delay: {
        const delay_time = req.body.delay_time;
        alarm.set_alarm(receiver, reservation_id, kind, user_id, delay_time);
        break;
      }
      case extra_payment: {
        const real_service_time = req.body.real_service_time;
        const extra_cost = req.body.extra_cost;
        alarm.set_alarm(receiver, reservation_id, kind, user_id, [
          real_service_time,
          extra_cost,
        ]);

        break;
      }
      case waiting_payment: {
        const waiting_time = req.body.waiting_time;
        const wait_cost = req.body.wait_cost;
        alarm.set_alarm(receiver, reservation_id, kind, user_id, [
          waiting_time,
          wait_cost,
        ]);
        break;
      }
      default:
        alarm.set_alarm(receiver, reservation_id, kind, user_id);
        break;
    }

    logger.info("Alarm Testing!");
  } catch (err) {
    logger.error(__filename + " : " + err);
    res.status(500).send({ err: "오류-" + err });
  }
});
module.exports = router;
