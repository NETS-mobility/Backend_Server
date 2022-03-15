// === 결제 상태 정보 ===
// 상태명: 결제 단계 번호

module.exports = {
  waitBasePay: 1,                 // 기본 결제 대기
  completeBasePay: 2,             // 기본 결제 완료
  waitExtraPay: 3,                // 추가 결제 대기
  completeAllPay: 4,              // 최종 결제 완료
  cancelledBasePay: 5,            // 기본 결제 취소
  cancelledExtraPay: 6            // 추가 결제 취소
  //2:기본 결제 완료에서 서비스 완료 시->3:추가 결제 대기 or 4:최종 결제 완료(추가 결제 없을 때, 추가 결제 완료 시)
};
