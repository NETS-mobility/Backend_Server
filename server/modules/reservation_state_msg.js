// === 필수서류 제출확인 ===
const jwt = require('./jwt');
const pool2 = require('./mysql2');
const rev_state = require("../config/reservation_state");

module.exports = function (state, isNeedExtraPay) {
    let msg = "";
    switch(state)
    {
        case rev_state.new: msg = "결제 대기"; break;
        case rev_state.ready: msg = "예약 확정"; break;
        case rev_state.inProgress: msg = "서비스 진행 중"; break;
        case rev_state.complete: msg = (isNeedExtraPay) ? "추가 결제 대기" : "서비스 종료"; break;
        case rev_state.cancelled: msg = "서비스 취소"; break;
    }
    return msg;
};
