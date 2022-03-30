// === 동행기준 판별기 ===
// hosTime = reservation.gowith_hospital_time (2시간 이상으로 구분)

module.exports = function (hosTime) {
  return (hosTime >= 120) ? 1 : 0;
};
