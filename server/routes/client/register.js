const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

const jwt = require('../../modules/jwt');
const pool = require('../../modules/mysql');
const pool2 = require('../../modules/mysql2');


// ===== 회원가입 - 아이디 중복확인 =====
router.post('/register/checkDup', async function (req, res, next) {
    const id = req.body.user_id;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql = `SELECT user_id FROM user WHERE user_id=?;`;
        const sql_result = await connection.query(sql, [id]);
        const sql_data = sql_result[0];

        if(sql_data.length == 0) res.send({ msg : "아이디 중복 안 됨, 회원가입 가능" });
        else res.send({ msg : "아이디 중복됨, 회원가입 불가능" });
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 회원가입 =====
router.post('/register', async function (req, res, next) {
    const { id, password, name, phone } = req.body;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);
        
        const sql = `INSERT INTO user(id, password, name, phone, user_join_date) VALUES(?, ?, ?, ?);`;
        const now = new Date();

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
