const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

const jwt = require('../../modules/jwt');
const pool = require('../../modules/mysql');
const pool2 = require('../../modules/mysql2');
const message = require('../../modules/message');
const formatdate = require('../../modules/formatdate');

const bcrypt_option = require('../../config/bcrypt');
const saltRounds = bcrypt_option.saltRounds;


// ===== 회원가입 - 아이디 중복확인 =====
router.post('/checkDup', async function (req, res, next) {
    const id = req.body.id;
    
    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql = `SELECT user_id FROM user WHERE user_id=?;`;
        const result = await connection.query(sql, [id]);
        const sql_data = result[0];

        if (sql_data.length == 0) res.status(200).send({ msg : "아이디 중복 안 됨, 회원가입 가능" });
        else res.status(401).send({ msg : "아이디 중복됨, 회원가입 불가능" });
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 휴대폰 인증-인증번호 반환 =====
router.post('/checkPhone', async function (req, res, next) {
    const phone = req.body.phone;
    const message_res = await message.sendMessage(phone); // 메세지 생성, 결과 얻음
    if (message_res == -1) res.status(500).send({ err : "메세지 전송 실패"});
    else res.status(200).send({ success : true, randomNumber : message_res }); // 인증번호 반환
});


// ===== 회원가입 =====
router.post('', async function (req, res, next) {
    const { id, password, name, phone } = req.body;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const salt = await bcrypt.genSalt(saltRounds);
        const hashed = await bcrypt.hash(password, salt); // 암호화
        
        const sql = `INSERT INTO user (user_id, user_password, user_name, user_phone, user_join_date) VALUES (?,?,?,?,?);`;
        const now = formatdate.getFormatDate(new Date(), 2); // 날짜

        await connection.query(sql, [id, hashed, name, phone, now]);
        res.status(200).send({ success : true });
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버오류" });
    }
    finally {
        connection.release();
    }
});

module.exports = router;
