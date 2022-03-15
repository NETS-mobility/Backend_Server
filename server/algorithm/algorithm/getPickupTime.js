const ToKoreanTime = require("../util/toKoreanTime");
const AddMinuteToDate = require("../util/addMinuteToDate");
const GetPickupTime = (hosTime, a) => {
  const resDate = new Date(hosTime); //resDate = Fri 35 march~~~
  const b = AddMinuteToDate(resDate, -a / 60000); //b = Fri 35 march~~

  return ToKoreanTime(b); //ToKoreanTime(b) = 00-00-00T00:00:00+0900
};

module.exports = GetPickupTime;
