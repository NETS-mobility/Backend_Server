// === date<->string 변환기 ===
// 서버 로컬타임존 상관없이 GMT+0900 (대한민국 표준시) 반환

module.exports = function (date) {
  const str = date.toISOString(date.setHours(date.getHours()+9));
  return str.substr(0, 10) + " " + str.substr(11, 8);
};
