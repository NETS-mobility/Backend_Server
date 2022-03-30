// === 배차 case 변환기 ===
// direction = reservation.move_direction_id (이동 방향(1=집-병원, 2=병원-집, 3=집-집))
// hosTime = reservation.gowith_hospital_time (2시간 이상으로 구분)

module.exports = function (direction, hosTime) {
  if(direction == 1) return 1;
  else if(direction == 2) return 2;
  else return (hosTime >= 120) ? 4 : 3;
};
