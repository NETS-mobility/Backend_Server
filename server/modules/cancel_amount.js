// ===== 취소 가능 금액 반환 =====

const pool = require("./mysql");
const pool2 = require("./mysql2");
const formatdate = require("./formatdate");

const logger = require("../config/logger");

module.exports = {
  calCancelAmount: async (reservationId) => {
    // 서비스 예약일(날짜+시간, 날짜), 예상 픽업 시각
    let hopeDateTime, hopeDate, expPickupTime;
    // 결제 금액, 취소 가능 금액
    let paymentAmount, cancelAmount;
    // 예약 신청일(날짜+시간, 날짜)
    let submitDateTime, submitDate;
    // 취소 신청일(날짜+시간, 날짜)
    let nowDateTime, nowDate;

    const connection = await pool2.getConnection(async (conn) => conn);
    try {
      const sql_reserve_info = `SELECT hope_reservation_date, expect_pickup_time FROM reservation WHERE reservation_id=?;`;
      const sql_pay_info = `SELECT payment_amount FROM base_payment WHERE reservation_id=?;`;

      // 서비스 예약일, 예상 픽업 시각
      const result_reserve_info = await connection.query(sql_reserve_info, [reservationId]);
      const sql_data_reserve_info = result_reserve_info[0];

      hopeDate = sql_data_reserve_info[0].hope_reservation_date;
      expPickupTime = sql_data_reserve_info[0].expect_pickup_time;

      // 결제 금액
      const result_pay_info = await connection.query(sql_pay_info, [reservationId]);
      const sql_data_pay_info = result_pay_info[0];

      paymentAmount = sql_data_pay_info[0].payment_amount;

      // === 예약 신청일(날짜+시간, 날짜) ===
      submitDateTime = "20" + reservationId.substring(0, 2) + "-" +
                        reservationId.substring(2, 4) + "-" +
                        reservationId.substring(4, 6) + " " +
                        reservationId.substring(6, 8) + ":" +
                        reservationId.substring(8, 10) + ":" +
                        reservationId.substring(10);

      submitDate = "20" + reservationId.substring(0, 2) + "-" +
                    reservationId.substring(2, 4) + "-" +
                    reservationId.substring(4, 6);

      // 날짜로 변환
      submitDateTime = new Date(submitDateTime);
      submitDate = new Date(submitDate);

      // === 취소 신청일(날짜+시간, 날짜) ===
      const now = new Date();
      nowDateTime = formatdate.getFormatDate(now, 1); // 날짜,시간
      nowDate = formatdate.getFormatDate(now, 2); // 날짜

      // 날짜로 변환
      nowDateTime = new Date(nowDateTime);
      nowDate = new Date(nowDate);

      // === 서비스 예약일(날짜+시간, 날짜) ===
      hopeDate = formatdate.getFormatDate(new Date(hopeDate), 2); // 날짜
      hopeDateTime = hopeDate + " " + expPickupTime;

      // 날짜로 변환
      hopeDateTime = new Date(hopeDateTime);
      hopeDate = new Date(hopeDate);

      // === 취소 가능 금액 계산 ===
      // 예약 후 24시간 이내, 서비스 날짜 기준 11일 전=100%
      // 서비스 날짜 기준 7~10일 전=기본 수수료 차감(10000원)+70%
      // 서비스 날짜 기준 2~6일 전=기본 수수료 차감(10000원)+60%
      // 서비스 날짜 기준 48시간 이내=0%

      // 예약 신청 시간과 현재 시간 차이 계산(시간)
      let gap = (nowDateTime.getTime() - submitDateTime.getTime()) / (1000 * 60 * 60); // 차이(시간)
      if (gap <= 24) { // 24시간 이내
        cancelAmount = paymentAmount;
        return cancelAmount; // 취소 가능 금액 반환
      }
      
      // 서비스 예약일과 현재 일 차이 계산(일)
      gap = (hopeDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24) // 차이(일)
      if (gap >= 11) // 11일 전
        cancelAmount = paymentAmount;
      else if (gap >= 7) // 7~10일 전
        cancelAmount = parseInt(paymentAmount * 0.7 - 10000);
      else if (gap >= 2) // 2~6일 전
        cancelAmount = parseInt(paymentAmount * 0.6 - 10000);
      else
        cancelAmount = 0;

      if (cancelAmount < 0)
        cancelAmount = 0;

      if (cancelAmount != 0)
        cancelAmount = Math.floor(cancelAmount / 100) * 100; // 100원 단위

      return cancelAmount; // 취소 가능 금액 반환
    } catch (err) {
      console.error("err : " + err);
      logger.error(__filename + " : " + err);
    } finally {
      connection.release();
    }
  }
};
