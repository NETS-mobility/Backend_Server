const express = require("express");
const router = express.Router();
const Algo = require("../../algorithm/algo");
const service_kind = require("../../config/service_kind");

// ===== 메인 알고리즘 실행 =====
router.post("", async function (req, res, next) {
  const revData = req.body.revData;
  const result = await Algo(revData);

  let msg;
  if(((result.case == 3 || result.case == 4) && (result.dispatch1 === undefined && result.dispatch2 === undefined)) || 
    ((result.case == 1 || result.case == 2) && (result.dispatch1 === undefined)))
  {
    msg = "매칭된 차량이 없습니다.";
  }

  const dire = (revData.dire == "집-병원") ? 1 : ((revData.dire == "병원-집") ? 2 : 3);
  const isOverPoint = (revData.gowithHospitalTime >= 120) ? 1 : 0;
  let service_kind_name = "";
  switch(revData.service_kind_id)
  {
    case service_kind.move: service_kind_name = "네츠 무브"; break;
    case service_kind.wheelS: 
    case service_kind.wheelD: service_kind_name = "네츠 휠체어"; break;
    case service_kind.wheelplusS: 
    case service_kind.wheelplusD: service_kind_name = "네츠 휠체어 플러스"; break;
  }
  let pickup_time = "";
  if(result.dispatch1 !== undefined)
    pickup_time = result.dispatch1.expCarPickupTime.substr(11, 9);

  const service = {
    service_type: service_kind_name,
    rev_date: revData.rev_date,
    pickup_address: revData.pickup,
    hos_address: revData.hos,
    drop_address: revData.drop,
    move_direction_id: dire,
    gowith_hospital_time: revData.gowithHospitalTime,
    dispatch_case: result.case,
    isOverPoint: isOverPoint,
    pickup_time: pickup_time,
    hos_arrival_time: revData.old_hos_arr_time,
    hos_depart_time: revData.old_hos_dep_time,
  }

  res.status(200).send({ dispatch: [result.dispatch1, result.dispatch2], service: service, msg: msg });
});

module.exports = router;
