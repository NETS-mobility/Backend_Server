const express = require("express");
const router = express.Router();
const Algo = require("../../algorithm/algo");

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

  res.status(200).send({ dispatch1: result.dispatch1, dispatch2: result.dispatch2, msg: msg });
});

module.exports = router;
