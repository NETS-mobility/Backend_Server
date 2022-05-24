// 알림을 생성하는 module
// 사용법:alarm.set_alarm(reciever,reservation_id, alarm_kind, user_id,  기타 값);
/* 기타값: visit -> 방문 예정시간
          delay -> delay_time
          extra_payment -> [실제 서비스 시간, 초과요금]
          waiting_payment -> [대기시간, 대기요금]
          */
const express = require("express");
const util = require("util"); // db에서 불러오는 파일 변환
const mysql = require("mysql");
const pool = require("./mysql");
const pool2 = require("./mysql2");
const schedule = require("node-schedule");

const conn = require("../config/database");
const alarm_kind_number = require("../config/alarm_kind");
const url = require("../config/url");
const payment_state = require("../config/payment_state");
const reciever_kind = require("../config/push_alarm_reciever");
const logger = require("../config/logger");
const service_state = require("../config/service_state");

//const cron = require("node-cron");
const push_alarm = require("./push_alarm");
const token = require("../config/token");
const formatdate = require("./formatdate");

class Alarm {
  constructor(user_number, reservation_id, alarm_kind, device_token) {
    this.user_number = user_number;
    this.reservation_id = reservation_id;
    this.alarm_kind = alarm_kind;
    this.reservation_date;
    this.pickup_time;
    this.context;
    this.push_title;
    this.push_text;
    this.device_token = device_token;
    this.alarm_object_data = "";
    this.alarm_object_title = "";
  }

  set_context(context) {
    this.context = context;
  }
  set_push(title, text) {
    this.push_title = title;
    this.push_text = text;
  }
  get_push_title() {
    return this.push_title;
  }
  get_push_text() {
    return this.push_text;
  }
  get_context() {
    return this.context;
  }
  get_reservDate() {
    return this.reservation_date;
  }
  get_pickupTime() {
    return this.pickup_time;
  }
  add_alarm_object(title, object) {
    // 기존에 있는 알림 object뒤에 ,를 붙여 추가하는 함수
    if (this.alarm_object_title === "") {
      this.alarm_object_title = title;
      this.alarm_object_data = object;
    } else {
      this.alarm_object_title += ",";
      this.alarm_object_title += title;
      this.alarm_object_data += ",";
      this.alarm_object_data += object;
    }
  }
}

async function payment_alarm_later(
  reciever,
  reservation_id,
  alarm_kind,
  user_id
) {
  const connection1 = await pool2.getConnection(async (conn) => conn);
  let sql_cron =
    "select `payment_state_id` from `base_payment` where `reservation_id` =?"; //
  const sql_cron_res = await connection1.query(sql_cron, [reservation_id]);
  res = Object.values(sql_cron_res[0][0]);
  if (res[0] == payment_state.waitPay)
    set_alarm(reciever, reservation_id, alarm_kind, user_id);
}

async function set_alarm(reciever, reservation_id, alarm_kind, user_id, temp) {
  let alarm, sql, sql_res, user_number, device_token;
  try {
    const connection1 = await pool2.getConnection(async (conn) => conn);
    if (reciever == reciever_kind.customer) {
      // user_number, device token 추출
      sql =
        "select `user_number`, `user_device_token` from `user` where `user_id` =?";
      sql_res = await connection1.query(sql, [user_id]);
      let res = Object.values(sql_res[0]);
      user_number = res[0].user_number;
      device_token = res[0].user_device_token;
    } else if (reciever == reciever_kind.manager) {
      // netsmanager_number, device token 추출
      sql =
        "select netsmanager_number, netsmanager_device_token from netsmanager where netsmanager_id =?";
      sql_res = await connection1.query(sql, [user_id]);
      let res = Object.values(sql_res[0]);
      user_number = res[0].netsmanager_number;
      device_token = res[0].netsmanager_device_token;
    }
    alarm = new Alarm(user_number, reservation_id, alarm_kind, device_token);
    sql =
      "select `hope_reservation_date`, `expect_pickup_time` from reservation where `reservation_id` =?";
    sql_res = await connection1.query(sql, [reservation_id]);
    res = Object.values(sql_res[0][0]);
    alarm.reservation_date = formatdate.getFormatDate(res[0], 2);
    alarm.pickup_time = res[1];
    try {
      //alarm.set_time(res.substr(17, 19)); // 결과에서 timestamp값만 추출

      switch (parseInt(alarm.alarm_kind)) {
        // = 관리자, 고객용 알림 =
        // 결제 요청
        case alarm_kind_number.request_payment:
          {
            let sql =
              "select `hope_reservation_date`, `expect_pickup_time` from reservation where `reservation_id` =?";
            let sql_res = await connection1.query(sql, [reservation_id]);
            let res = Object.values(sql_res[0][0]);
            let reservation_date = formatdate.getFormatDate(res[0], 2);
            let pickup_time = res[1];

            alarm.set_context(
              "네츠서비스가 매칭되었습니다. " +
                "예약 확정을 위해 결제 부탁드립니다. " +
                "1시간 이내에 결제되지 않을 경우 예약이 취소될 수 있습니다. "
            );
            alarm.add_alarm_object("서비스번호: ", reservation_id);
            alarm.add_alarm_object("예약일정:", reservation_date);
            alarm.add_alarm_object("픽업 예정시간: ", pickup_time);

            alarm.set_push(
              "매칭 완료 ",
              "예약 확정을 위해 결제 부탁드립니다. " +
                "1시간 이내에 결제되지 않을 경우 예약이 취소될 수 있습니다. "
            );

            /*task = cron.schedule(
            //"30 1 * * * ", // 1시간 30분 뒤에 실행됨 (초, 분, 시, 일, 월, 주?)
            //"1 * * * * ", // 1분 뒤에 실행됨?
            "* * * * *",
            () => {
              // 결제 여부 확인(sql문 수정해야함)
              const now = new Date();
              logger.info("cron시작" + now);

              let db_payment_state = res[0];

              if (db_payment_state == payment_state.waitBasePay) {
                set_alarm(
                  reciever,
                  reservation_id,
                  alarm_kind_number.press_payment,
                  user_id
                );
              }
            },
            {
              scheduled: true,
            }
          );*/
            setTimeout(
              payment_alarm_later,
              1 * 1000 * 60 * 90, // 90분 뒤에 동작
              reciever,
              reservation_id,
              alarm_kind_number.press_payment,
              user_id
            );
          }
          break;
        // 결제 독촉
        case alarm_kind_number.press_payment:
          {
            let sql =
              "select `hope_reservation_date`, `expect_pickup_time` from reservation where `reservation_id` =?";
            let sql_res = await connection1.query(sql, [reservation_id]);
            let res = Object.values(sql_res[0][0]);
            let reservation_date = formatdate.getFormatDate(res[0], 2);
            let pickup_time = res[1];

            alarm.set_context(
              "네츠서비스가 매칭되었습니다. " +
                "예약 확정을 위해 결제 부탁드립니다. " +
                "30분 이내에 결제되지 않을 경우 예약이 취소될 수 있습니다.  "
            );

            alarm.add_alarm_object("서비스번호: ", reservation_id);
            alarm.add_alarm_object("예약일정:", reservation_date);
            alarm.add_alarm_object("픽업 예정시간: ", pickup_time);

            alarm.set_push(
              "결제 요청",
              "예약 확정을 위해 결제 부탁드립니다." +
                " 30분 이내에 결제되지 않을 경우 예약이 취소될 수 있습니다. "
            );
            // 다음 결제 요청 설정
            setTimeout(
              payment_alarm_later,
              1000 * 60 * 30, // 30분 뒤에 동작
              reciever,
              reservation_id,
              alarm_kind_number.cancellation,
              user_id
            );
            /*const task = cron.schedule(
            "* 30 * * *", // 30분 뒤에 실행됨 (초, 분, 시, 일, 월)
            () => {
              // 결제 여부 확인
              set_alarm(
                reservation_id,
                alarm_kind_number.press_payment,
                user_number,
                pickup_time
              );
            },
            {
              scheduled: false, // start()함수로 시작시 스케줄링된 작업 실행
            }
          );
          task.start();*/
          }
          break;
        // 취소 안내
        case alarm_kind_number.cancellation:
          {
            let sql =
              "select `hope_reservation_date`, `expect_pickup_time` from reservation where `reservation_id` =?";
            let sql_res = await connection1.query(sql, [reservation_id]);
            let res = Object.values(sql_res[0][0]);
            let reservation_date = formatdate.getFormatDate(res[0], 2);
            let pickup_time = res[1];

            alarm.set_context(
              "결제시간 초과로 예약이 취소되었습니다. " +
                " 고객님의 쾌유와 가족의 건강을 기원합니다."
            );
            alarm.add_alarm_object("서비스번호: ", reservation_id);
            alarm.add_alarm_object("예약일정:", reservation_date);
            alarm.add_alarm_object("픽업 예정시간: ", pickup_time);
            alarm.set_push(
              "예약 취소 ",
              "예약 확정을 위해 결제 부탁드립니다. " +
                "결제시간 초과로 예약이 취소되었습니다."
            );
          }
          break;
        // 예약 확정
        case alarm_kind_number.confirm_reservation:
          {
            let car_id, netsmanager_name;

            let sql =
              "select cd.`car_id`, m.`netsmanager_name`, cd.`expect_car_pickup_time` as `reservation_date`, time(cd.`expect_car_pickup_time`) as `pickup_time`, " +
              "YEAR(cd.`expect_car_pickup_time`) as year, month(cd.expect_car_pickup_time) as month, day(cd.`expect_car_pickup_time`) as day, " +
              "hour(cd.`expect_car_pickup_time`) as hour, minute(cd.`expect_car_pickup_time`) as min, second(cd.`expect_car_pickup_time`) as sec " +
              "from `car_dispatch` as cd inner join `reservation` as r inner join `netsmanager` as m " +
              "where cd.`reservation_id` = r.`reservation_id` and m.`netsmanager_number` = cd.`netsmanager_number` and " +
              "r.`reservation_id` = ?";

            let sql_res = await connection1.query(sql, [reservation_id]);

            let res = Object.values(sql_res[0][0]);
            car_id = res[0];
            netsmanager_name = res[1];
            alarm.reservation_date = formatdate.getFormatDate(res[2], 2);
            alarm.pickup_time = res[3];
            const year = res[4];
            const month = res[5];
            const day = res[6];
            const hour = res[7];
            const min = res[8];
            const sec = res[9];

            alarm.set_context(
              "네츠 예약이 확정되었습니다. " +
                " 네츠 매니저가 예약 확인을 위해 전화드릴 예정입니다. " +
                "예약 확정 후, 코로나 의심 증상이 있거나 확진자 접촉시 고객센터로 연락해주시기 바랍니다. " +
                "고객님의 쾌유를 기원합니다."
            );

            alarm.add_alarm_object("서비스번호: ", reservation_id);
            alarm.add_alarm_object(" 예약일정:", alarm.reservation_date);
            alarm.add_alarm_object(" 픽업 예정시간: ", alarm.pickup_time);
            alarm.add_alarm_object(" 배차 차량번호: ", car_id);
            alarm.add_alarm_object(" 네츠 매니저: ", netsmanager_name);

            alarm.set_push("예약 확정", "네츠 예약이 확정되었습니다.");

            // 하루전에 방문 예정 알림 전송
            let alarm_day = new Date(year, month, day - 1, hour, min, sec);

            var j = schedule.scheduleJob(alarm_day, function () {
              set_alarm(
                reciever_kind.manager,
                reservation_id,
                alarm_kind_number.visit,
                user_id
              );
              // 알림 취소 원할 경우 j.cancel(); 입력
            });
          }
          break;
        // 방문 예정
        case alarm_kind_number.visit:
          {
            let sql =
              "select m.`netsmanager_name`, date_format(cd.`expect_car_pickup_time`, '%Y-%m-%d') " +
              "from `car_dispatch` as cd inner join `reservation` as r inner join `netsmanager` as m " +
              "where cd.`reservation_id` = r.`reservation_id` and m.`netsmanager_number` = cd.`netsmanager_number` and " +
              "r.`reservation_id` = ?";

            let sql_res = await connection1.query(sql, [reservation_id]);

            let res = Object.values(sql_res[0][0]);
            netsmanager_name = res[0];
            pickup_time = res[1];

            alarm.set_context(
              "입니다. " +
                "금일 예약하신 서비스를 위해 " +
                "에 방문드릴 예정입니다. " +
                "감사합니다."
            );

            alarm.add_alarm_object("네츠 매니저: ", netsmanager_name);
            alarm.add_alarm_object("방문 예정시간: ", temp);

            alarm.set_push(
              "방문 알림 ",
              "금일 예약하신 서비스를 위해 " +
                temp +
                "방문드릴 예정입니다. " +
                "감사합니다."
            );
          }
          break;
        // 지연 예상
        case alarm_kind_number.delay:
          {
            let sql =
              "select m.netsmanager_name " +
              "from car_dispatch as cd inner join reservation as r inner join netsmanager as m " +
              "where cd.reservation_id = r.reservation_id and m.netsmanager_number = cd.netsmanager_number and " +
              "r.reservation_id = ?";

            let netsmanager_name = await connection1.query(sql, [
              reservation_id,
            ]);
            netsmanager_name = util.inspect(netsmanager_name[0]);
            netsmanager_name = netsmanager_name.substr(23, 3);

            alarm.set_context(
              "입니다. " +
                "교통체증 등으로 인해 안내드린 픽업시간에서 " +
                "분 지연이 예상됩니다.  불편을 드린 점, 양해바랍니다."
            );

            alarm.add_alarm_object(" 네츠 매니저: ", netsmanager_name);
            alarm.add_alarm_object("지연 예정시간: ", temp);

            alarm.set_push(
              "지연 알림 ",
              "교통체증 등으로 인해 안내드린 픽업시간에서 " +
                temp + // 입력된 delay_time
                "분 지연이 예상됩니다.  불편을 드린 점, 양해바랍니다. "
            );
          }
          break;
        // 20분 이상 지연
        case alarm_kind_number.delay_over_20min:
          {
            try {
              sql =
                "select ru.`patient_name`, ru.`patient_phone`, ru.`protector_name`, ru.`protector_phone`,m.`netsmanager_name` " +
                "from `car_dispatch` as cd inner join `reservation` as r inner join `netsmanager` as m inner join `reservation_user` as ru " +
                "where cd.`reservation_id` = r.`reservation_id` and m.`netsmanager_number` = cd.`netsmanager_number` and ru.`reservation_id` = r.`reservation_id` and " +
                "r.`reservation_id` =?;";

              sql_res = await connection1.query(sql, [reservation_id]);
              const res = sql_res[0][0];

              const patient_name = res.patient_name;
              const patient_phone = res.patient_phone;
              const protector_name = res.protector_name;
              const protector_phone = res.protector_phone;
              const netsmanager_name = res.netsmanager_name;

              alarm.set_context("네츠 차량 픽업이 20분이상 지연되었습니다. ");

              alarm.add_alarm_object("서비스번호: ", reservation_id);
              alarm.add_alarm_object("픽업 시간: ", alarm.pickup_time);
              alarm.add_alarm_object("고객 성함: ", patient_name);
              alarm.add_alarm_object("고객 전화: ", patient_phone);
              alarm.add_alarm_object("보호자 성함: ", protector_name);
              alarm.add_alarm_object("보호자 전화: ", protector_phone);
              alarm.add_alarm_object("네츠 매니저: ", netsmanager_name);
            } catch (err) {
              logger.error("ALARM Error!!(delay_over_20min)");
            } finally {
              alarm.set_push(
                "지연 알림",
                "네츠 차량 픽업이 20분이상 지연되었습니다."
              );
            }
          }
          break;
        // 동행 상황 보고
        case alarm_kind_number.report_progress:
          {
            let user_name;

            // 서비스 내용 찾기
            sql =
              "select fixed_medical_detail, accompany_picture_path from reservation where reservation_id =?";
            sql_res = await connection1.query(sql, [reservation_id]);

            let res = Object.values(sql_res[0][0]);
            let fixed_medical_detail = res[0];
            let accompany_picture_path = res[1];

            // user 이름 찾기
            sql = "select `user_name` from user where user_number =?";
            sql_res = await connection1.query(sql, user_number);
            user_name = sql_res[0][0].user_name;

            alarm.set_context("고객님 동행 상황 보고 ");

            alarm.add_alarm_object("고객 이름: ", user_name);
            alarm.add_alarm_object("네츠 서비스 내용: ", fixed_medical_detail);
            alarm.add_alarm_object("picture: ", accompany_picture_path);

            alarm.set_push("동행 보고", "동행 상황을 보고드립니다.");
          }
          break;
        // 동행 상황 보고(동행 완료)
        case alarm_kind_number.report_end:
          {
            // user 이름 찾기
            sql = "select user_name from user where user_number =?";
            let user_name = await connection1.query(sql, user_number);
            user_name = util.inspect(user_name[0]).slice(16, -5);
            // 서비스 내용 찾기
            sql =
              "select fixed_medical_detail, accompany_picture_path from reservation where reservation_id =?";
            let sql_res = await connection1.query(sql, reservation_id);
            let res = Object.values(sql_res[0][0]);
            let fixed_medical_detail = res[0];
            let accompany_picture_path = res[1];

            alarm.set_context(
              "고객님 동행 상황 보고 " +
                "네츠 서비스 내용" +
                "첨부된 사진" +
                "[오늘 동행은 어떠셨을까요?] " +
                "서비스 품질 개선을 위해 고객님의 의견을 듣고자 합니다. " +
                "잠시 시간을 허락하시어 설문해 주신다면 편안하고 안전한 동행을 위해 더 나은 서비스로 노력하겠습니다. " +
                "고객님의 쾌유와 가족의 건강을 기원합니다. " +
                "네츠 고객 감동실 드림" +
                "설문조사 링크: "
            );
            alarm.add_alarm_object("고객 이름: ", user_name);
            alarm.add_alarm_object("네츠 서비스 내용: ", fixed_medical_detail);
            alarm.add_alarm_object("첨부된 사진: ", accompany_picture_path);
            alarm.add_alarm_object("설문조사 링크: ", url.servey_url);

            alarm.set_push("동행 완료", "네츠 서비스 내용을 안내드립니다.");
          }
          break;
        // 병원동행 추가요금 결제
        case alarm_kind_number.extra_payment: // 실제 서비스 시간과 초과 요금은 입력받는다.
          {
            const real_service_time = temp[0];
            try {
              sql =
                "select `gowith_hospital_time` from `reservation` where `reservation_id` =?";
              res = await connection1.query(sql, [reservation_id]);

              const origin_service_time = res[0][0].gowith_hospital_time;

              const over_time = real_service_time - origin_service_time;
              const over_cost = temp[1];

              alarm.set_context(
                "병원 동행 서비스 시간이 초과되어 추가요금 결제 부탁드립니다. "
              );

              alarm.add_alarm_object("서비스번호: ", reservation_id);
              alarm.add_alarm_object("최초 예약시간: ", origin_service_time);
              alarm.add_alarm_object("실제 서비스 시간:  ", real_service_time);
              alarm.add_alarm_object("초과 시간: ", over_time);
              alarm.add_alarm_object("초과 요금: ", over_cost);
            } catch (err) {
              logger.error(err);
            } finally {
              alarm.set_push(
                "추가요금 결제 요청",
                "병원 동행 서비스 시간이 초과되어 추가요금 결제 부탁드립니다."
              );
            }
          }
          break;
        // 대기요금 결제
        case alarm_kind_number.waiting_payment: // 대기시간과 대기 요금은 입력받는다.
          {
            wait_time = temp[0];
            wait_cost = temp[1];
            alarm.set_context("대기요금이 발생하여 결제 부탁드립니다. ");

            alarm.add_alarm_object("서비스번호: ", reservation_id);
            alarm.add_alarm_object("대기 시간: ", wait_time);
            alarm.add_alarm_object("대기 요금: ", wait_cost);

            alarm.set_push(
              "대기요금 결제 요청",
              "대기요금이 발생하여 결제 부탁드립니다."
            );
          }
          break;
        // = 매니저용 알림 =
        // 예약 확정
        case alarm_kind_number.m_confirm_reservation:
          {
            try {
              let sql =
                "select netsmanager_device_token from netsmanager where netsmanager_id =?";
              let sql_res = await connection1.query(sql, [user_id]);
              let res = Object.values(sql_res[0][0]);

              device_token = res[0];

              sql =
                "select r.`hope_reservation_date`, r.`expect_pickup_time`, r.`pickup_address`, u.`user_name`, " +
                "year(r.`hope_reservation_date`) as year, month(r.`hope_reservation_date`) as month, day(r.`hope_reservation_date`) as day, " +
                "hour(r.`expect_pickup_time`) as hour, minute(r.`expect_pickup_time`) as min, second(r.`expect_pickup_time`) as sec " +
                "from reservation as r left join user as u on u.`user_number` = r.`user_number` " +
                "where `reservation_id` =?;";
              sql_res = await connection1.query(sql, [reservation_id]);

              res = Object.values(sql_res[0][0]);
              alarm.reservation_date = formatdate.getFormatDate(res[0], 2);
              alarm.pickup_time = res[1];
              alarm.pickup_address = res[2];
              const customer_name = res[3];
              const year = res[4];
              const month = res[5];
              const day = res[6];
              const hour = res[7];
              const min = res[8];
              const sec = res[9];

              alarm.set_context(
                "네츠 예약이 확정되었습니다. " +
                  " 네츠 매니저가 예약 확인을 위해 전화드릴 예정입니다. " +
                  "예약 확정 후, 코로나 의심 증상이 있거나 확진자 접촉 시 고객센터로 연락해주시기 바랍니다. " +
                  "고객님의 쾌유를 기원합니다. "
              );

              alarm.add_alarm_object("서비스번호: ", reservation_id);
              alarm.add_alarm_object("예약일정:", alarm.get_reservDate());
              alarm.add_alarm_object("픽업 예정시간: ", alarm.get_pickupTime());
              alarm.add_alarm_object("픽업주소: ", alarm.pickup_address);
              alarm.add_alarm_object("고객 이름: ", customer_name);

              // 하루 전 알림 설정
              let alarm_day = new Date(year, month, day - 1, hour, min, sec);

              var j = schedule.scheduleJob(alarm_day, function () {
                set_alarm(
                  reciever_kind.manager,
                  reservation_id,
                  alarm_kind_number.m_prev_notice,
                  user_id
                );
                // 알림 취소 원할 경우 j.cancel(); 입력
              });
            } catch (err) {
              logger.error("alarm setting err : " + err);
            } finally {
              alarm.set_push("예약 확정", "네츠 예약이 확정되었습니다.");
            }
          }
          break;
        // 하루 전 알림
        case alarm_kind_number.m_prev_notice:
          {
            // 픽업 주소, 고객 이름 추출
            sql =
              "select r.`pickup_address`, u.`user_name` from reservation as r left join user as u on u.`user_number` = r.`user_number` where `reservation_id` =?;";
            sql_res = await connection1.query(sql, [reservation_id]);
            res = Object.values(sql_res[0][0]);
            const pickup_address = res[0]; // 날짜만 추출 필요
            const customer_name = res[1];

            alarm.set_context(
              "네츠서비스가 내일" +
                " 진행됩니다. " +
                "고객님께 해피콜을 진행해주세요. "
            );

            alarm.add_alarm_object("예약일정:", alarm.get_reservDate());
            alarm.add_alarm_object("픽업 예정시간: ", alarm.get_pickupTime());
            alarm.add_alarm_object("픽업주소: ", pickup_address);
            alarm.add_alarm_object("고객 이름: ", customer_name);

            alarm.set_push(
              "서비스 알림",
              "네츠서비스가 내일 진행됩니다. 고객님께 해피콜을 진행해주세요."
            );
          }
          break;
      }

      // 알림 db에 저장
    } catch (err) {
      logger.error("alarm err : " + err);
    } finally {
      {
        try {
          let sql_save;

          if (alarm_kind < 12) {
            sql_save =
              "Insert into customer_alarm (alarm_kind, alarm_content, alarm_time, user_number, reservation_id, alarm_object_title, alarm_object_data) values (?,?,?,?,?,?,?);";
          } else {
            sql_save =
              "Insert into manager_alarm (alarm_kind, alarm_content, alarm_time, netsmanager_number, reservation_id, alarm_object_title, alarm_object_data) values (?,?,?,?,?,?,?);";
          }

          await connection1.query(sql_save, [
            alarm_kind,
            alarm.context,
            new Date(),
            alarm.user_number,
            reservation_id,
            alarm.alarm_object_title,
            alarm.alarm_object_data,
          ]);
        } catch (err) {
          logger.error("alarm setting err : " + err);
        } finally {
          // push 알림
          if (alarm.push_text != null) {
            push_alarm.pushAlarm(
              alarm.push_text,
              alarm.push_title,
              alarm.device_token
            );
          }

          connection1.release();
          return alarm;
        }
      }
    }
  } catch (err) {
    logger.error("alarm err : " + err);
  }
}
module.exports.set_alarm = set_alarm;
