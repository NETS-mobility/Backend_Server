// === 예약 상태 정보 ===
// 상태명 : reservation_state 번호

module.exports = {
  new: 0,                        // 준비 - 예약 요청(결제 대기)
  ready: 1,                      // 준비 - 예약 확정(결제 완료)
  inProgress: 2,                 // 서비스 진행 중
  complete: 3,                   // 서비스 완료
  cancelled: 4                   // 예약 취소
}
