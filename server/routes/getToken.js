const express = require("express");
const router = express.Router();
const multer = require("multer");

const jwt = require("../modules/jwt");

router.post("/", async function (req, res, next) {
  const { id, name } = req.body;
  const token = await jwt.sign({ id: id, name: name });
  res.send(token);
});
module.exports = router;
