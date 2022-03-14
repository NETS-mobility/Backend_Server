const GetDispatchResult = require("../algorithm/getDispatchResult");
const GetEstimatedTime = require("../algorithm/getEstimatedTime");
const GetPrevDepartureTime = require("../algorithm/getPrevDepartureTime");
const GetDispatchAvailableCar = require("../algorithm/getDispatchAvailableCar");
const GetL1 = require("../algorithm/getL1");
const GetL2 = require("../algorithm/getL2");
const ToKoreanTime = require("../util/toKoreanTime");
const AddMinuteToDate = require("../util/addMinuteToDate");

const Case2 = async (testData, isCase2) => {
  const {
    dire,
    drop_x,
    drop_y,
    hos_x,
    hos_y,
    old_hos_dep_time,
    gowithHospitalTime,
    rev_date,
    service_kind_id,
  } = testData;

  let pickupTime, prevDepartureTimeArray;
  let L1, L2, L3;

  let hos_dep_time = rev_date + "T" + old_hos_dep_time + "+0900";
  let gowithTime = 0;
  if (isCase2) {
    gowithTime = gowithHospitalTime;
  }

  let estimatedData = await GetEstimatedTime(
    { lon: hos_y, lat: hos_x },
    { lon: drop_y, lat: drop_x },
    dire,
    hos_dep_time,
    service_kind_id
  ).then((res) => res);
  let estimatedTime = estimatedData.time;
  let estimatedDist = estimatedData.dist;

  pickupTime = ToKoreanTime(
    AddMinuteToDate(new Date(hos_dep_time), -gowithTime)
  );

  L1 = await GetL1(estimatedTime, pickupTime, rev_date);

  prevDepartureTimeArray = await GetPrevDepartureTime(
    L1,
    hos_x,
    hos_y,
    ToKoreanTime(new Date(pickupTime))
  ).then((res) => res);

  L2 = await GetL2(prevDepartureTimeArray, pickupTime);

  L3 = await GetDispatchAvailableCar(
    L2,
    drop_x,
    drop_y,
    AddMinuteToDate(new Date(hos_dep_time), estimatedTime / 60000)
  ).then((res) => res);

  const ResultData = {
    dispatch: GetDispatchResult(L3),
    expect_pickup_time: pickupTime,
    expect_terminate_service_time: ToKoreanTime(
      AddMinuteToDate(new Date(hos_dep_time), estimatedTime / 60000)
    ),
    expect_move_distance: estimatedDist / 1000,
    expect_move_time: estimatedTime / 60000,
  };

  if (ResultData.dispatch == -1) {
    return -1;
  } else {
    return ResultData; //최종 배차된 차의 car_id
  }
};

module.exports = Case2;
