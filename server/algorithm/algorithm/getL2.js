const ToKoreanTime = require("../util/toKoreanTime");
const getCarAdjRev = require("./getCarAdjRev");

const GetL2 = async (prevDepartureTimeArray, pickupTime) => {
  const L2 = [];
  for (let i = 0; i < prevDepartureTimeArray.length; i++) {
    const car_schedule = await getCarAdjRev(prevDepartureTimeArray[i].car_id, pickupTime);
    const sch_prev_time = ToKoreanTime(new Date(car_schedule.prev.time));
    if (
      ToKoreanTime(prevDepartureTimeArray[i].prevDepartureTime) >
      sch_prev_time
    ) {
      L2.push(prevDepartureTimeArray[i]);
    }
  }
  return L2;
};

module.exports = GetL2;
