const express = require("express");
const router = express.Router();
const Algo = require("../../algorithm/algo");

// ===== 메인 알고리즘 실행 =====
router.post("", async function (req, res, next) {
  const revData = req.body.revData;
  res.status(200).send(await Algo(revData));
});

module.exports = router;
