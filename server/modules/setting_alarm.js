// 알림을 생성하는 module
// 사용법:alarm.set_alarm(reservation_id, user_number, alarm_kind, 기타 값);
/* 기타값: visit -> 방문 예정시간
          delay -> delay_time
          extra_payment -> [실제 서비스 시간, 초과요금]
          waiting_payment -> [대기시간, 대기요금]
          */
const express = require("express");
const util = require("util"); // db에서 불러오는 파일 변환
const mysql = require("mysql");
const conn = require("../config/database");
const alarm_kind_number = require("../config/alarm_kind");
const url = require("../config/url");
const pool = require("./mysql");
const pool2 = require("./mysql2");
const cron = require("node-cron");

class Alarm {
  constructor(user_number, reservation_id, alarm_kind) {
    this.user_number = user_number;
    this.reservation_id = reservation_id;
    this.alarm_kind = alarm_kind;
    this.reservation_date;
    this.pickup_time;
    this.context;
    this.push_title;
    this.push_text;
  }

  set_time(timestamp) {
    this.reservation_date = timestamp.substr(0, 10);
    this.pickup_time = timestamp.substr(11, 8);
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
}

async function set_alarm(reservation_id, alarm_kind, user_number, temp) {
  let alarm = new Alarm(user_number, reservation_id, alarm_kind);
  const connection1 = await pool2.getConnection(async (conn) => conn);
  try {
    // DB에서 pickup time 추출
    let sql_get_reservation_time =
      "select min(expect_car_pickup_time) as pickup_time from car_dispatch where reservation_id =?";

    let sql_res = await connection1.query(sql_get_reservation_time, [
      reservation_id,
    ]);

    let res = util.inspect(sql_res[0]);

    alarm.set_time(res.substr(17, 19)); // 결과에서 timestamp값만 추출

    switch (parseInt(alarm.alarm_kind)) {
      // = 관리자, 고객용 알림 =
      // 결제 요청
      case alarm_kind_number.request_payment:
        {
          alarm.set_context(
            "네츠서비스가 매칭되었습니다. \n" +
              "예약 확정을 위해 결제 부탁드립니다.\n" +
              "1시간 이내에 결제되지 않을 경우 예약이 취소될 수 있습니다. \n" +
              "서비스번호: " +
              reservation_id +
              "\n예약일정:" +
              alarm.get_reservDate() +
              "\n픽업 예정시간: " +
              alarm.get_pickupTime()
          );
          alarm.set_push(
            "매칭 완료\n",
            "예약 확정을 위해 결제 부탁드립니다.\n" +
              "1시간 이내에 결제되지 않을 경우 예약이 취소될 수 있습니다. "
          );
          /*
          const task = cron.schedule(
            "30 1 * * * ", // 1시간 30분 뒤에 실행됨 (초, 분, 시, 일, 월, 주?)
            //"1 * * * * ", // 1분 뒤에 실행됨?
            () => {
              // 결제 여부 확인
              let sql =
                "select payment_state from payment where reservation_id =?";

              sql_res = connection1.query(sql, [reservation_id]);
              res = util.inspect(sql_res[0]);
              connection1.release();

              payment = res.substr(19); // res에서 payment에 해당하는 값만 추출

              if (payment == "결제대기") {
                set_alarm(
                  reservation_id,
                  alarm_kind_number.press_payment,
                  user_number,
                  pickup_time
                );
              }
              task.destroy();
            },
            {
              scheduled: false, // start()함수로 시작시 스케줄링된 작업 실행
            }
          );
          task.start();*/
        }
        break;
      // 결제 독촉
      case alarm_kind_number.press_payment:
        {
          alarm.set_context(
            "네츠서비스가 매칭되었습니다.\n" +
              "예약 확정을 위해 결제 부탁드립니다.\n" +
              "30분 이내에 결제되지 않을 경우 예약이 취소될 수 있습니다. \n" +
              "서비스번호: " +
              reservation_id +
              "\n예약일정: " +
              alarm.get_reservDate() +
              "\n픽업 예정시간: " +
              alarm.get_pickupTime()
          );
          alarm.set_push(
            "결제 요청",
            "예약 확정을 위해 결제 부탁드립니다." +
              "\n30분 이내에 결제되지 않을 경우 예약이 취소될 수 있습니다. "
          );
          // 다음 결제 요청 설정
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
          alarm.set_context(
            "결제시간 초과로 예약이 취소되었습니다.\n" +
              "서비스번호: " +
              reservation_id +
              "\n예약일정: " +
              alarm.reservation_date +
              "\n픽업 예정시간: " +
              alarm.pickup_time +
              "\n고객님의 쾌유와 가족의 건강을 기원합니다."
          );
          alarm.set_push(
            "예약 취소\n",
            "예약 확정을 위해 결제 부탁드립니다.\n" +
              "결제시간 초과로 예약이 취소되었습니다."
          );
        }
        break;
      // 예약 확정
      case alarm_kind_number.confirm_reservation:
        {
          let car_id, netsmanager_name;

          let sql =
            "select cd.car_id, m.netsmanager_name " +
            "from car_dispatch as cd inner join reservation as r inner join netsmanager as m " +
            "where cd.reservation_id = r.reservation_id and m.netsmanager_number = cd.netsmanager_number and " +
            "r.reservation_id = ?";

          let sql_res = await connection1.query(sql, [reservation_id]);
          console.log(sql_res[0]);

          alarm.set_context(
            "네츠 예약이 확정되었습니다.\n" +
              "서비스번호: " +
              reservation_id +
              "\n예약일정: " +
              alarm.reservation_date +
              "\n픽업 예정시간: " +
              alarm.pickup_time +
              "\n배차 차량번호: " +
              car_id +
              "\n네츠 매니저: " +
              netsmanager_name +
              "\n네츠 매니저가 예약 확인을 위해 전화드릴 예정입니다.\n" +
              "예약 확정 후, 코로나 의심 증상이 있거나 확진자 접촉시 고객센터로 연락해주시기 바랍니다.\n" +
              "고객님의 쾌유를 기원합니다."
          );

          alarm.set_push("예약 확정", "네츠 예약이 확정되었습니다.");
        }
        break;
      // 방문 예정
      case alarm_kind_number.visit:
        {
          let sql =
            "select m.netsmanager_name " +
            "from car_dispatch as cd inner join reservation as r inner join netsmanager as m " +
            "where cd.reservation_id = r.reservation_id and m.netsmanager_number = cd.netsmanager_number and " +
            "r.reservation_id = ?";

          let netsmanager_name = await connection1.query(sql, [reservation_id]);
          netsmanager_name = util.inspect(netsmanager_name[0]);
          netsmanager_name = netsmanager_name.substr(23, 3);

          alarm.set_context(
            "네츠매니저 " +
              netsmanager_name +
              "입니다.\n" +
              "금일 예약하신 서비스를 위해 " +
              temp + // temp는 방문 예정시간을 인자로 입력받음
              "방문드릴 예정입니다.\n" +
              "감사합니다."
          );
          alarm.set_push(
            "방문 알림\n",
            "금일 예약하신 서비스를 위해 " +
              temp +
              "방문드릴 예정입니다.\n" +
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

          let netsmanager_name = await connection1.query(sql, [reservation_id]);
          netsmanager_name = util.inspect(netsmanager_name[0]);
          netsmanager_name = netsmanager_name.substr(23, 3);

          alarm.set_context(
            "네츠매니저 " +
              netsmanager_name +
              "입니다.\n" +
              "교통체증 등으로 인해 안내드린 픽업시간에서 " +
              temp + // 입력된 delay_time
              "지연이 예상됩니다.\n 불편을 드린 점, 양해바랍니다."
          );
          alarm.set_push(
            "지연 알림\n",
            "교통체증 등으로 인해 안내드린 픽업시간에서 " +
              temp + // 입력된 delay_time
              "지연이 예상됩니다.\n 불편을 드린 점, 양해바랍니다.\n"
          );
        }
        break;
      // 20분 이상 지연
      case alarm_kind_number.delay_over_20min:
        {
          let sql =
            "select ru.patient_name, ru.patient_phone, ru.protector_name, ru.protector_phone,m.netsmanager_name " +
            "from car_dispatch as cd inner join reservation as r inner join netsmanager as m inner join reservation_user as ru " +
            "where cd.reservation_id = r.reservation_id and m.netsmanager_number = cd.netsmanager_number and ru.reservation_id = r.reservation_id and " +
            "r.reservation_id =?;";

          let patient_name,
            patient_phone,
            protector_name,
            protector_phone,
            netsmanager_name;

          res = await connection1.query(sql, [reservation_id]);
          console.log(res[0]);

          alarm.set_context(
            "네츠 차량 픽업이 20분이상 지연되었습니다.\n" +
              "서비스번호: " +
              reservation_id +
              "\n픽업 시간: " +
              alarm.pickup_time +
              "\n고객 성함: " +
              patient_name +
              "\n고객 전화: " +
              patient_phone +
              "\n보호자 성함: " +
              protector_name +
              "\n보호자 전화: " +
              protector_phone +
              "\n네츠 매니저: " +
              netsmanager_name
          );
          alarm.set_push(
            "지연 알림",
            "네츠 차량 픽업이 20분이상 지연되었습니다."
          );
        }
        break;
      // 동행 상황 보고
      case alarm_kind_number.report_progress:
        {
          let service_context, picture_path, user_name;

          // 서비스 내용 찾기
          sql =
            "select fixed_medical_detail from reservation where reservation_id =?";
          res = await connection1.query(sql, [reservation_id]);
          service_context = util.inspect(res[0]);
          service_context = service_context.slice(27, -5);
          picture_path = "../../dlfkdsfj"; // 저장 경로 삽입

          // user 이름 찾기
          sql = "select user_name from user where user_number =?";
          user_name = await connection1.query(sql, user_number);
          user_name = util.inspect(user_name[0]).slice(16, -5);

          alarm.set_context(
            user_name +
              "고객님 동행 상황 보고\n" +
              "네츠 서비스 내용: " +
              service_context + // 서비스 내용과 첨부하는 사진은 수정? 가능해야한다.
              picture_path
          );
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
            "select fixed_medical_detail from reservation where reservation_id =?";
          res = await connection1.query(sql, [reservation_id]);
          let service_context = util.inspect(res[0]);
          service_context = service_context.slice(27, -5);

          let picture_path = "../../dlfkdsfj"; // 저장 경로 삽입

          alarm.set_context(
            user_name +
              "고객님 동행 상황 보고\n" +
              "네츠 서비스 내용" +
              service_context + // 서비스 내용을 타입으로 해도 되는지?
              "\n첨부된 사진" +
              picture_path + // TODO: 사진 연결
              "[오늘 동행은 어떠셨을까요?]\n" +
              "서비스 품질 개선을 위해 고객님의 의견을 듣고자 합니다.\n" +
              "잠시 시간을 허락하시어 설문해 주신다면 편안하고 안전한 동행을 위해 더 나은 서비스로 노력하겠습니다.\n" +
              "고객님의 쾌유와 가족의 건강을 기원합니다.\n" +
              "네츠 고객 감동실 드림" +
              url.servey_url
          );
          alarm.set_push("동행 완료", "네츠 서비스 내용을 안내드립니다.");
        }
        break;
      // 병원동행 추가요금 결제
      case alarm_kind_number.extra_payment: // 실제 서비스 시간과 초과 요금은 입력받는다.
        {
          let origin_service_time, real_service_time, over_time, over_cost;
          real_service_time = temp[0];

          sql =
            "select gowith_hospital_time from reservation where reservation_id =?";
          res = await connection1.query(sql, [reservation_id]);

          origin_service_time = util.inspect(res[0]).slice(26, -4);

          over_time = real_service_time - origin_service_time;
          over_cost = temp[1];

          alarm.set_context(
            "병원 동행 서비스 시간이 초과되어 추가요금 결제 부탁드립니다.\n" +
              "서비스번호: " +
              reservation_id +
              "\n최초 예약시간: " +
              origin_service_time +
              "\n실제 서비스 시간: " +
              real_service_time + // 실제 서비스 시간은 입력받음
              "\n초과 시간: " +
              over_time +
              "\n초과 요금: " +
              over_cost
          );
          alarm.set_push(
            "추가요금 결제 요청",
            "병원 동행 서비스 시간이 초과되어 추가요금 결제 부탁드립니다."
          );
        }
        break;
      // 대기요금 결제
      case alarm_kind_number.waiting_payment: // 대기시간과 대기 요금은 입력받는다.
        {
          wait_time = temp[0];
          wait_cost = temp[1];
          alarm.set_context(
            "대기요금이 발생하여 결제 부탁드립니다.\n" +
              "서비스번호: " +
              reservation_id +
              "\n대기 시간: " +
              wait_time +
              "\n대기 요금: " +
              wait_cost
          );
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
          sql =
            "select pickup_address from reservation where reservation_id =?";
          res = await connection1.query(sql, [reservation_id]);
          pickup_address = util.inspect(res[0]).slice(20, -3);

          sql = "select user_name from user where user_number =?";
          user_name = await connection1.query(sql, user_number);
          user_name = util.inspect(user_name[0]).slice(16, -5);

          alarm.set_context(
            "네츠 예약이 확정되었습니다.\n" +
              "서비스번호: " +
              reservation_id +
              "\n예약일정: " +
              alarm.get_reservDate() +
              "\n픽업 예정시간: " +
              alarm.get_pickupTime() +
              "\n픽업주소: " +
              pickup_address +
              "\n고객 이름: " +
              user_name +
              "\n네츠 매니저가 예약 확인을 위해 전화드릴 예정입니다.\n" +
              "예약 확정 후, 코로나 의심 증상이 있거나 확진자 접촉 시 고객센터로 연락해주시기 바랍니다.\n" +
              "고객님의 쾌유를 기원합니다.\n"
          );
          alarm.set_push("예약 확정", "네츠 예약이 확정되었습니다.");

          // 하루 전 알림 설정

          //////////////////////////////////
        }
        break;
      // 하루 전 알림
      case alarm_kind_number.m_prev_notice:
        {
          // 픽업 주소 추출
          sql =
            "select pickup_address from reservation where reservation_id =?";
          res = await connection1.query(sql, [reservation_id]);
          pickup_address = util.inspect(res[0]).slice(20, -3);

          // 고객 이름 추출
          sql = "select user_name from user where user_number =?";
          user_name = await connection1.query(sql, user_number);
          user_name = util.inspect(user_name[0]).slice(16, -5);

          alarm.set_context(
            "네츠서비스가 내일(" +
              alarm.get_reservDate() +
              ") 진행됩니다.\n" +
              "고객님께 해피콜을 진행해주세요.\n" +
              "차고지(기타장소) 출발시간: \n" +
              "픽업 예정시간: " +
              alarm.get_pickupTime() +
              "\n픽업주소: " +
              pickup_address +
              "\n고객이름: " +
              user_name
          );
          alarm.set_push(
            "서비스 알림",
            "네츠서비스가 내일 진행됩니다. 고객님께 해피콜을 진행해주세요."
          );
        }
        break;
    }
    // 알림 db에 저장
  } catch (err) {
    console.error("err : " + err);
    if (err == 0) res.status(401).send({ err: "잘못된 인자 전달" });
    else res.status(500).send({ err : "오류-" + err }); // res.status(500).send({ err: "서버 오류" });
  } finally {
    {
      let sql_save;

      if (alarm_kind < 12) {
        sql_save =
          "Insert into customer_alarm (alarm_kind, alarm_content, alarm_time, user_number) values (?,?,?,?)";
      } else {
        sql_save =
          "Insert into manager_alarm (alarm_kind, alarm_content, alarm_time, netsmanager_number) values (?,?,?,?);";
      }

      await connection1.query(sql_save, [
        alarm_kind,
        alarm.context,
        new Date(),
        user_number,
      ]);
    }
    connection1.release();
    return alarm;
  }
}
module.exports.set_alarm = set_alarm;
