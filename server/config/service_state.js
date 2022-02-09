// === 서비스 상태 정보 ===
// 상태명 : service_state 번호 (동행 과정)

module.exports = {
    ready : 0,                      // 픽업 이전
    pickup : 1,                     // 픽업 완료
    arrivalHos : 2,                 // 병원 도착 완료
    carReady : 3,                   // 귀가차량 병원도착 완료
    goHome : 4,                     // 귀가 출발 시작
    complete : 5,                   // 귀가 완료 및 서비스 종료
}
