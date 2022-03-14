const GetDispatchResult = require("../algorithm/getDispatchResult");
const GetEstimatedTime = require("../algorithm/getEstimatedTime");
const GetPickupTime = require("../algorithm/getPickupTime");
const GetPrevDepartureTime = require("../algorithm/getPrevDepartureTime");
const GetDispatchAvailableCar = require("../algorithm/getDispatchAvailableCar");
const GetL1 = require("../algorithm/getL1");
const GetL2 = require("../algorithm/getL2");
const AddMinuteToDate = require("../util/addMinuteToDate");
const ToKoreanTime = require("../util/toKoreanTime");

const Case1 = async (testData, isCase1) => {
  const {
    dire,
    pickup_x,
    pickup_y,
    hos_x,
    hos_y,
    old_hos_arr_time,
    gowithHospitalTime,
    rev_date,
    service_kind_id,
  } = testData;

  let pickupTime, prevDepartureTimeArray;
  let L1, L2, L3;
  let hos_arr_time = rev_date + "T" + old_hos_arr_time + "+0900"; //00-00-00T00:00:00+0900
  let gowithTime = 0;
  if (isCase1) {
    gowithTime = gowithHospitalTime;
  }

  let estimatedData = await GetEstimatedTime(
    { lon: pickup_y, lat: pickup_x },
    { lon: hos_y, lat: hos_x },
    dire,
    hos_arr_time, //00-00-00T00:00:00+0900
    service_kind_id
  ).then((res) => res);

  let estimatedTime = estimatedData.time; //밀리
  let estimatedDist = estimatedData.dist;

  pickupTime = GetPickupTime(hos_arr_time, estimatedTime); //pickupTime = 00-00-00T00:00:00+0900

  L1 = await GetL1(estimatedTime, pickupTime, rev_date); //백엔드에서 test 필요

  prevDepartureTimeArray = await GetPrevDepartureTime(
    L1,
    pickup_x,
    pickup_y,
    ToKoreanTime(new Date(pickupTime))
  ).then((res) => res);

  L2 = await GetL2(prevDepartureTimeArray, pickupTime);

  L3 = await GetDispatchAvailableCar(
    L2,
    hos_x,
    hos_y,
    AddMinuteToDate(new Date(hos_arr_time), gowithTime)
  ).then((res) => res);

  const ResultData = {
    dispatch: GetDispatchResult(L3),
    expect_pickup_time: pickupTime, //pickupTime
    expect_terminate_service_time: ToKoreanTime(
      AddMinuteToDate(new Date(hos_arr_time), gowithTime)
    ),
    expect_move_distance: estimatedDist / 1000, //GetEstimatedTime돌렸을 때 나온 총 거리
    expect_move_time: estimatedTime / 60000, //estimatedTime
  };

  if (ResultData.dispatch == -1) {
    return -1;
  } else {
    return ResultData;
  } //최종 배차된 차의 car_id
};

module.exports = Case1;
