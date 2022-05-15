const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const jwt = require("../../modules/jwt");
const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");
const message = require("../../modules/message");

const bcrypt_option = require("../../config/bcrypt");
const logger = require("../../config/logger");
const saltRounds = bcrypt_option.saltRounds;

// ===== 로그인 =====
router.post("", async function (req, res, next) {
  const { id, password } = req.body;

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql = `SELECT admin_password, admin_name, admin_number FROM administrator WHERE admin_id=?;`;
    const result = await connection.query(sql, [id]);
    const sql_data = result[0];

    if (sql_data.length == 0)
      return res.status(401).send({ msg: "아이디가 존재하지 않음" });

    const validPassword = await bcrypt.compare(
      password,
      sql_data[0].admin_password
    ); // 복호화 비교
    if (validPassword == 0) {
      res.status(401).send({ msg: "비밀번호가 일치하지 않음" });
    } else {
      const payload = {
        // 관리자 정보
        id: id,
        name: sql_data[0].admin_name,
        num: sql_data[0].admin_number,
      };

      const token_res = await jwt.sign(payload); // 토큰 생성
      res.status(200).send({ success: true, token: token_res });
    }
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 휴대폰 인증-인증번호 반환 =====
router.post("/checkPhone", async function (req, res, next) {
  const phone = req.body.phone;
  const message_res = await message.sendMessage(phone); // 메세지 생성, 결과 얻음
  if (message_res == -1) res.status(500).send({ err: "메세지 전송 실패" });
  else res.status(200).send({ success: true, randomNumber: message_res }); // 인증번호 반환
});

// ===== 아이디 찾기 =====
router.post("/findId", async function (req, res, next) {
  const phone = req.body.phone;

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql = `SELECT admin_id FROM administrator WHERE admin_phone=?;`;
    const result = await connection.query(sql, [phone]);
    const sql_data = result[0];

    if (sql_data.length == 0)
      res.status(401).send({ msg: "아이디가 존재하지 않음" });
    else res.status(200).send({ success: true, id: sql_data[0].admin_id }); // 아이디 반환
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 비밀번호 변경 =====
router.post("/changePw", async function (req, res, next) {
  const { id, password } = req.body;

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hashed = await bcrypt.hash(password, salt); // 암호화

    const sql1 = `SELECT admin_id FROM administrator WHERE admin_id=?;`;
    const result1 = await connection.query(sql1, [id]);
    const sql_data = result1[0];

    if (sql_data.length == 0)
      res.status(401).send({ msg: "아이디가 존재하지 않음" });
    else {
      const sql2 = `UPDATE administrator SET admin_password=? WHERE admin_id=?;`;
      await connection.query(sql2, [hashed, id]);
      res.status(200).send({ success: true });
    }
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

module.exports = router;
