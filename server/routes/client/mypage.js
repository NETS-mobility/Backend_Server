const express = require('express');
const router = express.Router();

const jwt = require('../../modules/jwt');
const pool = require('../../modules/mysql');
const pool2 = require('../../modules/mysql2');
const bcrypt = require('bcryptjs');

const bcrypt_option = require('../../config/bcrypt');
const saltRounds = bcrypt_option.saltRounds;


// ===== 마이페이지 입장 =====
router.post('', async function (req, res, next) {
    const token = req.body.jwtToken;

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const user_id = token_res.id;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql = "select `user_id` as `id`, `user_name` as `name`, `user_phone` as `phone` from `user` where `user_number`=?;";
        const sql_result = await connection.query(sql, [user_id]);
        const sql_data = sql_result[0];
        if(sql_data.length == 0) throw err = 0;
        res.send(sql_data[0]);
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(400).send({ err : "회원정보가 존재하지 않습니다." });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 마이페이지 개인정보 변경-아이디 중복확인 =====
router.post('/changeInfo/checkDup', async function (req, res, next) {
    const token = req.body.jwtToken;
    const user_newId = req.body.user_newId;

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const user_id = token_res.id; // 이용자 기존 id

    if(user_id == user_newId) return res.send({isDup: false}); // 기존 아이디 변경없이 제출한 경우

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql = "select `user_id` from `user` where `user_number`=?;";
        const sql_result = await connection.query(sql, [user_newId]);
        const sql_data = sql_result[0];

        if(sql_data.length == 0) res.send({isDup: false});
        else res.send({isDup: true});
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 마이페이지 개인정보 변경 =====
router.post('/changeInfo', async function (req, res, next) {
    const token = req.body.jwtToken;
    const user_name = req.body.user_name;
    const user_newId = req.body.user_newId;
    const user_phone = req.body.user_phone;

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const user_id = token_res.id; // 이용자 id

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql = "update `user` set `user_id`=?, `user_name`=?, `user_phone`=? where `user_number`=?;";
        await connection.query(sql, [user_newId, user_name, user_phone, user_id]);
        res.status(200).send();
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 마이페이지 비밀번호 변경 - 아이디 확인 =====
router.post('/changePw/checkId/', async function (req, res, next) {
    const token = req.body.jwtToken;
    const user_id = req.body.user_id;

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const user_tokenId = token_res.id; // 이용자 id

    if(user_id == user_tokenId) res.send({ ok : true });
    else res.send({ ok : false });
});


// ===== 마이페이지 비밀번호 변경 - 비밀번호 변경 =====
router.post('/changePw/', async function (req, res, next) {
    const token = req.body.jwtToken;
    const user_pw = req.body.user_pw;
    console.log(req.body);

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const user_id = token_res.id; // 이용자 id

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const user_hashedPw = await bcrypt.hash(user_pw, saltRounds);
        const sql = "update `user` set `user_password`=? where `user_number`=?;";
        await connection.query(sql, [user_hashedPw, user_id]);
        res.status(200).send();
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 마이페이지 FAQ =====
// ===== 마이페이지 공지사항 =====
// ===== 마이페이지 예약변경 및 취소 수수료 안내 =====
// ===== 마이페이지 약관 상세 확인 =====

module.exports = router;
