const express = require('express');
const multer = require('multer');
const router = express.Router();

const jwt = require('../../modules/jwt');
const pool = require('../../modules/mysql');
const pool2 = require('../../modules/mysql2');
const upload = require('../../modules/fileupload');

const reservation_state = require('../../config/reservation_state');
const uplPath = require('../../config/upload_path');

// ===== 예약 =====
router.post('', async function (req, res, next) {
    const token = req.body.jwtToken;
    const user = req.body;

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const user_id = token_res.id; // 이용자 id

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = `INSERT INTO reservation(reservation_id, user_id, reservation_submit_date,
                    is_need_lift, is_gowith_hospital, move_method, move_direction, service_kind_id,
                    pickup_base_address, pickup_detail_address, hospital_base_address, hospital_detail_address, drop_base_address, drop_detail_address,
                    hope_reservation_date, fixed_medical_time, hope_hospital_arrival_time, hope_hospital_departure_time,
                    gowith_hospital_time, is_over_point, fixed_medical_detail, hope_requires
                    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`;
        
        const sql2 = `INSERT INTO reservation_user(reservation_id, patient_name, patient_phone,
                    valid_target_kind, is_submit_evidence
                    ) VALUES(?,?,?,?,?);`;
        
        const now = new Date();
        let isOverPoint = 0; //2시간 이하
        if (user.gowithHospitalTime > 120) //2시간 초과인지 확인
        {
            isOverPoint = 1; //2시간 초과
        }

        const result1 = await connection.query(sql1, [user.reservationId, user_id, now, 
                     user.isNeedLift, user.isGowithHospital, user.moveMethod, user.moveDirection, user.serviceKindId,
                     user.pickupBaseAddr, user.pickupDetailAddr, user.hospitalBaseAddr, user.hospitalDetailAddr, user.dropBaseAddr, user.dropDetailAddr,
                     user.hopeReservationDate, user.fixedMedicalTime, user.hopeHospitalArrivalTime, user.hopeHospitalDepartureTime,
                     user.gowithHospitalTime, isOverPoint, user.fixedMedicalDetail, user.hopeRequires]);

        const result2 = await connection.query(sql2, [user.reservationId, user.patientName, user.patientPhone,
                     user.validTargetKind, user.isSubmitEvidence]);

        res.status(200).send({ success: true });
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 예약 - 필수서류 제출 =====
router.post('/:reservationId/submitDoc', (upload(uplPath.customer_document)).single('file'), async function (req, res, next) {
    const file = req.file;
    if(file === undefined) return res.status(400).send({ err : "파일이 업로드되지 않음" });

    const reservationId = req.params.reservationId;
    const filepath = uplPath.customer_document + file.filename; // 업로드 파일 경로

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql = `UPDATE reservation_user SET valid_target_evidence_path=?, is_submit_evidence=? WHERE reservation_id=?;`;
        await connection.query(sql, [filepath, 1, reservationId]);
        res.status(200).send({ success : true });
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
