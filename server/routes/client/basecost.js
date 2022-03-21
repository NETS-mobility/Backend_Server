const express = require("express");
const logger = require("../../config/logger");
const router = express.Router();

const jwt = require("../../modules/jwt");
const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");

// ===== 기본 요금 반환 =====
router.post("", async function (req, res, next) {
  const reservationId = req.body.reservationId;
  const token = req.body.jwtToken;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });

  // 서비스 예약 날짜
  let hopeDate;
  // 서비스 종류, 병원동행 시간, 예상 픽업 시각, 예상 서비스 종료 시각, 예상 이동 거리
  let serviceKindId,
    gowithTime,
    expPickupTime,
    expTerminateServiceTime,
    expMoveDistance;
  // 기본 이동 거리, 기본 병원동행 시간, 기본 요금
  let baseMoveDistance, baseGowithTime, baseCost;
  // 이동거리 추가요금 단위값, 이동거리 추가요금 단위 금액
  let moveDistanceUnit, moveDistanceUnitValue;
  // 동행 추가요금 단위값, 동행 추가요금 단위 금액
  let gowithTimeUnit, gowithTimeUnitValue;
  // 심야 할증 비율, 주말 할증 비율
  let nightRatio, weekendRatio;
  // 심야 시간
  let nightstart, nightend;
  // 총 기본요금
  let TotalBaseCost;

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 = `SELECT service_kind_id, gowith_hospital_time, expect_pickup_time, expect_terminate_service_time, hope_reservation_date
                    FROM reservation WHERE reservation_id=?;`;

    const sql2 = `SELECT SUM(expect_move_distance) AS sum FROM car_dispatch WHERE reservation_id=?;`;

    const sql3 = `SELECT service_base_move_distance, service_base_hospital_gowith_time, service_base_cost
                    FROM service_info WHERE service_kind_id=?;`;

    const sql4 = `SELECT extra_cost_unit_value, extra_cost_per_unit_value
                    FROM extra_cost WHERE extra_cost_kind_id IN (1, 2, 6, 7);`;

    const sql5 = `SELECT company_time_start, company_time_end FROM company_time_schedule WHERE company_time_kind="심야시간";`;

    // 서비스 예약 날짜
    // 서비스 종류, 병원동행 시간, 예상 픽업 시각, 예상 서비스 종료 시각
    const result1 = await connection.query(sql1, [reservationId]);
    const sql_data1 = result1[0];

    hopeDate = sql_data1[0].hope_reservation_date;

    serviceKindId = sql_data1[0].service_kind_id;
    gowithTime = sql_data1[0].gowith_hospital_time;
    expPickupTime = sql_data1[0].expect_pickup_time;
    expTerminateServiceTime = sql_data1[0].expect_terminate_service_time;

    // 예상 이동 거리
    const result2 = await connection.query(sql2, [reservationId]);
    const sql_data2 = result2[0];

    expMoveDistance = sql_data2[0].sum;

    // 기본 이동 거리, 기본 병원동행 시간, 기본 요금
    const result3 = await connection.query(sql3, [serviceKindId]);
    const sql_data3 = result3[0];

    baseMoveDistance = sql_data3[0].service_base_move_distance;
    baseGowithTime = sql_data3[0].service_base_hospital_gowith_time;
    baseCost = sql_data3[0].service_base_cost;

    // 이동거리 추가요금 단위값, 이동거리 추가요금 단위 금액
    // 동행 추가요금 단위값, 동행 추가요금 단위 금액
    // 심야 할증 비율, 주말 할증 비율
    const result4 = await connection.query(sql4);
    const sql_data4 = result4[0];

    moveDistanceUnit = sql_data4[0].extra_cost_unit_value;
    moveDistanceUnitValue = sql_data4[0].extra_cost_per_unit_value;

    gowithTimeUnit = sql_data4[1].extra_cost_unit_value;
    gowithTimeUnitValue = sql_data4[1].extra_cost_per_unit_value;

    nightRatio = sql_data4[2].extra_cost_per_unit_value;
    weekendRatio = sql_data4[3].extra_cost_per_unit_value;

    // 심야 시간
    const result5 = await connection.query(sql5);
    const sql_data5 = result5[0];

    nightstart = sql_data5[0].company_time_start;
    nightend = sql_data5[0].company_time_end;

    // === 이동 거리 추가요금 계산 ===
    let overMoveDistance; // 추가 이동 거리(편도 기준)
    let movelevel; // 추가요금 부과 단계
    let overMoveDistanceCost = 0; // 이동 거리 추가요금

    if (serviceKindId == 3 || serviceKindId == 5) {
      // 왕복일 경우 편도 기준으로 바꿈
      expMoveDistance = expMoveDistance / 2;
      baseMoveDistance = baseMoveDistance / 2;
    }

    overMoveDistance = expMoveDistance - baseMoveDistance; // 추가 이동 거리(편도 기준)

    if (overMoveDistance > 0) {
      movelevel = parseInt(overMoveDistance / moveDistanceUnit); // 단계 계산
      if (overMoveDistance % moveDistanceUnit != 0) movelevel += 1;

      overMoveDistanceCost = movelevel * moveDistanceUnitValue;
      if (serviceKindId == 3 || serviceKindId == 5)
        // 왕복일 경우 2배
        overMoveDistanceCost *= 2;
    }

    // === 동행 시간 추가요금 계산 ===
    let overGowithTime; // 추가 동행 시간(분)
    let timelevel; // 추가요금 부과 단계
    let overGowithTimeCost = 0; // 동행 시간 추가요금

    if (serviceKindId != 1) {
      // 네츠 무브는 제외
      overGowithTime = gowithTime - baseGowithTime; // 추가 동행 시간(분)

      if (overGowithTime > 0) {
        timelevel = parseInt(overGowithTime / gowithTimeUnit); // 단계 계산
        if (overGowithTime % gowithTimeUnit != 0) timelevel += 1;

        overGowithTimeCost = timelevel * gowithTimeUnitValue;
      }
    }

    // === 할증 전 기본요금 계산 ===
    TotalBaseCost = baseCost + overMoveDistanceCost + overGowithTimeCost;

    // === 심야 할증 추가요금 계산 ===
    let nightCost = 0; // 심야 할증 추가요금
    let nightmin = 0; // 심야 해당 시간(분)
    let totalmin; // 전체 서비스 시간(분)

    // 날짜로 변환
    expPickupTime = hopeDate + " " + expPickupTime;
    expTerminateServiceTime = hopeDate + " " + expTerminateServiceTime;
    nightstart = hopeDate + " " + nightstart;
    nightend = hopeDate + " " + nightend;

    expPickupTime = new Date(expPickupTime);
    expTerminateServiceTime = new Date(expTerminateServiceTime);
    nightstart = new Date(nightstart);
    nightend = new Date(nightend);

    // 전체 서비스 시간 계산(분)
    let gap =
      (expTerminateServiceTime.getTime() - expPickupTime.getTime()) /
      (1000 * 60); // 차이(분)
    totalmin = parseInt(gap);

    // 심야 시간인지 판단
    if (expTerminateServiceTime > nightend) {
      // 심야 시간에 끝나면
      gap =
        (expTerminateServiceTime.getTime() - nightend.getTime()) / (1000 * 60); // 차이(분)
      nightmin = parseInt(gap);
    }

    if (expPickupTime < nightstart) {
      // 심야 시간에 시작하면
      gap = (nightstart.getTime() - expPickupTime.getTime()) / (1000 * 60); // 차이(분)
      nightmin = parseInt(gap);
    }

    if (expPickupTime > nightend) {
      // 심야 시간에 시작하면
      nightmin = totalmin;
    }

    if (nightmin != 0) {
      nightCost = parseInt(
        TotalBaseCost * (nightmin / totalmin) * (nightRatio - 1)
      );
    }

    // === 주말 할증 추가요금 계산 ===
    let weekendCost = 0; // 주말 할증 추가요금
    let day;

    day = expPickupTime.getDay(); // 요일

    if (day == 0 || day == 6) {
      weekendCost = parseInt(TotalBaseCost * (weekendRatio - 1));
    }

    // === 총 기본요금 ===
    TotalBaseCost += nightCost + weekendCost; // 할증 요금 추가
    TotalBaseCost = Math.floor(TotalBaseCost / 100) * 100; // 100원 단위

    res.status(200).send({ success: true, baseCost: TotalBaseCost });
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

module.exports = router;
