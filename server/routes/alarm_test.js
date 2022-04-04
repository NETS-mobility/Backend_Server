const express = require("express");
const logger = require("../config/logger");
const router = express.Router();

const alarm_kind = require("../config/alarm_kind");

const alarm = require("../modules/setting_alarm");
const push_alarm = require("../modules/push_alarm");

router.post("/manager", async function (req, res, next) {
  const title = "푸시알림 테스트입니다.";
  const alarm_text = req.body.text;
  const device_token = req.body.device_token;

  try {
    console.log("device_token in alarm_test=", device_token);
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
  const alarm_kind = req.body.kind;
  console.log(alarm_kind);
  console.log(reservation_id);
  console.log(receiver);
  console.log(user_id);

  try {
    alarm.set_alarm(receiver, reservation_id, alarm_kind, user_id);
    logger.info("Alarm Testing!");
  } catch (err) {
    logger.error(__filename + " : " + err);
    res.status(500).send({ err: "오류-" + err });
  }
});
module.exports = router;
