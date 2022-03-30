const TmapTimeMachine = require("./tmapTimeMachine");
const getCarAdjRev = require("./getCarAdjRev");
const AddMinuteToDate = require("../util/addMinuteToDate");
const logger = require("../../config/logger");

const GetPrevDepartureTime = async (L1, res_x, res_y, pickupTime) => {
  const prevDepartureTimeArray = [];
  try {
    for (let i = 0; i < L1.length; i++) {
      const car_schedule = await getCarAdjRev(L1[i].car_id, pickupTime);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await TmapTimeMachine(
        car_schedule.prev.y,
        car_schedule.prev.x,
        res_y,
        res_x,
        "departure",
        pickupTime
      ).then((tmapTime) => {
        const resDate = new Date(pickupTime);
        const ctime = AddMinuteToDate(
          resDate,
          -tmapTime.estimatedTime
        ).toString();
        prevDepartureTimeArray.push({
          car_id: L1[i].car_id,
          prevDepartureTime: new Date(ctime),
        });
      });
    }
  } catch (err) {
    logger.error(__filename + " : " + err);
    return err;
  }
  return prevDepartureTimeArray;
};

module.exports = GetPrevDepartureTime;
