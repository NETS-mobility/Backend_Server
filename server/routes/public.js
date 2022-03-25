const express = require("express");
const router = express.Router();
const fs = require("fs");
const upath = require("../config/upload_path");

// ===== 매니저 프로필 이미지 반환 =====
router.get(upath.manager_picture + ":name", async function (req, res, next) {
  fs.readFile("./public" + upath.manager_picture + req.params.name, function(error, data) {
    res.end(data);
  });
});

// ===== 매니저 전달사항 첨부사진 반환 =====
router.get(upath.manager_introimage + ":name", async function (req, res, next) {
  fs.readFile("./public" + upath.manager_introimage + req.params.name, function(error, data) {
    res.end(data);
  });
});

module.exports = router;
