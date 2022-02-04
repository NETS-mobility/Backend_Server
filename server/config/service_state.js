// === 서비스 상태 정보 설정 ===
// 상태명 : reservation_state 번호

module.exports = {
    new : 0,                        // 준비 (확정X)
    ready : 1,                      // 준비 (확정O)
    inProgress : 2,                 // 진행중
    complete : 3,                   // 완료
    cancelled : 4                   // 취소
}
