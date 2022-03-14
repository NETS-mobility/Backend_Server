//프론트 초기 테스트케이스
const testData1 = {
  dire: "집-병원",
  pickup_x: 127.078202,
  pickup_y: 37.618934,
  drop_x: 0,
  drop_y: 0,
  hos_x: 127.034464,
  hos_y: 37.5068891,
  old_hos_arr_time: "15:00:00",
  old_hos_dep_time: "",
  rev_date: "2022-03-04",
  gowithHospitalTime: 30,
  service_kind_id: 4,
};
const testData2 = {
  dire: "병원-집",
  pickup_x: 0,
  pickup_y: 0,
  drop_x: 127.078202,
  drop_y: 37.618934,
  hos_x: 127.034464,
  hos_y: 37.5068891,
  old_hos_arr_time: "",
  old_hos_dep_time: "14:00:00",
  rev_date: "2022-03-04",
  gowithHospitalTime: 30,
  service_kind_id: 4,
};
const testData3 = {
  dire: "집-집",
  pickup_x: 127.078202,
  pickup_y: 37.618934,
  drop_x: 127.078202,
  drop_y: 37.618934,
  hos_x: 127.034464,
  hos_y: 37.5068891,
  old_hos_arr_time: "15:00:00",
  old_hos_dep_time: "15:50:00",
  rev_date: "2022-03-04",
  gowithHospitalTime: 50,
  service_kind_id: 5,
};
const testData4 = {
  dire: "집-집", //방향 ex)"집-병원", "병원-집", "집-집"
  pickup_x: 127.078202, //픽업장소 x좌표
  pickup_y: 37.618934, //픽업장소 y좌표
  drop_x: 127.078202, //드롭장소 x좌표
  drop_y: 37.618934, //드롭장소 y좌표
  hos_x: 127.034464, //병원 x좌표
  hos_y: 37.5068891, //병원 y좌표
  old_hos_arr_time: "15:00:00", //희망 병원 도착시간
  old_hos_dep_time: "17:30:00", //희망 병원 출발시간
  rev_date: "2022-03-04", //희망 예약날짜
  gowithHospitalTime: 150, //총 병원 동행 시간
  service_kind_id: 5, //서비스 종류 1: 네츠무브 2: 네츠휠체어편도 3: 네츠휠체어왕복 4:네츠휠체어플러스편도 5:네츠휠체어플러스왕복
};

module.exports = { testData1, testData2, testData3, testData4 };
