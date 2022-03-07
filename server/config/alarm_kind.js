// === 알림 정보
// 종류명: 알림 종류 번호

module.exports = {
  // = 관리자, 고객용 알림 =
  request_payment: 1, // 결제 요청
  press_payment: 2, // 결제 독촉
  cancellation: 3, // 취소 안내
  confirm_reservation: 4, // 예약 확정
  visit: 5, // 방문 예정
  delay: 6, // 지연 예상
  delay_over_20min: 7, // 20분 이상 지연
  report_progress: 8, // 동행 상황 보고
  report_end: 9, // 동행 상황 보고(동행 완료)
  extra_payment: 10, // 병원동행 추가요금 결제
  waiting_payment: 11, // 대기요금 결제

  // = 매니저용 알림 =
  m_confirm_reservation: 12, // 예약 확정
  m_prev_notice: 13, // 하루 전 알림
};
