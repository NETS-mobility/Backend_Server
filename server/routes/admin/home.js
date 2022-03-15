const express = require('express');
const router = express.Router();

const jwt = require('../../modules/jwt');
const pool = require('../../modules/mysql');
const pool2 = require('../../modules/mysql2');
const token_checker = require('../../modules/admin_token');
const bcrypt = require('bcryptjs');

const bcrypt_option = require('../../config/bcrypt');
const saltRounds = bcrypt_option.saltRounds;


// ===== 토큰을 통해 이름 반환 =====
router.post('/getName', async function (req, res, next) {
    const token = req.body.jwtToken;
    if(!(await token_checker(req.body.jwtToken)))
    {
        res.status(401).send({ err : "접근 권한이 없습니다." });
        return;
    }

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const name = token_res.name;

    res.send({name: name});
});


// ===== 비밀번호 변경 =====
router.post('/changePw', async function (req, res, next) {
    const token = req.body.jwtToken;
    const { admin_pw, admin_newPw } = req.body;

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const admin_id = token_res.id; // 이용자 id

    const connection = await pool2.getConnection(async conn => conn);
    try {
        // 비밀번호 일치 검사
        const sql_ck = "select `admin_password` from `administrator` where `admin_id`=?;";
        const res_ck = await connection.query(sql_ck, [admin_id]);
        const data_ck = res_ck[0];

        const admin_prePw = data_ck[0].admin_password;
        const isCorrect = await bcrypt.compare(admin_pw, admin_prePw);
        if(!isCorrect) throw err = 1;

        // 새 비밀번호 변경
        const salt = await bcrypt.genSalt(saltRounds);
        const admin_hashedNewPw = await bcrypt.hash(admin_newPw, salt); // 암호화
        const sql_ch = "update `administrator` set `admin_password`=? where `admin_id`=?;";
        const res_ch = await connection.query(sql_ch, [admin_hashedNewPw, admin_id]);

        if(res_ch[0].affectedRows == 0) throw err = 2;
        res.status(200).send({ success : true });
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 1) res.status(401).send({ msg : "기존 비밀번호가 일치하지 않음" });
        else if(err == 2) res.status(500).send({ err : "비밀번호 변경 실패" });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});

module.exports = router;
