// === 날짜 format화 ===
// num이 1이면 날짜,시간 반환 YYYY-MM-DD HH:MM:SS
// num이 2이면 날짜 반환 YYYY-MM-DD
// num이 3이면 시간 반환 HH:MM:SS

module.exports = {
  getFormatDate: (date, num) => {
    // 년
    let year = date.getFullYear();

    // 월
    let month = (1 + date.getMonth());
    month = month >= 10 ? month : '0' + month;

    // 일
    let day = date.getDate();
    day = day >= 10 ? day : '0' + day;

    // 시
    let hours = date.getHours();
    hours = hours >= 10 ? hours : '0' + hours;

    // 분
    let minutes = date.getMinutes();
    minutes = minutes >= 10 ? minutes : '0' + minutes;

    // 초
    let seconds = date.getSeconds();
    seconds = seconds >= 10 ? seconds : '0' + seconds;

    // 반환
    if (num == 1) // 날짜,시간 반환
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    else if (num == 2) // 날짜 반환
      return `${year}-${month}-${day}`;
    else if (num == 3) // 시간 반환
      return `${hours}:${minutes}:${seconds}`;
  }
};
