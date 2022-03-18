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
    const user_num = token_res.num;
    const user_name = token_res.name;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const date = new Date();
        const sql = "select S.`service_kind` as `service_type`, `expect_pickup_time` as `pickup_time`, `hope_reservation_date` as `rev_date` " + 
            "from `reservation` as R, `service_info` as S " + 
            "where `user_number`=? and R.`service_kind_id`=S.`service_kind_id` and `hope_reservation_date` >= ? " + 
            "order by `pickup_time`;";
        const sql_result = await connection.query(sql, [user_num, date]);
        const sql_data = sql_result[0];

        res.send({
            name: user_name,
            service: sql_data[0]
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
