// === 요금 상세 조회 결제 상태 정보 ===
// 상태명: 결제 단계 번호
// 1=결제 대기, 2=무통장입금 승인 대기, 3=결제 완료, 4=취소 대기, 5=취소 완료

module.exports = {
  waitPay: 1, // 결제 대기
  waitDepositPay: 2, // 결제 승인 대기(무통장 입금)
  completePay: 3, // 결제 완료
  waitCancelledPay: 4, // 결제 취소 대기
  cancelledPay: 5, //결제 취소 완료
};
