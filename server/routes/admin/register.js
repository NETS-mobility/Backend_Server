const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

const jwt = require('../../modules/jwt');
const pool = require('../../modules/mysql');
const pool2 = require('../../modules/mysql2');
const message = require('../../modules/message');


// ===== 회원가입 - 아이디 중복확인(매니저 or 관리자) =====
router.post('/checkDup', async function (req, res, next) {
    const { type, id } = req.body; 
    
    const connection = await pool2.getConnection(async conn => conn);
    try {
        let sql;
        if (type == "매니저") {
            sql = `SELECT netsmanager_id FROM netsmanager WHERE netsmanager_id=?;`;
        }
        else if (type == "관리자") {
            sql = `SELECT admin_id FROM administrator WHERE admin_id=?;`;
        }
    
        const sql_result = await connection.query(sql, [id]);
        const sql_data = sql_result[0];

        if(sql_data.length == 0) res.status(200).send({ msg : "아이디 중복 안 됨, 회원가입 가능" });
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


// ===== 회원가입 - 매니저 등록 =====
router.post('/manager', async function (req, res, next) {
    const { id, password, name, phone, birth, driverLicense, bankName, bankAccount } = req.body;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt); // 암호화
        
        const sql = `INSERT INTO netsmanager(netsmanager_id, netsmanager_password, netsmanager_name, netsmanager_phone,
                   netsmanager_birth, netsmanager_driver_license, netsmanager_bank_name, netsmanager_bank_accout,      
                   netsmanager_join_date) VALUES(?,?,?,?,?,?,?,?,?);`;
        const now = new Date();

        await connection.query(sql, [id, hashed, name, phone, birth, driverLicense, bankName, bankAccount, now]);
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


// ===== 회원가입 - 관리자 등록 =====
router.post('/admin', async function (req, res, next) {
    const { id, password, name, phone, birth } = req.body;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt); // 암호화
        
        const sql = `INSERT INTO administrator(admin_id, admin_password, admin_name, admin_phone, admin_birth, admin_join_date) VALUES(?,?,?,?,?,?);`;
        const now = new Date();

        await connection.query(sql, [id, hashed, name, phone, birth, now]);
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
