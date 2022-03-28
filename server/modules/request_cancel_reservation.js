// 예약취소 요청을 입력할때 사용하는 모듈(환불처리는 해당 라우터에서 진행)
/*
  실행 전 상태 -> 실행 후 상태

  결제된 예약 -> 예약 취소 대기
  결제 전 예약 -> 예약 취소
  예약 취소대기 예약 -> 예약 취소
*/
const mysql = require("mysql");
const pool2 = require("./mysql2");

const conn = require("../config/database");
const reservation_state_id = require("../config/reservation_state");
const payment_state_id = require("../config/payment_state");

/*
  결제 테이블 관련 내용 변경
     - 결제 내역이 있을 경우 
       -- 결제 상태 변경
    - 결제 내역이 없을 경우 
       -- 예약 테이블 상태 변경
       -- 배차 테이블 예약 내용 삭제
*/
async function request_cancel_reservation(reservation_id) {
  const connection = await pool2.getConnection(async (conn) => conn);
  const sql_consider =
    "select `reservation_payment_state_id` as state from `reservation` where `reservation_id`=?";

  const sql_consider_res = await connection.query(sql_consider, [
    reservation_id,
  ]);
  let res = Object.values(sql_consider_res[0]);

  const sql_cancel_reserv =
    "update `reservation` set `reservation_state_id`=?, `reservation_payment_state_id`=? where reservation_id=?;"; // 예약 테이블에서 예약 상태, 결제 상태 변경
  const sql_cancel_dispath =
    "delete from `car_dispatch` where `reservation_id`=?;"; // 배차 테이블에서 예약 정보 제거
  const sql_cancel_pay =
    "update `base_payment` set `payment_state_id`=? where reservation_id=?;"; // 결제 테이블에서 결제 상태 변경

  if (
    res[0].state == payment_state_id.completePay ||
    res[0].state == payment_state_id.waitDepositPay
  ) {
    // 환불 대기
    await connection.query(sql_cancel_pay, [
      payment_state_id.waitCancelledPay,
      reservation_id,
    ]);
    await connection.query(sql_cancel_reserv, [
      reservation_state_id.waitCancelled,
      payment_state_id.waitCancelledPay,
      reservation_id,
    ]);
  } else {
    await connection.query(sql_cancel_pay, [
      payment_state_id.cancelledPay,
      reservation_id,
    ]);
    await connection.query(sql_cancel_dispath, [reservation_id]);
    await connection.query(sql_cancel_reserv, [
      reservation_state_id.cancelled,
      payment_state_id.cancelledPay,
      reservation_id,
    ]);
  }
}
module.exports.cancel_reserv = request_cancel_reservation;
