const express = require('express');
const multer = require('multer');
const router = express.Router();

const jwt = require('../../modules/jwt');
const pool = require('../../modules/mysql');
const pool2 = require('../../modules/mysql2');
const fileupload = require('../../modules/fileupload');

const reservation_state = require('../../config/reservation_state');
const service_state = require('../../config/service_state');
const upload_path = require('../../config/upload_path');


// ===== 서비스 목록 조회 =====
router.post('/serviceList/:listType', async function (req, res, next) {
    const token = req.body.jwtToken;
    const listType = req.params.listType;

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const manager_id = token_res.id; // 이용자 id

    const connection = await pool2.getConnection(async conn => conn);
    try {
        if(!(listType >= 0 && listType <= 1))
            throw err = 0;

        let param = [manager_id];
        let sql1 = "select S.`service_kind` as `service_type`, R.`reservation_id` as `service_id`, `expect_pickup_time` as `pickup_time`, `pickup_base_address` as `pickup_address`, " + 
            "`hospital_base_address` as `hos_name`, `hope_hospital_arrival_time` as `hos_arrival_time`, `fixed_medical_time` as `hos_care_time`, `hope_hospital_departure_time` as `hos_depart_time`, " + 
            "U.`user_name` as `user_name`, `gowithmanager_name` as `gowithumanager`, " + 
            "`reservation_state_id` as `service_state`, P.`is_need_extra_payment` as `needExtraPay` " + 
            "from `reservation` as R, `service_info` as S, `user` as U, `netsmanager` as NM, `payment` as P " + 
            "where R.`netsmanager_id`=? and R.`service_kind_id`=S.`service_kind_id` and R.`netsmanager_id`=NM.`netsmanager_id` " + 
            "and R.`user_id`=U.`user_id` and R.`reservation_id`=P.`reservation_id` ";

        // 서비스 진행상태 분기점
        if(listType == 0)
        {
            sql1 += "and `reservation_state_id` in (?,?) ";
            param.push(reservation_state.ready, reservation_state.inProgress);
        }
        else 
        {
            sql1 += "and `reservation_state_id`=? ";
            param.push(reservation_state.complete);
        }
        
        sql1 += "order by `expect_pickup_time`;";
        const result1 = await connection.query(sql1, param);
        const data1 = result1[0];

        res.send(data1);
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(401).send({ err : "잘못된 인자 전달" });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 서비스 상세보기 =====
router.post('/serviceDetail/:service_id', async function (req, res, next) {
    const service_id = req.params.service_id;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        // 필수서류 제출확인
        const spl_doc = "select `valid_target_evidence_path` as `path` from `reservation_user` where `reservation_id`=?;"
        const result_doc = await connection.query(spl_doc, [service_id]);
        const data_doc = result_doc[0];
        if(data_doc[0].path === null) return res.send({ document_isSubmit: false }); // 필수 서류 미제출

    	// 서비스 정보
        const sql_service = "select `pickup_base_address` as `pickup_address`, `hospital_base_address` as `hos_name`, U.`user_name` as `user_name`, " + 
            "`expect_pickup_time` as `timeRange_start`, `hope_hospital_departure_time` as `timeRange_end`, S.`service_kind` as `service_type`, " + 
            "`reservation_state_id` as `service_state`, P.`is_need_extra_payment` as `needExtraPay` " + 
            "from `reservation` as R, `service_info` as S, `user` as U, `payment` as P " + 
            "where R.`reservation_id`=? and R.`service_kind_id`=S.`service_kind_id` and R.`user_id`=U.`user_id` and R.`reservation_id`=P.`reservation_id`;";
        const result_service = await connection.query(sql_service, [service_id]);
        const data_service = result_service[0];

        if(data_service.length == 0)
            throw err = 0;

        // 차량정보
        // const sql_car = "select `car_number` from `reservation` as R, `car` as C where `reservation_id`=? and R.`car_id`=C.`car_id`;";
        // const result_car = await connection.query(sql_car, [service_id]);
        // const data_car = result_car[0];

        // 서비스 상태정보
        const sql_prog = "select * from `service_progress` where `reservation_id`=?;";
        const result_prog = await connection.query(sql_prog, [service_id]);
        const data_prog = result_prog[0];

        const service_prog = data_prog[0].service_state_id;
        const service_prog_nextime = [];
        service_prog_nextime[service_state.pickup] = data_prog[0].real_pickup_time; // 픽업완료
        service_prog_nextime[service_state.arrivalHos] = data_prog[0].real_hospital_arrival_time; // 병원도착
        service_prog_nextime[service_state.carReady] = data_prog[0].real_return_hospital_arrival_time; // 귀가차량 병원도착
        service_prog_nextime[service_state.goHome] = data_prog[0].real_return_start_time; // 귀가출발
        service_prog_nextime[service_state.complete] = data_prog[0].real_service_end_time; // 서비스종료

        // 매니저 정보
        const sql_manager = "select `netsmanager_name` as `name`, `netsmanager_notice` as `mention` " + 
            "from `reservation` as R, `netsmanager` as NM where `reservation_id`=? and R.`netsmanager_id`=NM.`netsmanager_id`;";
        const result_manager = await connection.query(sql_manager, [service_id]);
        const data_manager = result_manager[0];
        
        res.send({
        	document_isSubmit: true,
            service_prog: service_prog,
            service_prog_nextime: service_prog_nextime,
            manager: data_manager[0],
            service: data_service[0],
        });
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(401).send({ err : "해당 서비스 정보가 존재하지 않습니다." });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 서비스 상세보기 - 완료 시간 설정 =====
router.post('/serviceDetail/:service_id/recodeTime', async function (req, res, next) {
    const service_id = req.params.service_id;
    const recodeTime = req.body.recodeTime;

    const recode_date = new Date();
    recode_date.setHours(recodeTime.hours);
    recode_date.setMinutes(recodeTime.minutes);

    const connection = await pool2.getConnection(async conn => conn);
    try {
        // 현재 서비스 상태 구하기
        const sql_prog = "select `service_state_id` from `service_progress` where `reservation_id`=?;";
        const result_prog = await connection.query(sql_prog, [service_id]);
        const data_prog = result_prog[0];
        const next_state = data_prog[0].service_state_id + 1;

        // 상태 설정
        let prog;
        switch(next_state)
        {
            case service_state.pickup: prog = "real_pickup_time"; break; // 픽업완료
            case service_state.arrivalHos: prog = "real_hospital_arrival_time"; break; // 병원도착
            case service_state.carReady: prog = "real_return_hospital_arrival_time"; break; // 귀가차량 병원도착
            case service_state.goHome: prog = "real_return_start_time"; break; // 귀가출발
            default: prog = "real_service_end_time"; break; // 서비스종료
        }

        const spl = "update `service_progress` set `" + prog + "`=?, `service_state_id`=? where `reservation_id`=?;"
        await connection.query(spl, [recode_date, next_state, service_id]);
        
        res.send();
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(401).send({ err : "잘못된 인자입니다." });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 서비스 상세보기 - 필수서류 제출 =====
router.post('/serviceDetail/:service_id/submitDoc', async function (req, res, next) {
    (fileupload(upload_path.customer_document))(req, res, async function(err) {
        if (err instanceof multer.MulterError) return res.status(500).send({ err : "파일 업로드 오류" });
        else if (err) return res.status(500).send({ err : "파일 업로드 오류" });
        if(req.file === undefined) return res.status(500).send({ err : "파일 업로드 오류" });

        const service_id = req.params.service_id;
        const filepath = upload_path.customer_document + req.file.filename; // 업로드 파일 경로

        const connection = await pool2.getConnection(async conn => conn);
        try {
            const spl = "update `reservation_user` set `valid_target_evidence_path`=? where `reservation_id`=?;"
            await connection.query(spl, [filepath, service_id]);
            res.send();
        }
        catch (err) {
            console.error("err : " + err);
            res.status(500).send({ err : "서버 오류" });
        }
        finally {
            connection.release();
        }
    });
});


module.exports = router;
