const express = require("express");
const router = express.Router();
const fs = require("fs");
const upath = require("../config/upload_path");

// ===== 매니저 프로필 이미지 =====
router.get(upath.manager_picture + ":name", async function (req, res, next) {
  fs.readFile("./public" + upath.manager_picture + req.params.name, function(error, data) {
    res.end(data);
  });
});

// ===== 매니저 전달사항 첨부사진 =====
router.get(upath.manager_introimage + ":name", async function (req, res, next) {
  fs.readFile("./public" + upath.manager_introimage + req.params.name, function(error, data) {
    res.end(data);
  });
});

// ===== 고객 필수서류 =====
router.get(upath.customer_document + ":name", async function (req, res, next) {
  fs.readFile("./public" + upath.customer_document + req.params.name, function(error, data) {
    res.end(data);
  });
});

// ===== 휠체어/리프트 수리/점검 증명서류 =====
router.get(upath.repair_wheel_document + ":name", async function (req, res, next) {
  fs.readFile("./public" + upath.repair_wheel_document + req.params.name, function(error, data) {
    res.end(data);
  });
});

// ===== 차량 수리/점검 증명서류 =====
router.get(upath.repair_car_document + ":name", async function (req, res, next) {
  fs.readFile("./public" + upath.repair_car_document + req.params.name, function(error, data) {
    res.end(data);
  });
});

// ===== 관리자 프로필 사진 =====
router.get(upath.admin_picture + ":name", async function (req, res, next) {
  fs.readFile("./public" + upath.admin_picture + req.params.name, function(error, data) {
    res.end(data);
  });
});

// ===== 동행 사진 =====
router.get(upath.accompany_picture + ":name", async function (req, res, next) {
  fs.readFile("./public" + upath.accompany_picture + req.params.name, function(error, data) {
    res.end(data);
  });
});

// ===== 매니저 공지사항 업로드파일 =====
router.get(upath.manager_notice_file + ":name", async function (req, res, next) {
  fs.readFile("./public" + upath.manager_notice_file + req.params.name, function(error, data) {
    res.end(data);
  });
});

// ===== 고객 공지사항 업로드파일 =====
router.get(upath.customer_notice_file + ":name", async function (req, res, next) {
  fs.readFile("./public" + upath.customer_notice_file + req.params.name, function(error, data) {
    res.end(data);
  });
});

module.exports = router;
