// ===== 추가요금 반환 =====

const pool = require("./mysql");
const pool2 = require("./mysql2");

module.exports = {
  calExtracost: async (reservationId) => {
    // 서비스 예약 날짜
    let hopeDate;
    // 서비스 종류, 병원동행 시간, 예상 픽업 시각, 희망 병원에서 귀가 출발 시각
    let serviceKindId, gowithTime, expPickupTime, hopeHospitalDepartureTime;
    // 실제 픽업 시각, 실제 병원에서 귀가 출발 시각, 실제 병원동행 시간
    let realPickupTime, realHospitalDepartureTime, realgowithTime;
    // 동행 초과요금 단위값, 동행 초과요금 단위 금액
    let gowithTimeUnit, gowithTimeUnitValue;
    // 승차 지연 대기요금 단위값, 승차 지연 대기요금 단위 금액, 승차 지연 대기요금 무료 단위값, 승차 지연 대기요금 최대 단위값
    let delayTimeUnit, delayTimeUnitValue, delayTimeFreeUnit, delayTimeMaxUnit;
    // 총 추가요금
    let TotalExtraCost;

    const connection = await pool2.getConnection(async);
    try {
      const sql1 = `SELECT service_kind_id, gowith_hospital_time, expect_pickup_time, hope_hospital_departure_time, hope_reservation_date
                    FROM reservation WHERE reservation_id=?;`;

      const sql2 = `SELECT real_pickup_time, real_return_start_time, real_hospital_gowith_time
                    FROM service_progress WHERE reservation_id=?;`;

      const sql3 = `SELECT extra_cost_unit_value, extra_cost_per_unit_value, extra_cost_free_unit_value, extra_cost_max_unit_value
                    FROM extra_cost WHERE extra_cost_kind_id IN (3, 4);`;

      // 서비스 예약 날짜
      // 서비스 종류, 병원동행 시간, 예상 픽업 시각, 희망 병원에서 귀가 출발 시각
      const result1 = await connection.query(sql1, [reservationId]);
      const sql_data1 = result1[0];

      hopeDate = sql_data1[0].hope_reservation_date;

      serviceKindId = sql_data1[0].service_kind_id;
      gowithTime = sql_data1[0].gowith_hospital_time;
      expPickupTime = sql_data1[0].expect_pickup_time;
      hopeHospitalDepartureTime = sql_data1[0].hope_hospital_departure_time;

      // 실제 픽업 시각, 실제 병원에서 귀가 출발 시각, 실제 병원동행 시간
      const result2 = await connection.query(sql2, [reservationId]);
      const sql_data2 = result2[0];

      realPickupTime = sql_data2[0].real_pickup_time;
      realHospitalDepartureTime = sql_data2[0].real_return_start_time;
      realgowithTime = sql_data2[0].real_hospital_gowith_time;

      // 동행 초과요금 단위값, 동행 초과요금 단위 금액
      // 승차 지연 대기요금 단위값, 승차 지연 대기요금 단위 금액, 승차 지연 대기요금 무료 단위값, 승차 지연 대기요금 최대 단위값
      const result3 = await connection.query(sql3);
      const sql_data3 = result3[0];

      gowithTimeUnit = sql_data3[0].extra_cost_unit_value;
      gowithTimeUnitValue = sql_data3[0].extra_cost_per_unit_value;

      delayTimeUnit = sql_data3[1].extra_cost_unit_value;
      delayTimeUnitValue = sql_data3[1].extra_cost_per_unit_value;
      delayTimeFreeUnit = sql_data3[1].extra_cost_free_unit_value;
      delayTimeMaxUnit = sql_data3[1].extra_cost_max_unit_value;

      // === 동행 시간 초과요금 계산 ===
      let overGowithTime; // 초과 동행 시간(분)
      let timelevel1; // 초과요금 부과 단게
      let overGowithTimeCost = 0; // 동행 시간 초과요금

      if (serviceKindId != 1) {
        // 네츠 무브는 제외
        overGowithTime = realgowithTime - gowithTime; // 초과 동행 시간(분)

        if (overGowithTime > 0) {
          timelevel1 = parseInt(overGowithTime / gowithTimeUnit); // 단계 계산
          if (overGowithTime % gowithTimeUnit != 0) timelevel1 += 1;

          overGowithTimeCost = timelevel1 * gowithTimeUnitValue;
        }
      }

      // === 승차 지연 대기요금 계산 ===
      let delayTime = 0; // 승차 지연 대기 시간(분)
      let timelevel2; // 대기요금 부과 단계
      let delayTimeCost = 0; // 승차 지연 대기요금

      // 날짜로 변환
      expPickupTime = hopeDate + " " + expPickupTime;
      expPickupTime = new Date(expPickupTime);
      realPickupTime = new Date(realPickupTime * 1000);

      if (serviceKindId == 3 || serviceKindId == 5) {
        // 왕복일 경우
        hopeHospitalDepartureTime = hopeDate + " " + hopeHospitalDepartureTime;
        hopeHospitalDepartureTime = new Date(hopeHospitalDepartureTime);
        realHospitalDepartureTime = new Date(realHospitalDepartureTime * 1000);
      }

      // 승차 지연인지 판단
      if (realPickupTime > expPickupTime) {
        // 픽업 시간이 지연되면
        let gap =
          (realPickupTime.getTime() - expPickupTime.getTime()) / (1000 * 60); // 차이(분)
        delayTime += parseInt(gap);
      }

      if (serviceKindId == 3 || serviceKindId == 5) {
        // 왕복일 경우
        if (realHospitalDepartureTime > hopeHospitalDepartureTime) {
          // 병원에서 귀가 출발 시간이 지연되면
          let gap =
            (realHospitalDepartureTime.getTime() -
              hopeHospitalDepartureTime.getTime()) /
            (1000 * 60); // 차이(분)
          delayTime += parseInt(gap);
        }
      }

      delayTime = delayTime - delayTimeFreeUnit; // 초과 승차 지연 대기 시간

      if (delayTime > 0) {
        if (delayTime > delayTimeMaxUnit - delayTimeFreeUnit)
          // 최대 초과 승차 지연 대기 시간으로 설정
          delayTime = delayTimeMaxUnit - delayTimeFreeUnit;

        timelevel2 = parseInt(delayTime / delayTimeUnit); // 단계 계산
        if (delayTime % delayTimeUnit != 0) timelevel2 += 1;

        delayTimeCost = timelevel2 * delayTimeUnitValue;
      }

      // === 총 추가요금 ===
      TotalExtraCost = overGowithTimeCost + delayTimeCost;
      TotalExtraCost = Math.floor(TotalExtraCost / 100) * 100; // 100원 단위

      return extraCost;
    } catch (err) {
      console.error("err : " + err);
    } finally {
      connection.release();
    }
  }
};
