// === 결제 상태 정보 ===
// 상태명: 결제 단계 번호

module.exports = {
  waitBasePay: 1, // 기본 결제 대기
  waitBaseDepositPay: 2, // 기본 결제 대기(무통장 입금)
  completeBasePay: 3, // 기본 결제 완료
  waitExtraPay: 4, // 추가 결제 대기
  waitExtraDepositPay: 5, // 추가 결제 대기(무통장 입금)
  completeAllPay: 6, // 최종 결제 완료
  waitCancelledBasePay: 7, // 기본 결제 취소 대기
  cancelledBasePay: 8, // 기본 결제 취소 완료
  waitCancelledExtraPay: 9, // 추가 결제 대기
  cancelledExtraPay: 10, // 추가 결제 취소 완료
  //3:기본 결제 완료에서 서비스 완료 시->4:추가 결제 대기 or 6:최종 결제 완료(추가 결제 없을 때, 추가 결제 완료 시)
};
