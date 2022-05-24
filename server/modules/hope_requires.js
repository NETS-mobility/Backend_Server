// === 예약 시 입력한 필요한 서비스들 ===
// string to json

module.exports = {
  getHopeRequires: (str) => {
    // 휠체어이동, 진료실동행, 보호자진료내용전달, 보호자진료서류전달, 약국동행, 기타:입력사항
    let opt1 = true, opt2 = false, opt3 = false, opt4 = false, opt5 = false, opt6 = false;
    let pos;

    if (str.indexOf("진료실동행") != -1)
      opt2 = true;
    if (str.indexOf("보호자진료내용전달") != -1)
      opt3 = true;
    if (str.indexOf("보호자진료서류전달") != -1)
      opt4 = true;
    if (str.indexOf("약국동행") != -1)
      opt5 = true;
    if ((pos = str.indexOf("기타:")) != -1){
      opt6 = str.substring(pos + 3);
    }
      
    const hope_requires = {
      "병원 내에서 휠체어로 이동": opt1,
      "진료실 동행": opt2,
      "지정한 보호자에게 진료 내용 전달": opt3,
      "지정한 보호자에게 진료 서류 촬영 전달": opt4,
      "약국 동행": opt5,
      "기타": opt6,
    }
    return hope_requires;
  }
};
