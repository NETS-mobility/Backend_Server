const express = require('express');
const router = express.Router();

const jwt = require('../../modules/jwt');
const pool = require('../../modules/mysql');
const pool2 = require('../../modules/mysql2');


// ===== 홈페이지 =====
router.post('', async function (req, res, next) {
    const token = req.body.jwtToken;

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const user_id = token_res.id; // 이용자 id
    const user_name = token_res.name;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const now = new Date("2022-02-09");
        const sql = "select S.`service_kind` as `service_type`, `expect_pickup_time` as `pickup_time`, `pickup_base_address` as `pickup_address`" + 
            "from `reservation` as R, `service_info` as S " + 
            "where `netsmanager_id`=? and R.`service_kind_id`=S.`service_kind_id` and `expect_pickup_time` >= ? " + 
            "order by `pickup_time`;";
        const sql_result = await connection.query(sql, [user_id, now]);
        const sql_data = sql_result[0];

        const service_list = [];
        for(let i = 0; i < sql_data.length; i++) {
            const servDate = new Date(sql_data[i].pickup_time);
            if(now.getDate() == servDate.getDate()) service_list.push(sql_data[i]);
            else break;
        }

        res.send({
            name: user_name,
            service: service_list
        });
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
