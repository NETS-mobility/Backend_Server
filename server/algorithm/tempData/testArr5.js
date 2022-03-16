// 이지홍
const testDataArr5 = [
  {
    dire: "집-집",
    pickup_x: 127.07945700776442,
    pickup_y: 37.65149928791175,
    drop_x: 127.07945700776442,
    drop_y: 37.65149928791175,
    hos_x: 127.06967545604981, //(을지대병원)
    hos_y: 37.63631680493571,
    old_hos_arr_time: "10:00:00",
    old_hos_dep_time: "13:00:00",
    rev_date: "2022-03-04",
    gowithHospitalTime: 180, // (2시간 이상)
    service_kind_id: 5, // (왕복)
  },
  {
    dire: "집-병원",
    pickup_x: 127.0035101767883,
    pickup_y: 37.61792605816295,
    drop_x: 0.0,
    drop_y: 0.0,
    hos_x: 127.0266405160305,
    hos_y: 37.58683686821452,
    old_hos_arr_time: "15:00:00",
    old_hos_dep_time: "",
    rev_date: "2022-03-04",
    gowithHospitalTime: 60, // 30분 초과, 2시간 이하
    service_kind_id: 4, // 편도
  },
  {
    dire: "병원-집",
    pickup_x: 0,
    pickup_y: 0,
    drop_x: 127.01842944852979,
    drop_y: 37.579822718634304,
    hos_x: 127.02657977835241,
    hos_y: 37.58702063840712,
    old_hos_arr_time: "",
    old_hos_dep_time: "17:30:00",
    rev_date: "2022-03-04",
    gowithHospitalTime: 0,
    service_kind_id: 4,
  },
  {
    dire: "집-집",
    pickup_x: 127.02798406673098,
    pickup_y: 37.5553662212847,
    drop_x: 127.07335404833685, //(드롭장소 다름)
    drop_y: 37.56915926068046,
    hos_x: 127.02657977835241,
    hos_y: 37.58702063840712,
    old_hos_arr_time: "13:00:00",
    old_hos_dep_time: "14:30:00",
    rev_date: "2022-03-04",
    gowithHospitalTime: 90, // 1시간 초과, 2시간 이하
    service_kind_id: 5, //5:네츠휠체어플러스왕복
  },
  {
    dire: "병원-집",
    pickup_x: 0,
    pickup_y: 0,
    drop_x: 127.01097129220655,
    drop_y: 37.51468978322294,
    hos_x: 127.02657977835241,
    hos_y: 37.58702063840712,
    old_hos_arr_time: "",
    old_hos_dep_time: "10:30:00",
    rev_date: "2022-03-04",
    gowithHospitalTime: 0,
    service_kind_id: 4,
  },
  {
    dire: "병원-집",
    pickup_x: 0,
    pickup_y: 0,
    drop_x: 126.96983389133405,
    drop_y: 37.47986380796353,
    hos_x: 127.00463417442158,
    hos_y: 37.501624756074456,
    old_hos_arr_time: "",
    old_hos_dep_time: "17:40:00",
    rev_date: "2022-03-04",
    gowithHospitalTime: 30, // 30분(기본)
    service_kind_id: 4, // 편도 플러스
  },
];
module.exports = testDataArr5;
