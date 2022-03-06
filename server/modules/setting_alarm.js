const express = require("express");
const mysql = require("mysql");
const conn = require("../config/database");
const alarm_kind_number = require("../config/alarm_kind");
const getFormatDate = require("./formatdate");
const pool = require("./mysql");
const pool2 = require("./mysql2");

class Alarm {
  constructor(user_id, reservation_id, alarm_type, reservation_time) {
    this.user_id = user_id;
    this.reservation_id = reservation_id;
    this.alarm_type = alarm_type;
    //this.reservation_date = getFormatDate.getFormatDate(reservation_time, 2);
    this.reservation_date = reservation_time;
    this.pickup_time = reservation_time;
    //this.pickup_time = getFormatDate(reservation_time, 3);
    this.context;
    this.push_title;
    this.push_text;
  }

  set_time(reservation_time) {
    //this.reservation_date = getFormatDate(reservation_time, 2);
    //this.pickup_time = getFormatDate(reservation_time, 3);
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
}

async function set_alarm(reservation_id, alarm_kind, user_number, pickup_time) {
  let alarm;
  const connection1 = mysql.createConnection(conn);
  connection1.connect();

  //let sql_get_reservation_time =
  //  "select min(expect_car_pickup_time) as pickup_time from car_dispatch where reservation_id =?";

  //let sql_get_reservation_time = "select * from reservation";
  /*let sql_res = await connection1.query(
    sql_get_reservation_time,
    reservation_id,
    async function (err, results, fields) {
      if (err) {
        console.log(err);
      }
      console.log(results);
    }
  );

  let reservation_time = await sql_res.expect_pickup_time;
  console.log(reservation_time);*/

  alarm = new Alarm(user_number, reservation_id, alarm_kind, pickup_time);

  connection1.end();
  //console.log(sql_res);
  switch (parseInt(alarm.alarm_type)) {
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
            alarm.reservation_date +
            "\n픽업 예정시간: " +
            alarm.pickup_time
        );
        alarm.set_push(
          "매칭 완료\n",
          "예약 확정을 위해 결제 부탁드립니다.\n" +
            "1시간 이내에 결제되지 않을 경우 예약이 취소될 수 있습니다. "
        );
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
            alarm.reservation_date +
            "\n픽업 예정시간: " +
            alarm.pickup_time
        );
        alarm.set_push(
          "결제 요청",
          "예약 확정을 위해 결제 부탁드립니다." +
            "\n30분 이내에 결제되지 않을 경우 예약이 취소될 수 있습니다. "
        );
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
    /*case alarm_kind_number.confirm_reservation:
      {
        const connection2 = mysql.createConnection(conn);
        connection2.connect();
        let car_id, netsmanager_name;

        let sql =
          "select cd.car_id, m.netsmanager_name " +
          "from car_dispatch as cd inner join reservation as r inner join netsmanager as m " +
          "where cd.reservation_id = r.reservation_id and m.netsmanager_number = cd.netsmanager_number and " +
          "r.reservation_id = ?";

        let sql_res = await connection2.query(
          sql,
          reservation_id,
          async function (err, results, fields) {
            if (err) {
              console.log(err);
            }
            console.log(results);
          }
        );
        console.log(sql_res);
        [car_id, netsmanager_name] = await sql_res;
        console.log(sql_res);

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
        connection2.release();
      }
      break;*/
    // 방문 예정
    /*case alarm_kind_number.visit:
      {
        const connection2 = pool2.getConnection(async (conn) => conn);
        let sql =
          "select m.netsmanager_name " +
          "from car_dispatch as cd inner join reservation as r inner join netsmanager as m " +
          "where cd.reservation_id = r.reservation_id and m.netsmanager_number = cd.netsmanager_number and " +
          "r.reservation_id = ?";

        let netsmanager_name = connection2.query(sql, reservation_id);

        alarm.set_context(
          "네츠매니저 " +
            netsmanager_name +
            "입니다.\n" +
            "금일 예약하신 서비스를 위해 " +
            insert_pickup_time + // insert_pickup_time은 직접 입력
            "방문드릴 예정입니다.\n" +
            "감사합니다."
        );
        alarm.set_push(
          "방문 알림\n",
          "금일 예약하신 서비스를 위해 " +
            insert_pickup_time +
            "방문드릴 예정입니다.\n" +
            "감사합니다."
        );
        connection2.release();
      }
      break;
    // 지연 예상
    case alarm_kind_number.delay:
      {
        alarm.set_context(
          "네츠매니저 " +
            netsmanager_name +
            "입니다.\n" +
            "교통체증 등으로 인해 안내드린 픽업시간에서 " +
            delay_time + // delay_time을 입력해야함
            "지연이 예상됩니다.\n 불편을 드린 점, 양해바랍니다."
        );
        alarm.set_push(
          "지연 알림\n",
          "교통체증 등으로 인해 안내드린 픽업시간에서 " +
            delay_time + // delay_time을 입력해야함
            "지연이 예상됩니다.\n 불편을 드린 점, 양해바랍니다.\n"
        );
      }
      break;
    // 20분 이상 지연
    case alarm_kind_number.delay_over_20min:
      {
        const connection2 = pool2.getConnection(async (conn) => conn);

        let patient_name,
          patient_phone,
          protector_name,
          protector_phone,
          netsmanager_name;

        let sql =
          "select r.patient_name, r.patient_phone, r.protector_name, r.protector_phone,m.netsmanager_name " +
          "from car_dispatch as cd inner join reservation as r inner join netsmanager as m inner join reservation_user as ru" +
          "where cd.reservation_id = r.reservation_id and m.netsmanager_number = cd.netsmanager_number and ru.reservation_id = r.reservation_id" +
          "r.reservation_id = ?";

        [
          patient_name,
          patient_phone,
          protector_name,
          protector_phone,
          netsmanager_name,
        ] = connection2.query(sql, reservation_id);

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
        connection2.release();
      }
      break;
    // 동행 상황 보고
    case alarm_kind_number.report_progress:
      {
        const connection2 = pool2.getConnection(async (conn) => conn);
        alarm.set_context(
          user_name +
            "고객님 동행 상황 보고\n" +
            "네츠 서비스 내용: " +
            service_context + // 서비스 내용과 첨부하는 사진은 수정? 가능해야한다.
            picture_path
        );
        alarm.set_push("동행 보고", "동행 상황을 보고드립니다.");
        connection2.release();
      }
      break;
    // 동행 상황 보고(동행 완료)
    case alarm_kind_number.report_end:
      {
        const connection2 = pool2.getConnection(async (conn) => conn);
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
            servey_url
        );
        alarm.set_push("동행 완료", "네츠 서비스 내용을 안내드립니다.");
        connection2.release();
      }
      break;
    // 병원동행 추가요금 결제
    case alarm_kind_number.extra_payment:
      {
        const connection2 = pool2.getConnection(async (conn) => conn);
        alarm.set_context(
          "병원 동행 서비스 시간이 초과되어 추가요금 결제 부탁드립니다.\n" +
            "서비스번호: " +
            reservation_id +
            "\n최초 예약시간: " +
            origin_service_time +
            "\n실제 서비스 시간: " +
            real_service_time +
            "\n초과 시간: " +
            over_time +
            "\n초과 요금: " +
            over_cost
        );
        alarm.set_push(
          "추가요금 결제 요청",
          "병원 동행 서비스 시간이 초과되어 추가요금 결제 부탁드립니다."
        );
        connection2.release();
      }
      break;
    // 대기요금 결제
    case alarm_kind_number.waiting_payment:
      {
        const connection2 = pool2.getConnection(async (conn) => conn);
        alarm.set_context(
          "대기요금이 발생하여 결제 부탁드립니다.\n" +
            "서비스번호: " +
            reservation_id +
            "\n대기 시간: " +
            wait_time + // wait_time도 입력되어야 한다.
            "\n대기 요금: " +
            wait_cost // wait_cost는 wait_time으로 계산해야 할듯?
        );
        alarm.set_push(
          "대기요금 결제 요청",
          "대기요금이 발생하여 결제 부탁드립니다."
        );
        connection2.release();
      }
      break;
    // = 매니저용 알림 =
    // 예약 확정
    case alarm_kind_number.m_confirm_reservation:
      {
        const connection2 = pool2.getConnection(async (conn) => conn);
        alarm.set_context(
          "네츠 예약이 확정되었습니다.\n" +
            "서비스번호: " +
            reservation_id +
            "\n예약일정: " +
            reservation_date +
            "\n픽업 예정시간: " +
            pickup_time +
            "\n픽업주소: " +
            pickup_address +
            "\n고객 이름: " +
            user_name +
            "\n네츠 매니저가 예약 확인을 위해 전화드릴 예정입니다.\n" +
            "예약 확정 후, 코로나 의심 증상이 있거나 확진자 접촉 시 고객센터로 연락해주시기 바랍니다.\n" +
            "고객님의 쾌유를 기원합니다.\n"
        );
        alarm.set_push("예약 확정", "네츠 예약이 확정되었습니다.");
        connection2.release();
      }
      break;
    // 하루 전 알림
    case alarm_kind_number.m_prev_notice:
      {
        const connection2 = pool2.getConnection(async (conn) => conn);
        alarm.set_context(
          "네츠서비스가 내일(" +
            reservation_date +
            ") 진행됩니다.\n" +
            "고객님께 해피콜을 진행해주세요.\n" +
            "차고지(기타장소) 출발시간: \n" +
            "픽업 예정시간: " +
            pickup_time +
            "\n픽업주소: " +
            pickup_address +
            "\n고객이름: " +
            user_name
        );
        alarm.set_push(
          "서비스 알림",
          "네츠서비스가 내일 진행됩니다. 고객님께 해피콜을 진행해주세요."
        );
        connection2.release();
      }
      break;*/
  }
  // 알림 db에 저장
  {
    const connection1 = mysql.createConnection(conn);
    connection1.connect();
    let sql_save;

    if (alarm_kind_number < 12) {
      sql_save =
        "Insert into customer_alarm (alarm_kind, alarm_content, user_number) values (?,?,?)";
    } else {
      sql_save =
        "Insert into manager_alarm (alarm_kind, alarm_content, netsmanager_number) values (?,?,?);";
    }

    let sql_res = await connection1.query(
      sql_save,
      alarm_kind,
      alarm.context,
      user_number,
      async function (err, results, fields) {
        if (err) {
          console.log("alarm error: " + err);
        }
        console.log("alarm saved: " + results);
      }
    );

    let reservation_time = await sql_res.expect_pickup_time;
    console.log(reservation_time);

    alarm = new Alarm(user_number, reservation_id, alarm_kind, pickup_time);

    connection1.end();
  }
  return alarm;
}
module.exports.set_alarm = set_alarm;
