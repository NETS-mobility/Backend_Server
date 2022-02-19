const express = require('express');
const router = express.Router();
const { user } = require('../../config/database');

const jwt = require('../../modules/jwt');
const pool2 = require('../../modules/mysql2');

// ===== 알림 조회 =====
router.post('', async function (req, res, next) {
    const token = req.body.jwtToken;

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const manager_id = token_res.id; // 매니저 id
    const connection = await pool2.getConnection(async conn => conn);
    
    try {
        let param = [manager_id];

        const sql = "select m.`netsmanager_name`, ma.`alarm_kind`, ma.`alarm_content`, r.`reservation_id`, u.`user_name`, r.`reservation_submit_date`, r.`pickup_base_address`, r.`pickup_detail_address`, r.`expect_pickup_time`, c.`car_number`, r.`gowithmanager_name` "+
                    "from manager_alarm as ma "+
                    "left join netsmanager as m "+
                    "on ma.`netsmanager_id` = m.`netsmanager_id` "+
                    "left join reservation as r "+
                    "on ma.`netsmanager_id` = r.`netsmanager_id` "+
                    "left join user as u "+
                    "on u.`user_id` = r.`user_id` "+
                    "left join car as c "+
                    "on c.`car_id` = r.`car_id` "+
                    "where ma.`netsmanager_id` = 3 "+
                    "order by ma.`alarm_id` desc;"
            const result = await connection.query(sql, param);
            const data = result[0];
            connection.release();

            res.send(data);
        }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(401).send({ err : "잘못된 인자 전달" });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally{
        connection.release();
    }
});


module.exports = router;