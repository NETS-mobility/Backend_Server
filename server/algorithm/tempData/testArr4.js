//최지우

const testDataArr4 = [
  {
    //rev_id = 4-1
    dire: "집-집",
    pickup_x: 127.02724164043836, // 서울 성북구
    pickup_y: 37.612667746097635,
    drop_x: 127.02724164043836, // 서울 성북구
    drop_y: 37.612667746097635,
    hos_x: 127.10912878461559, // 서울아산병원(서울 송파구)
    hos_y: 37.52764581761841,
    old_hos_arr_time: "09:00:00",
    old_hos_dep_time: "12:20:00",
    rev_date: "2022-03-04",
    gowithHospitalTime: 200, // 2시간 초과
    service_kind_id: 5,
  },
  {
    //rev_id = 4-2
    dire: "집-집",
    pickup_x: 127.02724164043836, // 서울 성북구
    pickup_y: 37.612667746097635,
    drop_x: 127.02724164043836, // 서울 성북구
    drop_y: 37.612667746097635,
    hos_x: 126.88645385577995, // 이대목동병원(서울 양천구)
    hos_y: 37.53660908489781,
    old_hos_arr_time: "10:00:00",
    old_hos_dep_time: "11:00:00",
    rev_date: "2022-03-04",
    gowithHospitalTime: 60, // 2시간 이하
    service_kind_id: 5,
  },
  {
    //rev_id = 4-3
    dire: "병원-집",
    pickup_x: 0,
    pickup_y: 0,
    drop_x: 126.90314484252985, // 서울 마포구
    drop_y: 37.55518015322536,
    hos_x: 126.99872716899263, // 서울대학교병원(서울 종로구)
    hos_y: 37.58188917344577,
    old_hos_arr_time: "",
    old_hos_dep_time: "15:40:00",
    rev_date: "2022-03-04",
    gowithHospitalTime: 0, // 병원동행 없음
    service_kind_id: 4,
  },
  {
    //rev_id = 4-4
    dire: "집-병원",
    pickup_x: 127.2241536387928, // 경기 하남시
    pickup_y: 37.547138852850175,
    drop_x: 0,
    drop_y: 0,
    hos_x: 127.04596381512653, // 연세대학교강남세브란스병원(서울 강남구)
    hos_y: 37.496389873323274,
    old_hos_arr_time: "12:00:00",
    old_hos_dep_time: "",
    rev_date: "2022-03-04",
    gowithHospitalTime: 0, // 병원동행없음
    service_kind_id: 4,
  },
  {
    //rev_id = 4-5
    dire: "집-병원",
    pickup_x: 127.03040435367795, // 서울 강남구
    pickup_y: 37.49897739851267,
    drop_x: 0,
    drop_y: 0,
    hos_x: 127.12378814174657, // 분당서울대학교병원(경기 성남시)
    hos_y: 37.356932642180276,
    old_hos_arr_time: "17:00:00",
    old_hos_dep_time: "",
    rev_date: "2022-03-04",
    gowithHospitalTime: 20, // 병원동행 20분
    service_kind_id: 4,
  },
  {
    //rev_id = 4-6
    dire: "집-병원",
    pickup_x: 126.91071171560142, // 서울 은평구
    pickup_y: 37.60423270301038,
    drop_x: 0,
    drop_y: 0,
    hos_x: 126.83045342934018, // 명지병원(경기 고양시)
    hos_y: 37.64653388815453,
    old_hos_arr_time: "10:00:00",
    old_hos_dep_time: "",
    rev_date: "2022-03-04",
    gowithHospitalTime: 50, // 병원동행 50분
    service_kind_id: 4,
  },
];

module.exports = testDataArr4;
