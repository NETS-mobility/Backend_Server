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
        const date = new Date();
        const sql = "select S.`service_kind` as `service_type`, `expect_pickup_time` as `pickup_time`" + 
            "from `reservation` as R, `service_info` as S " + 
            "where `user_id`=? and R.`service_kind_id`=S.`service_kind_id` and `expect_pickup_time` >= ? " + 
            "order by `pickup_time`;";
        const sql_result = await connection.query(sql, [user_id, date]);
        const sql_data = sql_result[0];

        let service = undefined;
        if(sql_data.length > 0)
        {
            service = {
                date: sql_data[0].pickup_time,
                type: sql_data[0].service_type
            }
        }

        res.send({
            user_name: user_name,
            service: service
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
