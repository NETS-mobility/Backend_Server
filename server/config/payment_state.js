// === 결제 상태 정보 (reservation_payment_state)
// 상태명: 결제 단계 번호

module.exports = {
  waiting_base_payment: 1,
  complete_base_payment: 2,
  waiting_additional_payment: 3,
  complete_payment: 4,
};
