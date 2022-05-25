// === 픽업시간 지연여부 확인 및 지연 알림 발송 ===

const express = require("express");
const mysql = require("mysql");
const pool2 = require("./mysql2");
const schedule = require("node-schedule");

const conn = require("../config/database");
const alarm_kind_number = require("../config/alarm_kind");
const reciever_kind = require("../config/push_alarm_reciever");
const logger = require("../config/logger");
const alarm_kind = require("../config/alarm_kind");
const service_state = require("../config/service_state");
const token = require("../config/token");

const push_alarm = require("./push_alarm");
const alarm = require("./setting_alarm");

async function checking_over_20min(reservation_id) {
  const connection = await pool2.getConnection(async (conn) => conn);
  let sql =
    "select year(`hope_reservation_date`) as year, month(`hope_reservation_date`) as month, day(`hope_reservation_date`) as day, " +
    "hour(`expect_pickup_time`) as hour, minute(`expect_pickup_time`) as min, second(`expect_pickup_time`) as sec from `reservation` where `reservation_id`=?";
  const sql_res = await connection.query(sql, [reservation_id]);
  res = Object.values(sql_res[0][0]);
  const year = res[0];
  const month = res[1];
  const day = res[2];
  const hour = res[3];
  const min = res[4];
  const sec = res[5];

  // 픽업시간 20분 후 도착여부 확인
  let alarm_day = new Date(year, month, day, hour, min + 20, sec);

  var j = schedule.scheduleJob(alarm_day, async function () {
    const connection = await pool2.getConnection(async (conn) => conn);
    let sql = "select * from `service_progress` where `reservation_id`=?;";
    const result_prog = await connection.query(sql_prog, [service_id]);
    const data_prog = result_prog[0];

    // 예상 픽업시간 20분 후에도 차량 출발상태라면 알림 발송
    if (data_prog[0].service_state_id == service_state.carDep) {
      alarm.set_alarm(
        reciever_kind.admin,
        reservation_id,
        alarm_kind_number.delay_over_20min
      );
    }
  });
}
module.exports.checking_over_20min = checking_over_20min;
