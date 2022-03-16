//장형준
const testDataArr1 = [
  {
    //rev_id = 1-1
    dire: "집-집",
    pickup_x: 126.831157,
    pickup_y: 37.573392,
    drop_x: 126.831157,
    drop_y: 37.573392,
    hos_x: 126.88626, // 이대목동병원
    hos_y: 37.53896,
    old_hos_arr_time: "12:00:00",
    old_hos_dep_time: "15:00:00",
    rev_date: "2022-03-04",
    gowithHospitalTime: 180,
    service_kind_id: 5,
  },
  {
    //rev_id = 1-2
    dire: "집-병원",
    pickup_x: 126.911092,
    pickup_y: 37.581616,
    drop_x: 0,
    drop_y: 0,
    hos_x: 126.88626,
    hos_y: 37.53896,
    old_hos_arr_time: "10:00:00",
    old_hos_dep_time: "",
    rev_date: "2022-03-04",
    gowithHospitalTime: 0,
    service_kind_id: 4,
  },
  {
    //rev_id = 1-3
    dire: "병원-집",
    pickup_x: 0,
    pickup_y: 0,
    drop_x: 126.911092,
    drop_y: 37.581616,
    hos_x: 126.940612, // 연세세브란스병원
    hos_y: 37.562976,
    old_hos_arr_time: "",
    old_hos_dep_time: "11:00:00",
    rev_date: "2022-03-04",
    gowithHospitalTime: 0,
    service_kind_id: 4,
  },
  {
    //rev_id = 1-4
    dire: "집-집",
    pickup_x: 126.918114,
    pickup_y: 37.593509,
    drop_x: 126.955002,
    drop_y: 37.537367,
    hos_x: 126.940612,
    hos_y: 37.562976,
    old_hos_arr_time: "15:00:00",
    old_hos_dep_time: "15:40:00",
    rev_date: "2022-03-04",
    gowithHospitalTime: 40,
    service_kind_id: 5,
  },
  {
    //rev_id = 1-5
    dire: "집-병원",
    pickup_x: 126.955002,
    pickup_y: 37.537367,
    drop_x: 0,
    drop_y: 0,
    hos_x: 127.08791, // 삼성서울병원
    hos_y: 37.489587,
    old_hos_arr_time: "14:00:00",
    old_hos_dep_time: "",
    rev_date: "2022-03-04",
    gowithHospitalTime: 0,
    service_kind_id: 4,
  },
  {
    //rev_id = 1-6
    dire: "병원-집",
    pickup_x: 0,
    pickup_y: 0,
    drop_x: 126.955002,
    drop_y: 37.537367,
    hos_x: 127.08791,
    hos_y: 37.489587,
    old_hos_arr_time: "",
    old_hos_dep_time: "17:00:00",
    rev_date: "2022-03-04",
    gowithHospitalTime: 0,
    service_kind_id: 4,
  },
];

module.exports = testDataArr1;
