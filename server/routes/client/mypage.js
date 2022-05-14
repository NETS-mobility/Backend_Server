const express = require("express");
const router = express.Router();

const jwt = require("../../modules/jwt");
const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");
const bcrypt = require("bcryptjs");

const bcrypt_option = require("../../config/bcrypt");
const logger = require("../../config/logger");
const saltRounds = bcrypt_option.saltRounds;

// ===== 마이페이지 입장 =====
router.post("", async function (req, res, next) {
  const token = req.body.jwtToken;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });
  const user_num = token_res.num;

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql =
      "select `user_id` as `id`, `user_name` as `name`, `user_phone` as `phone` from `user` where `user_number`=?;";
    const sql_result = await connection.query(sql, [user_num]);
    const sql_data = sql_result[0];
    if (sql_data.length == 0) throw (err = 0);
    res.send(sql_data[0]);
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0)
      res.status(400).send({ err: "회원정보가 존재하지 않습니다." });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});

// ===== 마이페이지 개인정보 변경-아이디 중복확인 =====
router.post("/changeInfo/checkDup", async function (req, res, next) {
  const token = req.body.jwtToken;
  const user_newId = req.body.user_newId;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });
  const user_number = token_res.num;

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql =
      "select `user_id` as `id` from `user` where `user_id`=? and `user_number`!=?;";
    const sql_result = await connection.query(sql, [user_newId, user_number]);
    const sql_data = sql_result[0];

    if (sql_data.length == 0) res.send({ isDup: false });
    else res.send({ isDup: true });
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 마이페이지 개인정보 변경 =====
router.post("/changeInfo", async function (req, res, next) {
  const token = req.body.jwtToken;
  const user_name = req.body.user_name;
  const user_newId = req.body.user_newId;
  const user_phone = req.body.user_phone;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });
  const user_num = token_res.num;

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql =
      "update `user` set `user_id`=?, `user_name`=?, `user_phone`=? where `user_number`=?;";
    await connection.query(sql, [user_newId, user_name, user_phone, user_num]);
    res.status(200).send();
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 마이페이지 비밀번호 변경 - 아이디 확인 =====
router.post("/changePw/checkId", async function (req, res, next) {
  const token = req.body.jwtToken;
  const user_id = req.body.user_id;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });
  const user_number = token_res.num;

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql = "select `user_id` as `id` from `user` where `user_number`=?;";
    const sql_result = await connection.query(sql, [user_number]);
    const sql_data = sql_result[0];
    if (sql_data.length == 0) throw (err = 0);

    if (sql_data[0].id == user_id) res.send({ ok: true });
    else res.send({ ok: false });
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0)
      res.status(400).send({ err: "회원정보가 존재하지 않습니다." });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});

// ===== 마이페이지 비밀번호 변경 - 비밀번호 변경 =====
router.post("/changePw", async function (req, res, next) {
  const token = req.body.jwtToken;
  const user_pw = req.body.user_pw;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });
  const user_num = token_res.num;

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const user_hashedPw = await bcrypt.hash(user_pw, saltRounds);
    const sql = "update `user` set `user_password`=? where `user_number`=?;";
    await connection.query(sql, [user_hashedPw, user_num]);
    res.status(200).send();
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 고객 공지사항 - 목록 조회 =====
router.post("/notice", async function (req, res, next) {
  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 =
      "select `post_id` as `id`, `post_title` as `title`, date_format(`post_date`,'%Y-%m-%d') as `date` from `customer_notice` order by `post_id`;";
    const result1 = await connection.query(sql1, []);
    res.send(result1[0]);
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 고객 공지사항 - 내용 조회 =====
router.post("/notice/read/:idx", async function (req, res, next) {
  const idx = req.params.idx;
  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 =
      "select `post_id` as `id`, `post_title` as `title`, date_format(`post_date`,'%Y-%m-%d') as `date`, `post_content` as `content`, " +
      "`view_number` as `view`, `post_writer_id` as `writer_id` from `customer_notice` where `post_id`=?;";
    const result1 = await connection.query(sql1, [idx]);
    const data1 = result1[0];
    if (data1.length == 0) throw (err = 0);
    res.send(data1[0]);
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0)
      res.status(500).send({ err: "해당 게시글을 불러올 수 없습니다." });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});

module.exports = router;
