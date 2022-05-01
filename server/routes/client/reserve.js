const express = require("express");
const router = express.Router();

const jwt = require("../../modules/jwt");
const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");
const upload = require("../../modules/fileupload");
const formatdate = require("../../modules/formatdate");
const basecost = require("../../modules/basecost");
const alarm = require("../../modules/setting_alarm");

const reservation_state = require("../../config/reservation_state");
const reservation_payment_state = require("../../config/reservation_payment_state");
const payment_state = require("../../config/payment_state");
const uplPath = require("../../config/upload_path");
const alarm_kind = require("../../config/alarm_kind");
const reciever = require("../../config/push_alarm_reciever");
const logger = require("../../config/logger");

// ===== 예약 전 미결제 내역 확인 =====
router.post("/checkWaitPay", async function (req, res, next) {
  const token = req.body.jwtToken;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });
  const num = token_res.num; // 고객 고유 번호

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql = `SELECT user_number, reservation_id, payment_amount FROM payment_waiting_list WHERE user_number=?;`;
    const result = await connection.query(sql, [num]);
    const sql_data = result[0];

    if (sql_data.length == 0)
      return res.status(200).send({ msg : "미결제 내역 없음-예약 가능" });
    
    const reservationId = sql_data[0].reservation_id;
    const paymentAmount = sql_data[0].payment_amount;
    
    res.status(200).send({
      msg: "미결제 내역 있음-예약 불가능",
      reservationId: String(reservationId),
      amount: paymentAmount,
    });
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 예약 =====
router.post(
  "",
  upload(uplPath.customer_document).single("file"),
  async function (req, res, next) {
    const user = req.body.data; // 예약 정보
    const dp1 = req.body.dispatch1; // 배차 정보1
    const dp2 = req.body.dispatch2; // 배차 정보2
    const token = user.jwtToken;

    const token_res = await jwt.verify(token);
    if (token_res == jwt.TOKEN_EXPIRED)
      return res.status(401).send({ err: "만료된 토큰입니다." });
    if (token_res == jwt.TOKEN_INVALID)
      return res.status(401).send({ err: "유효하지 않은 토큰입니다." });
    const id = token_res.id; // 고객 id
    const name = token_res.name; // 고객 이름

    let gowithHospitalTime = 0; // 병원 동행 시간
    let moveDirectionId,
        protectorName, protectorPhone,
        expPickupTime, expTerminateServiceTime;
    let reservationId; // 예약 번호
    let result_baseCost; // 기본요금 계산 결과

    gowithHospitalTime = user.gowithHospitalTime; // 병원 동행 시간

    // 이동 방향 확인
    if (user.moveDirection == "집-병원") {
      moveDirectionId = 1;
    } else if (user.moveDirection == "병원-집") {
      moveDirectionId = 2;
    } else if (user.moveDirection == "집-집") {
      moveDirectionId = 3;
    }

    // 예상 픽업 시각, 예상 서비스 종료 시각 확인(전체 기준)
    if (user.serviceKindId == 3 || user.serviceKindId == 5) {
      // 왕복
      expPickupTime = dp1.expCarPickupTime.substring(11);
      expTerminateServiceTime = dp2.expCarTerminateServiceTime.substring(11);
    } else {
      // 편도
      expPickupTime = dp1.expCarPickupTime.substring(11);
      expTerminateServiceTime = dp1.expCarTerminateServiceTime.substring(11);
    }

    const connection = await pool2.getConnection(async (conn) => conn);
    try {
      // === 예약 정보 ===
      const sql1 = `SELECT user_number, user_phone FROM user WHERE user_id=?;`;

      const sql2 = `INSERT INTO reservation(reservation_id, reservation_state_id, reservation_payment_state_id, user_number,
                    move_direction_id, service_kind_id, gowith_hospital_time,
                    pickup_address, drop_address, hospital_address,
                    hope_reservation_date, hope_hospital_arrival_time, fixed_medical_time, hope_hospital_departure_time,
                    expect_pickup_time, expect_terminate_service_time,
                    fixed_medical_detail, hope_requires
                    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`;

      const sql3 = `INSERT INTO reservation_user(reservation_id, patient_name, patient_phone, protector_name, protector_phone, valid_target_kind
                    ) VALUES(?,?,?,?,?,?);`;

      const result1 = await connection.query(sql1, [id]);
      const sql_data = result1[0];

      const userNumber = sql_data[0].user_number;
      const userPhone = sql_data[0].user_phone;

      // 보호자 정보
      if ((user.protectorName == undefined || user.protectorName == null || user.protectorName == "") &&
          (user.protectorPhone == undefined || user.protectorPhone == null || user.protectorPhone == "")) {
        // 보호자 정보 없으면, 고객 정보를 저장
        protectorName = name;
        protectorPhone = userPhone;
      } else {
        // 보호자 정보 있으면, 입력값으로 저장
        protectorName = user.protectorName;
        protectorPhone = user.protectorPhone;
      }

      // 예약 신청일=매칭 완료일(날짜,시간)
      const now = new Date();
      const submitDate = formatdate.getFormatDate(now, 1); // 날짜,시간

      // 예약 번호
      reservationId = Number(
        submitDate.substring(2, 4) +
        submitDate.substring(5, 7) +
        submitDate.substring(8, 10) +
        submitDate.substring(11, 13) +
        submitDate.substring(14, 16) +
        submitDate.substring(17)
      );

      // 결제 가능일
      let validDate = new Date(now.setMinutes(now.getMinutes() + 90)); // 1시간 30분 후
      validDate = formatdate.getFormatDate(validDate, 1); // 날짜,시간
      validDate = validDate.substring(0, 17) + "59";

      // 예약 정보 저장
      const result2 = await connection.query(sql2, [
        reservationId,
        reservation_state.new,
        reservation_payment_state.waitBasePay,
        userNumber,
        moveDirectionId,
        user.serviceKindId,
        gowithHospitalTime,
        user.pickupAddr,
        user.dropAddr,
        user.hospitalAddr,
        user.hopeReservationDate,
        user.hopeHospitalArrivalTime,
        user.fixedMedicalTime,
        user.hopeHospitalDepartureTime,
        expPickupTime,
        expTerminateServiceTime,
        user.fixedMedicalDetail,
        user.hopeRequires,
      ]);

      const result3 = await connection.query(sql3, [
        reservationId,
        user.patientName,
        user.patientPhone,
        protectorName,
        protectorPhone,
        user.validTargetKind,
      ]);

      // === 배차 정보 ===
      const sql4 = `INSERT INTO car_dispatch(reservation_id, netsmanager_number, car_id,
                    car_move_direction_id, departure_address, destination_address,
                    expect_move_distance, expect_move_time, expect_car_pickup_time, expect_car_terminate_service_time
                    ) VALUES(?,?,?,?,?,?,?,?,?,?);`;

      const sql5 = `INSERT INTO car_dispatch(reservation_id, netsmanager_number, car_id,
                    car_move_direction_id, departure_address, destination_address,
                    expect_move_distance, expect_move_time, expect_car_pickup_time, expect_car_terminate_service_time
                    ) VALUES(?,?,?,?,?,?,?,?,?,?);`;

      // 배차 정보1 저장
      if (moveDirectionId == 2) {
        // 이동 방향이 병원-집(편도)
        const result4 = await connection.query(sql4, [
          reservationId,
          dp1.netsmanager_number,
          dp1.car_id,
          2,
          user.hospitalAddr,
          user.dropAddr,
          dp1.expMoveDistance,
          dp1.expMoveTime,
          dp1.expCarPickupTime,
          dp1.expCarTerminateServiceTime,
        ]);
      } else {
        // 이동 방향이 집-병원(편도), 집-집(왕복)
        const result4 = await connection.query(sql4, [
          reservationId,
          dp1.netsmanager_number,
          dp1.car_id,
          1,
          user.pickupAddr,
          user.hospitalAddr,
          dp1.expMoveDistance,
          dp1.expMoveTime,
          dp1.expCarPickupTime,
          dp1.expCarTerminateServiceTime,
        ]);
      }

      // 배차 정보2 저장
      if (user.serviceKindId == 3 || user.serviceKindId == 5) {
        // 왕복
        const result5 = await connection.query(sql5, [
          reservationId,
          dp2.netsmanager_number,
          dp2.car_id,
          2,
          user.hospitalAddr,
          user.dropAddr,
          dp2.expMoveDistance,
          dp2.expMoveTime,
          dp2.expCarPickupTime,
          dp2.expCarTerminateServiceTime,
        ]);
      }

      // === 파일 정보 ===
      if (req.file != undefined) {
        // 파일 존재하면
        const file = req.file;
        const filepath = uplPath.customer_document + file.filename; // 업로드 파일 경로
        const sql4 = `UPDATE reservation_user SET valid_target_evidence_path=?, is_submit_evidence=? WHERE reservation_id=?;`;
        await connection.query(sql4, [filepath, 1, reservationId]);
      }

      // === 기본 요금 정보 ===
      const sql6 = `INSERT INTO base_payment(reservation_id, merchant_uid, payment_state_id, payment_amount,
                    base_cost, over_move_distance_cost, over_move_distance, over_gowith_cost, over_gowith_time,
                    night_cost, night_time, weekend_cost,
                    valid_payment_date
                    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?);`;

      result_baseCost = await basecost.calBasecost(reservationId);
      const result6 = await connection.query(sql6, [
        reservationId,
        String(reservationId)+"B",
        payment_state.waitPay,
        result_baseCost.TotalBaseCost,
        result_baseCost.baseCost,
        result_baseCost.overMoveDistanceCost,
        result_baseCost.overMoveDistance,
        result_baseCost.overGowithTimeCost,
        result_baseCost.overGowithTime,
        result_baseCost.nightCost,
        result_baseCost.nightmin,
        result_baseCost.weekendCost,
        validDate,
      ]);
      
      res
        .status(200)
        .send({
          success: true,
          reservationId: String(reservationId),
          baseCost: result_baseCost.TotalBaseCost,
          validDate: validDate,
        });
    } catch (err) {
      logger.error(__filename + " : " + err);
      // res.status(500).send({ err : "서버 오류" });
      res.status(500).send({ err: "오류-" + err });
    } finally {
      // 고객에게 결제 요청 알림 전송
      alarm.set_alarm(
        reciever.customer,
        reservationId,
        alarm_kind.request_payment,
        id
      );
      connection.release();
    }
  }
);

module.exports = router;
