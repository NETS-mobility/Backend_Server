// import GetDispatchResult from "../algorithm/GetDispatchResult";
// import GetEstimatedTime from "../algorithm/GetEstimatedTime";
// import GetPickupTime from "../algorithm/GetPickupTime";
// import GetPrevArrivalTime from "../algorithm/GetPrevArrivalTime";
// import GetDispatchAvailableCar from "../algorithm/GetDispatchAvailableCar";
// import GetL1 from "../algorithm/getL1";
// import GetL2 from "../algorithm/getL2";

// const Case4 = (testData) => {
//   const {
//     dire,
//     pickup_x,
//     pickup_y,
//     drop_x,
//     drop_y,
//     hos_x,
//     hos_y,
//     pickup_time,
//     old_hos_arr_time,
//     old_hos_dep_time,
//     rev_date,
//     gowithHospitalTime,
//     prev_terminate_time,
//     post_pickup_time,
//     prev_last_x,
//     prev_last_y,
//     post_first_x,
//     post_first_y,
//     service_kind_id,
//   } = testData;

//   let a, b, cArr, d;
//   let L1, L2, L3;
//   let a1, b1, L11, L21, L31, cArr1, a2, b2, L12, cArr2, L22, L32, L4, dispatch;
//   let hos_arr_time = rev_date + "T" + old_hos_arr_time + "+0900";
//   let hos_dep_time = rev_date + "T" + old_hos_dep_time + "+0900";

//   a = await GetEstimatedTime(
//     { lon: pickup_y, lat: pickup_x },
//     { lon: hos_y, lat: hos_x },
//     "집-병원",
//     hos_arr_time,
//     service_kind_id
//   ).then((res) => res);
//   console.log("case4 a==", a);

//   b = GetPickupTime(hos_arr_time, a);
//   console.log("case4 b==", b);

//   L1 = GetL1(a, b);
//   console.log("case4 L1==", L1);

//   cArr = await GetPrevArrivalTime(L1, pickup_x, pickup_y).then((res) => res);
//   console.log("case4 cArr==", cArr);

//   a1 = GetEstimatedTime(
//     { lon: pickup_y, lat: pickup_x },
//     { lon: hos_y, lat: hos_x },
//     hos_arr_time
//   );
//   b1 = GetPickupTime(hos_arr_time, a1);
//   L11 = GetL1(a1, b1);
//   cArr1 = GetPrevArrivalTime(L11, pickup_x, pickup_y);
//   L21 = GetL2(b1, cArr1);
//   L31 = GetDispatchAvailableCar(L21, drop_x, drop_y);

//   a2 = GetEstimatedTime(
//     { lon: pickup_y, lat: pickup_x },
//     { lon: drop_y, lat: drop_x },
//     hos_dep_time
//   );
//   b2 = hos_dep_time;
//   L12 = GetL1(a2, b2);
//   cArr2 = GetPrevArrivalTime(L12, hos_x, hos_y);
//   L22 = GetL2(b2, cArr2);
//   L32 = GetDispatchAvailableCar(L22, drop_x, drop_y);

//   if (L31.length != 0 && L32.length != 0) {
//   }
// };

// export default Case4;
