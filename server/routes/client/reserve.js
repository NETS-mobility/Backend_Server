const express = require('express');
const router = express.Router();

const jwt = require('../../modules/jwt');
const pool = require('../../modules/mysql');
const pool2 = require('../../modules/mysql2');
const upload = require('../../modules/fileupload');
const formatdate = require('../../modules/formatdate');

const uplPath = require('../../config/upload_path');

// ===== 예약 =====
router.post('', async function (req, res, next) {
    const token = req.body.jwtToken;
    const user = req.body;

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const id = token_res.id; // 고객 id
    const name = token_res.name; // 고객 이름

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = `SELECT user_number, user_phone FROM user WHERE user_id=?;`;
        
        const sql2 = `INSERT INTO reservation(reservation_id, user_number,
                    is_need_lift, is_gowith_hospital, move_method, move_direction, service_kind_id,
                    gowith_hospital_time, is_over_point,
                    pickup_address, drop_address, hospital_address,
                    hope_reservation_date, hope_hospital_arrival_time, fixed_medical_time, hope_hospital_departure_time,
                    fixed_medical_detail, hope_requires, reservation_submit_date 
                    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`;
        
        const sql3 = `INSERT INTO reservation_user(reservation_id, patient_name, patient_phone, protector_name, protector_phone, valid_target_kind
                    ) VALUES(?,?,?,?,?,?);`;

        const now = formatdate.getFormatDate(new Date(), 1); // 예약 신청일=매칭 완료일(날짜, 시간)

        const reservationId = now.substring(2, 4)+now.substring(5, 7)+now.substring(8, 10)+now.substring(11, 13)+now.substring(14, 16)+now.substring(17);

        let isNeedLift = 0; // 리프트 서비스 이용 여부
        let isGowithHospital = 0; // 병원 동행 서비스 이용 여부
        let gowithHospitalTime = 0; // 병원 동행 시간 = 0
        let isOverPoint = 0; // 병원 동행 시간 2시간 초과 여부 = 0(false)
        let protectorName, protectorPhone;

        // 서비스 유형에 따라->리프트, 동행 여부 판단
        if (user.serviceKindId == 4 || user.serviceKindId == 5) { // 네츠 휠체어 플러스->리프트, 병원 동행
            isNeedLift = 1; // 리프트 서비스 이용
            isGowithHospital = 1; // 병원 동행 서비스 이용
            gowithHospitalTime = user.gowithHospitalTime; // 병원 동행 시간
        }
        else if (user.serviceKindId == 2 || user.serviceKindId == 3) { // 네츠 휠체어->병원 동행
            isGowithHospital = 1; // 병원 동행 서비스 이용
            gowithHospitalTime = user.gowithHospitalTime; // 병원 동행 시간
        } // 네츠 무브->리프트 없음, 병원 동행 없음

        // 병원 동행 2시간 초과 여부
        if (gowithHospitalTime > 120) // 병원 동행 2시간(120분) 초과인지 확인
        {
            isOverPoint = 1; // 2시간 초과
        }

        // 왕복인지 편도인지 판단
        if (user.moveDirection == "집-집") // 집-집의 경우
        {
            moveMethod = "왕복";
        }
        else { // 집-병원, 병원-집의 경우
            moveMethod = "편도";
        }

        const result1 = await connection.query(sql1, [id]);
        const sql_data = result1[0];

        const userNumber = sql_data[0].user_number;
        const userPhone = sql_data[0].user_phone;

        // 보호자 정보
        if (user.protectorName == undefined && user.protectorPhone == undefined) // 보호자 정보 없으면, 고객 정보를 보호자 정보로 저장
        {
            protectorName = name;
            protectorPhone = userPhone;
        }
        else { // 보호자 정보 있으면, 입력값으로 저장
            protectorName = user.protectorName;
            protectorPhone = user.protectorPhone;
        }

        const result2 = await connection.query(sql2, [reservationId, userNumber,
                    isNeedLift, isGowithHospital, moveMethod, user.moveDirection, user.serviceKindId,
                    gowithHospitalTime, isOverPoint,
                    user.pickupAddr, user.dropAddr, user.hospitalAddr,
                    user.hopeReservationDate, user.hopeHospitalArrivalTime, user.fixedMedicalTime, user.hopeHospitalDepartureTime,
                    user.fixedMedicalDetail, user.hopeRequires, now]);

        const result3 = await connection.query(sql3, [reservationId, user.patientName, user.patientPhone, protectorName, protectorPhone, user.validTargetKind]);

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
        await connection.query(sql, [filepath, 1, Number(reservationId)]);
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
