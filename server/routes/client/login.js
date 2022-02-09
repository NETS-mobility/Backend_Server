const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

const jwt = require('../../modules/jwt');
const pool = require('../../modules/mysql');
const pool2 = require('../../modules/mysql2');


// ===== 로그인 =====
router.post('/login', async function (req, res, next) {
    const { id, password } = req.body;

    const connection = await pool2.getConnection(async conn => conn);
    try{
        const sql = `SELECT user_password, user_name FROM user WHERE user_id=?;`;
        const sql_result = await connection.query(sql, [id]);
        const sql_data = sql_result[0];
        
        if(sql_data.length == 0) return res.send({ msg : "아이디가 존재하지 않음" });
        
        const validPassword = await bcrypt.compare(password, sql_data[0]);
        if(validPassword == 0) {
            res.send({ msg : "비밀번호가 일치하지 않음" });
        }
        else {
            const payload = { // 유저 정보
                id : id,
                name : sql_data[1],
            };

            const token_res = await jwt.sign(payload); // 토큰 생성
            res.status(200).send({
                success : true,
                token : token_res
            });
        }
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});

module.exports = router;
