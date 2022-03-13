const express = require('express');
const router = express.Router();

const jwt = require('../../modules/jwt');
const pool = require('../../modules/mysql');
const pool2 = require('../../modules/mysql2');
const upload = require('../../modules/fileupload');
const formatdate = require('../../modules/formatdate');

const uplPath = require('../../config/upload_path');


// ===== 예약 =====
router.post('', upload(uplPath.customer_document).single('file'), async function (req, res, next) {
    const user = req.body.data;
    const token = user.jwtToken;
    
    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const id = token_res.id; // 고객 id
    const name = token_res.name; // 고객 이름

    let gowithHospitalTime = 0; // 병원 동행 시간
    let moveDirectionId;
    let protectorName, protectorPhone;
 
    gowithHospitalTime = user.gowithHospitalTime; // 병원 동행 시간

    // 이동 방향 확인
    if (user.moveDirection == "집-병원")
    {
        moveDirectionId = 1;
    }
    else if (user.moveDirection == "병원-집")
    {
        moveDirectionId = 2;
    }
    else if (user.moveDirection == "집-집") {
        moveDirectionId = 3;
    }

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = `SELECT user_number, user_phone FROM user WHERE user_id=?;`;
        
        const sql2 = `INSERT INTO reservation(reservation_id, user_number,
                    move_direction_id, service_kind_id, gowith_hospital_time,
                    pickup_address, drop_address, hospital_address,
                    hope_reservation_date, hope_hospital_arrival_time, fixed_medical_time, hope_hospital_departure_time,
                    fixed_medical_detail, hope_requires
                    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?);`;
        
        const sql3 = `INSERT INTO reservation_user(reservation_id, patient_name, patient_phone, protector_name, protector_phone, valid_target_kind
                    ) VALUES(?,?,?,?,?,?);`;
        
        const result1 = await connection.query(sql1, [id]);
        const sql_data = result1[0];

        const userNumber = sql_data[0].user_number;
        const userPhone = sql_data[0].user_phone;

        // 보호자 정보
        if (user.protectorName == undefined && user.protectorPhone == undefined) // 보호자 정보 없으면, 고객 정보를 저장
        {
            protectorName = name;
            protectorPhone = userPhone;
        }
        else { // 보호자 정보 있으면, 입력값으로 저장
            protectorName = user.protectorName;
            protectorPhone = user.protectorPhone;
        }

        // 예약 신청일=매칭 완료일(날짜,시간)
        const now = formatdate.getFormatDate(new Date(), 1);
        
        // 예약 번호
        const reservationId = Number(now.substring(2, 4)+now.substring(5, 7)+now.substring(8, 10)+now.substring(11, 13)+now.substring(14, 16)+now.substring(17));

        const result2 = await connection.query(sql2, [reservationId, userNumber,
                    moveDirectionId, user.serviceKindId, gowithHospitalTime,
                    user.pickupAddr, user.dropAddr, user.hospitalAddr,
                    user.hopeReservationDate, user.hopeHospitalArrivalTime, user.fixedMedicalTime, user.hopeHospitalDepartureTime,
                    user.fixedMedicalDetail, user.hopeRequires]);

        const result3 = await connection.query(sql3, [reservationId, user.patientName, user.patientPhone, protectorName, protectorPhone, user.validTargetKind]);
       
        if (req.file != undefined) { // 파일 존재하면
            const file = req.file;
            const filepath = uplPath.customer_document + file.filename; // 업로드 파일 경로
            const sql4 = `UPDATE reservation_user SET valid_target_evidence_path=?, is_submit_evidence=? WHERE reservation_id=?;`;
            await connection.query(sql4, [filepath, 1, reservationId]); 
        }

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

module.exports = router;
