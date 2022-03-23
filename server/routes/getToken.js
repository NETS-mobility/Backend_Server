const express = require("express");
const router = express.Router();
const multer = require("multer");

const jwt = require("../modules/jwt");

router.post("/", async function (req, res, next) {
  const token = await jwt.sign({ id: "YFRR5435@naver.com", name: "BSP" });
  res.send(token);
});
module.exports = router;
