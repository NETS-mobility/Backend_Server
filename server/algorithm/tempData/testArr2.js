//강윤서
const testDataArr2 = [
  {
    //rev_id = 2-1
    dire: "집-집",
    pickup_x: 126.875404, // 경기 광명시
    pickup_y: 37.471648,
    drop_x: 126.875404, // 경기 광명시
    drop_y: 37.471648,
    hos_x: 126.92435, // 서울특별시보라매병원(서울 동작구)
    hos_y: 37.493277,
    old_hos_arr_time: "10:20:00",
    old_hos_dep_time: "12:40:00",
    rev_date: "2022-03-04",
    gowithHospitalTime: 140, // 2시간 초과
    service_kind_id: 5,
  },
  {
    //rev_id = 2-2
    dire: "집-병원",
    pickup_x: 126.740727, // 인천 계양구
    pickup_y: 37.5268,
    drop_x: 0,
    drop_y: 0,
    hos_x: 126.988788, // 인제대학교 서울백병원(서울 중구)
    hos_y: 37.564963,
    old_hos_arr_time: "14:20:00",
    old_hos_dep_time: "",
    rev_date: "2022-03-04",
    gowithHospitalTime: 30, // 2시간 이하(기본)
    service_kind_id: 4,
  },
  {
    //rev_id = 2-3
    dire: "병원-집",
    pickup_x: 0,
    pickup_y: 0,
    drop_x: 126.921322, // 서울 서대문구
    drop_y: 37.567074,
    hos_x: 126.940348, // 세브란스병원(서울 서대문구)
    hos_y: 37.562325,
    old_hos_arr_time: "",
    old_hos_dep_time: "11:40:00",
    rev_date: "2022-03-04",
    gowithHospitalTime: 0,
    service_kind_id: 4,
  },
  {
    //rev_id = 2-4
    dire: "집-집",
    pickup_x: 127.12922, // 서울 송파구
    pickup_y: 37.510276,
    drop_x: 127.134581, // 서울 송파구
    drop_y: 37.504999,
    hos_x: 127.102528, // 잠실수가정의학과의원(서울 송파구)
    hos_y: 37.514609,
    old_hos_arr_time: "13:40:00",
    old_hos_dep_time: "14:20:00",
    rev_date: "2022-03-04",
    gowithHospitalTime: 40, // 2시간 이하
    service_kind_id: 5,
  },
  {
    //rev_id = 2-5
    dire: "집-병원",
    pickup_x: 127.045921, // 서울 동대문구
    pickup_y: 37.574907,
    drop_x: 0,
    drop_y: 0,
    hos_x: 127.141218, // 무지개연합의원(경기 구리시)
    hos_y: 37.612598,
    old_hos_arr_time: "14:40:00",
    old_hos_dep_time: "",
    rev_date: "2022-03-04",
    gowithHospitalTime: 60, // 2시간 이하
    service_kind_id: 4,
  },
  {
    //rev_id = 2-6
    dire: "병원-집",
    pickup_x: 0,
    pickup_y: 0,
    drop_x: 127.002565, // 서울 서초구
    drop_y: 37.477085,
    hos_x: 126.965514, // 평촌부부한의원(경기 안양시)
    hos_y: 37.396288,
    old_hos_arr_time: "",
    old_hos_dep_time: "17:20:00",
    rev_date: "2022-03-04",
    gowithHospitalTime: 130, // 2시간 초과
    service_kind_id: 4,
  },
];

module.exports = testDataArr2;
