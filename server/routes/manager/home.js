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
        const now = new Date();
        const sql = "select S.`service_kind` as `service_type`, `expect_pickup_time` as `pickup_time`, `hope_reservation_date` as `rev_date`, `pickup_address` " +
            "from `car_dispatch` as C, `reservation` as R, `service_info` as S " + 
            "where C.`netsmanager_number`=? and C.`reservation_id`=R.`reservation_id` and R.`service_kind_id`=S.`service_kind_id` and R.`hope_reservation_date`>=? " + 
            "order by `pickup_time`;";
        const sql_result = await connection.query(sql, [user_id, "2020-02-01"]);
        const sql_data = sql_result[0];

        /*const service_list = [];
        for(let i = 0; i < sql_data.length; i++) {
            const servDate = new Date(sql_data[i].pickup_time);
            if(now.getDate() == servDate.getDate()) service_list.push(sql_data[i]);
            else break;
        }*/

        res.send({
            name: user_name,
            service: sql_data
        });
    }
    catch (err) {
        console.error("err : " + err);
        // res.status(500).send({ err : "서버 오류" });
        res.status(500).send({ err : "오류-" + err });
    }
    finally {
        connection.release();
    }
});


module.exports = router;
