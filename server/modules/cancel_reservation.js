// ===== 예약 취소 상태 처리 =====
// opt가 1이면 취소 대기 처리
// opt가 2이면 취소 완료 처리
/*  
  - 예약 테이블 상태 변경(예약 상태, 결제 상태)
  - 결제 테이블 상태 변경(결제 상태)
  - 배차 테이블 배차 정보 삭제
*/

const pool = require("./mysql");
const pool2 = require("./mysql2");

const reservation_state = require("../config/reservation_state");
const reservation_payment_state = require("../config/reservation_payment_state");
const payment_state = require("../config/payment_state");
const logger = require("../config/logger");

module.exports = {
  cancelReservation: async (reservationId, opt) => {
    const connection = await pool2.getConnection(async (conn) => conn);
    try {
      const sql_cancel_reserv =
        "update `reservation` set `reservation_state_id`=?, `reservation_payment_state_id`=? where reservation_id=?;";
      const sql_cancel_pay =
        "update `base_payment` set `payment_state_id`=? where reservation_id=?;";
      const sql_cancel_dispatch =
        "delete from `car_dispatch` where `reservation_id`=?;";

      if (opt == 1) {
        // === 취소 대기 처리(기본 결제 완료 시) ===
        // 예약 상태, 결제 상태 변경
        await connection.query(sql_cancel_reserv, [
          reservation_state.waitCancelled,
          reservation_payment_state.waitCancelledBasePay,
          reservationId,
        ]);

        // 결제 상태 변경
        await connection.query(sql_cancel_pay, [
          payment_state.waitCancelledPay,
          reservationId,
        ]);
      } else if (opt == 2) {
        // === 취소 완료 처리(기본 결제 미완료 시, 취소 완료 시) ===
        // 예약 상태, 결제 상태 변경
        await connection.query(sql_cancel_reserv, [
          reservation_state.cancelled,
          reservation_payment_state.cancelledBasePay,
          reservationId,
        ]);

        // 결제 상태 변경
        await connection.query(sql_cancel_pay, [
          payment_state.cancelledPay,
          reservationId,
        ]);

        // 배차 정보 제거
        await connection.query(sql_cancel_dispatch, [reservationId]);
      }
    } catch (err) {
      console.error("err : " + err);
      logger.error(__filename + " : " + err);
    } finally {
      connection.release();
    }
  }
};
