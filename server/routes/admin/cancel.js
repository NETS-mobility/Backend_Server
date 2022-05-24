const express = require("express");
const router = express.Router();

const jwt = require("../../modules/jwt");
const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");
const token_checker = require("../../modules/admin_token");
const cancel_reservation = require("../../modules/cancel_reservation");
const cancel_pay = require("../../modules/cancel_pay");
const cancel_amount = require("../../modules/cancel_amount");

const reservation_state = require("../../config/reservation_state");
const logger = require("../../config/logger");

// ===== 예약 취소 =====
router.post("/reserve", async function (req, res, next) {
  const reservationId = req.body.reservationId;
  const reason = req.body.reason;

  const refundHolder = req.body.refundHolder;
  const refundBank = req.body.refundBank;
  const refundAccount = req.body.refundAccount;

  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    // 예약 상태 확인
    const sql_pay_info = `SELECT reservation_state_id FROM reservation WHERE reservation_id=?;`;
    // 취소 가능 금액, 취소 사유 저장
    const sql_cancel = `UPDATE base_payment SET cancel_amount=?, cancel_reason=?
                        WHERE reservation_id=?;`;
    // 취소 가능 금액, 취소 사유, 환불 수령계좌 저장
    const sql_cancel_refund = `UPDATE base_payment SET cancel_amount=?, cancel_reason=?,
                               refund_account=?, refund_bank=?, refund_holder=?
                               WHERE reservation_id=?;`;
    
    // 예약 상태 확인
    const result_pay_info = await connection.query(sql_pay_info, [reservationId]);
    const sql_data_pay_info = result_pay_info[0];

    if (sql_data_pay_info.length == 0)
      return res.status(400).send({ msg: "해당하는 예약이 존재하지 않음" });

    // 예약 상태에 따른 처리
    const reservationStateId = sql_data_pay_info[0].reservation_state_id;
    if (reservationStateId == reservation_state.inProgress || reservationStateId == reservation_state.complete) { // 서비스 진행 중, 서비스 완료
      return res.status(400).send({ msg: "예약 취소 진행할 수 없는 단계임" });
    } else if (reservationStateId == reservation_state.waitCancelled) { // 예약 취소 대기
      return res.status(400).send({ msg: "이미 예약 취소 대기 단계임" });
    } else if (reservationStateId == reservation_state.cancelled) { // 예약 취소 완료
      return res.status(400).send({ msg: "이미 예약 취소 완료함" });
    } else if (reservationStateId == reservation_state.new) { // 결제 대기(기본 결제 미완료 시)
      await cancel_reservation.cancelReservation(reservationId, 2); // 예약 취소 완료

      // 취소 가능 금액, 취소 사유 저장
      const result_cancel = await connection.query(sql_cancel, [
        0,
        reason,
        reservationId,
      ]);

      return res.status(200).send({
        success: true,
        msg: "예약 취소 완료-결제 금액 없음",
      });
    } else if (reservationStateId == reservation_state.ready) { // 결제 완료(기본 결제 완료 시)
      const cancelAmount = await cancel_amount.calCancelAmount(reservationId); // 취소 가능 금액 계산

      // 취소 가능 금액에 따른 처리
      if (cancelAmount == 0) { // 환불 불필요
        await cancel_reservation.cancelReservation(reservationId, 2);  // 예약 취소 완료

        // 취소 가능 금액, 취소 사유 저장
        const result_cancel = await connection.query(sql_cancel, [
          0,
          reason,
          reservationId,
        ]);

        return res.status(200).send({
          success: true,
          msg: "예약 취소 완료-환불 금액 없음",
        });
      } else { // 환불 필요
        await cancel_reservation.cancelReservation(reservationId, 1); // 예약 취소 대기

        // 취소 가능 금액, 취소 사유, 환불 수령계좌 저장
        const result_cancel_refund = await connection.query(sql_cancel_refund, [
          cancelAmount,
          reason,
          refundAccount,
          refundBank,
          refundHolder,
          reservationId,
        ]);

        // 결제수단 확인
        const sql_pay_method = `SELECT payment_method FROM base_payment WHERE reservation_id=?;`;
        const result_pay_method = await connection.query(sql_pay_method, [reservationId]);
        const sql_data_pay_method = result_pay_method[0];

        const payMethod = sql_data_pay_method[0].payment_method;

        if (payMethod == 'card') // 카드 결제만 아임포트 환불 진행
          await cancel_pay.cancelPay(reservationId, reason, cancelAmount, refundHolder, refundBank, refundAccount); // 결제 취소

        return res.status(200).send({
          success: true,
          msg: "예약 취소 대기-환불 금액 있음",
          cancelAmount: cancelAmount,
        });
      }
    }
  } catch (err) {
    console.error("err : " + err);
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

module.exports = router;
