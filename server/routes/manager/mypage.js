const express = require('express');
const router = express.Router();

const jwt = require('../../modules/jwt');
const pool = require('../../modules/mysql');
const pool2 = require('../../modules/mysql2');
const upload = require('../../modules/fileupload');
const bcrypt = require('bcryptjs');

const bcrypt_option = require('../../config/bcrypt');
const uplPath = require('../../config/upload_path');
const saltRounds = bcrypt_option.saltRounds;


// ===== 마이페이지 입장 =====
router.post('', async function (req, res, next) {
    const token = req.body.jwtToken;

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const user_name = token_res.name;

    res.send({user_name: user_name});
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
        const sql = "select * from `netsmanager` where `netsmanager_id`=?;";
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


// ===== 마이페이지 개인정보 변경 - 프로필 사진 업로드 =====
router.post('/changeInfo/UploadProfile', (upload(uplPath.manager_picture)).single('file'), async function (req, res, next) {
    const file = req.file;
    const token = req.body.jwtToken;
    if(file === undefined) return res.status(400).send({ err : "파일이 업로드되지 않았습니다." });

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const id = token_res.id;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const filepath = uplPath.manager_picture + file.filename; // 업로드 파일 경로
        const spl = "update `netsmanager` set `netsmanager_picture_path`=? where `netsmanager_id`=?;"
        await connection.query(spl, [filepath, id]);
        res.send();
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 마이페이지 개인정보 변경 - 전달사항 첨부이미지 업로드 =====
router.post('/changeInfo/UploadIntroimage', (upload(uplPath.manager_introimage)).single('file'), async function (req, res, next) {
    const file = req.file;
    const token = req.body.jwtToken;
    if(file === undefined) return res.status(400).send({ err : "파일이 업로드되지 않았습니다." });

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const id = token_res.id;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const filepath = uplPath.manager_introimage + file.filename; // 업로드 파일 경로
        const spl = "update `netsmanager` set `netsmanager_notice_picture_url`=? where `netsmanager_id`=?;"
        await connection.query(spl, [filepath, id]);
        res.send();
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
    const { name, phone, intro, notice } = req.body;

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const id = token_res.id; // 이용자 id

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql = "update `netsmanager` set `netsmanager_name`=?, `netsmanager_phone`=?, " + 
            "`netsmanager_about_me`=?, `netsmanager_notice`=? where `netsmanager_id`=?;";
        const result = await connection.query(sql, [name, phone, intro, notice, id]);
        if(result[0].affectedRows == 0) throw err = 0;
        res.status(200).send();
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(500).send({ err : "개인정보 변경 실패" });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 마이페이지 비밀번호 변경 =====
router.post('/changePw', async function (req, res, next) {
    const token = req.body.jwtToken;
    const {user_pw, user_newPw} = req.body;

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const user_id = token_res.id; // 이용자 id

    const connection = await pool2.getConnection(async conn => conn);
    try {
        // 비밀번호 일치 검사
        const sql_ck = "select `netsmanager_password` from `netsmanager` where `netsmanager_id`=?;";
        const res_ck = await connection.query(sql_ck, [user_id]);
        const data_ck = res_ck[0];
        if(data_ck.length == 0) throw err = 0;

        const user_prePw = data_ck[0].netsmanager_password;
        const isCorrect = await bcrypt.compare(user_pw, user_prePw);
        if(!isCorrect) throw err = 1;

        // 새 비밀번호 변경
        const user_hashedNewPw = await bcrypt.hash(user_newPw, saltRounds);
        const sql_ch = "update `netsmanager` set `netsmanager_password`=? where `netsmanager_id`=?;";
        const res_ch = await connection.query(sql_ch, [user_hashedNewPw, user_id]);

        if(res_ch[0].affectedRows == 0) throw err = 2;
        res.status(200).send({ok: true});
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(400).send({ err : "해당 계정이 존재하지 않습니다" });
        else if(err == 1) res.status(200).send({ok: false}); // 비밀번호 불일치
        else if(err == 2) res.status(500).send({ err : "비밀번호 변경 실패" });
        else res.status(500).send({ err : "서버 오류" });
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
