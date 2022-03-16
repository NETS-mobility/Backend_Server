const TmapTimeMachine = require("./tmapTimeMachine");
const ToKoreanTime = require("../util/toKoreanTime");
const getCarAdjRev = require("./getCarAdjRev");
const AddMinuteToDate = require("../util/addMinuteToDate");

const GetDispatchAvailableCar = async (L2, drop_x, drop_y, hos_time) => {
  const L3 = [];
  let new_hos_time = new Date(hos_time);

  for (let i = 0; i < L2.length; i++) {
    const nextRes = await getCarAdjRev(L2[i].car_id, new_hos_time);
    // const nextRes = getCarAdjRev(i);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await TmapTimeMachine(
      drop_y,
      drop_x,
      nextRes.next.y,
      nextRes.next.x,
      "departure",
      nextRes.next.time
    ).then((tmapTime) => {
      const resDate = new Date(nextRes.next.time);
      const d = AddMinuteToDate(resDate, -tmapTime.estimatedTime);

      if (ToKoreanTime(AddMinuteToDate(new_hos_time, 0)) < ToKoreanTime(d)) {
        L3.push({
          car_id: L2[i].car_id,
          prevDepartureTime: L2[i].prevDepartureTime,
        });
      }
    });
  }
  return L3;
};

module.exports = GetDispatchAvailableCar;
