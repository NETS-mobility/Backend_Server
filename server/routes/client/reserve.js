const express = require('express');
const router = express.Router();

const jwt = require('../../modules/jwt');
const pool = require('../../modules/mysql');
const pool2 = require('../../modules/mysql2');

const service_state = require('../../config/service_state');


// ===== 예약 =====
router.post('/reserve', async function (req, res, next) {
    const token = req.body.jwtToken;

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const user_id = token_res.id; // 이용자 id

    let err_custom = false;
    let err_msg = "";

    const client = this.body;
    const connection = await pool2.getConnection(async conn => conn);
    try {
        let sql1 = `INSERT INTO reservation(reservation_id, user_id, reservation_submit_date,
                    is_need_lift, is_gowith_hospital, move_method, move_direction, service_kind_id,
                    pickup_base_address, pickup_detail_address, hospital_base_address, hospital_detail_address, drop_base_address, drop_detail_address,
                    hope_reservation_date, fixed_medical_time, hope_hospital_arrival_time, hope_hospital_departure_time,
                    gowith_hospital_time, is_over_point, fixed_medical_detail, hope_requires
                    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
        
        let sql2 = `INSERT INTO reservation_user(reservation_id, patient_name, patient_phone,
                    valid_target_kind, is_submit_evidence
                    ) VALUES(?, ?, ?, ?, ?);`
        
        const now = new Date();
        let isoverpoint = 0; //2시간 이하
        if(client.gowith_hospital_time > 120) //2시간 초과인지 확인
        {
            isoverpoint = 1; //2시간 초과
        }

        const result1 = await connection.query(sql1, [client.reservation_id, client.user_id, now, 
                        client.is_need_lift, client.is_gowith_hospital, client.move_method, client.move_direction, client.service_kind_id,
                        client.pickup_base_address, client.pickup_detail_address, client.hospital_base_address, client.hospital_detail_address, client.drop_base_address, client.drop_detail_address,
                        client.hope_reservation_date, client.fixed_medical_time, client.hope_hospital_arrival_time, client.hope_hospital_departure_time,
                        client.gowith_hospital_time, isoverpoint, client.fixed_medical_detail, client.hope_require_ids]);

        const result2 = await connection.query(sql2, [client.reservation_id, client.patient_name, client.patient_phone,
                        client.valid_target_kind, client.is_submit_evidence]);

        res.status(200).json({ success: true });
    }
    catch (err) {
        if(!err_custom)
        {
            err_msg = "서버 오류";
            console.error("err : " + err);
            throw err;
        }
        else err_msg = err.message;
        res.status(500).json({ err : err_msg });
    }
    finally {
        connection.release();
    }
});

module.exports = router;
