const express = require('express');
const router = express.Router();

const jwt = require('../../modules/jwt');
const pool = require('../../modules/mysql');
const pool2 = require('../../modules/mysql2');

const reservation_state = require('../../config/reservation_state');
const service_state = require('../../config/service_state');


// ===== 서비스 목록 조회 =====
router.post('/serviceList/:listType/:listDate', async function (req, res, next) {
    const listType = req.params.listType;
    const listDate = req.params.listDate; // 전체 날짜 출력시 "NONE"

    const connection = await pool2.getConnection(async conn => conn);
    try {
    	const targetDate = new Date(listDate);
        if(!(listType >= 0 && listType <= 2)) throw err = 0;
        if(listDate != "NONE" && !(targetDate instanceof Date && !isNaN(targetDate))) throw err = 0;

        const param = [];
        let sql1 = "select cast(`reservation_id` as char) as `service_id`, `expect_pickup_time` as `pickup_time`, `netsmanager_id` as `manager_id` "+ 
            "from `reservation` where `reservation_state_id`=? ";

        if (listType == 0) param.push(reservation_state.ready); // 운행 전
        else if (listType == 1) param.push(reservation_state.inProgress); // 운행 시작
        else param.push(reservation_state.complete); // 운행 종료

       	if(listDate != "NONE")
       	{
       		sql1 += "and `expect_pickup_time` >= ? ";
       		param.push(targetDate);
       	}
       	sql1 += "order by `expect_pickup_time`;";
        
        const result1 = await connection.query(sql1, param);
        const data1 = result1[0];

        if(listDate != "NONE") // 날짜 필터링
        {
	        const service_list = [];
	        for(let i = 0; i < data1.length; i++) {
	            const servDate = new Date(data1[i].pickup_time);
	            if(targetDate.getDate() == servDate.getDate()) service_list.push(data1[i]);
	            else break;
	        }
	        res.send(service_list);
        }
        else res.send(data1);
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
    	// 서비스 정보
        const sql_service = "select cast(R.`reservation_id` as char) as `service_id`, `expect_pickup_time` as `pickup_time`, `pickup_base_address` as `pickup_address`, `hospital_base_address` as `hos_name`, " + 
            "`hope_hospital_arrival_time` as `hos_arrival_time`, `fixed_medical_time` as `hos_care_time`, `hope_hospital_departure_time` as `hos_depart_time`, " + 
            "NM.`netsmanager_name` as `netsmanager_name`, R.`netsmanager_id` as `netsmanager_id`, C.`car_number` as `car_number`, `gowithmanager_name` as `gowithumanager`, " + 
            "`reservation_state_id` as `reservation_state`, P.`base_payment_method` as `payMethod`, P.`is_need_extra_payment` as `isNeedExtraPay`, " + 
            "P.`is_complete_extra_payment` as `isCompleteExtraPay`, P.`base_payment_amount` as `cost`, R.`user_id` as `customer_id`, U.`user_name` as `customer_name`, S.`service_kind` as `service_type` " + 
            "from `reservation` as R, `netsmanager` as NM, `car` as C, `payment` as P, `user` as U, `service_info` as S " + 
            "where R.`reservation_id`=? and R.`car_id`=C.`car_id` and R.`netsmanager_id`=NM.`netsmanager_id` and R.`reservation_id`=P.`reservation_id` and R.`user_id`=U.`user_id` and R.`service_kind_id`=S.`service_kind_id`;";
        const result_service = await connection.query(sql_service, [service_id]);
        const data_service = result_service[0];
        if(data_service.length == 0) throw err = 0;

        // 서비스 상태정보
        const sql_prog = "select * from `service_progress` where `reservation_id`=?;";
        const result_prog = await connection.query(sql_prog, [service_id]);
        const data_prog = result_prog[0];
        if(data_prog.length == 0) throw err = 1;

        const service_state = data_prog[0].service_state_id;
        const service_state_time = [];
        service_state_time[service_state.pickup] = data_prog[0].real_pickup_time; // 픽업완료
        service_state_time[service_state.arrivalHos] = data_prog[0].real_hospital_arrival_time; // 병원도착
        service_state_time[service_state.carReady] = data_prog[0].real_return_hospital_arrival_time; // 귀가차량 병원도착
        service_state_time[service_state.goHome] = data_prog[0].real_return_start_time; // 귀가출발
        service_state_time[service_state.complete] = data_prog[0].real_service_end_time; // 서비스종료
        
        res.send({
            service_state: service_state,
            service_state_time: service_state_time,
            service: data_service[0]
        });
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(401).send({ err : "해당 서비스 정보가 존재하지 않습니다." });
        else if(err == 1) res.status(401).send({ err : "해당 서비스 진행정보가 존재하지 않습니다." });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 서비스 상세보기 - 진행상태 변경 =====
router.post('/serviceDetail/:service_id/changeProg', async function (req, res, next) {
    const service_id = req.params.service_id;
    const next_state = req.body.service_state;
    const recTime = req.body.service_state_time;

    const connection = await pool2.getConnection(async conn => conn);
    try {
    	const ss = service_state;
        const param = [recTime[ss.pickup], recTime[ss.arrivalHos], recTime[ss.carReady], recTime[ss.goHome], 
        	recTime[ss.complete], next_state, service_id];

        const spl = "update `service_progress` set `real_pickup_time`=?, `real_hospital_arrival_time`=?, `real_return_hospital_arrival_time`=?, " + 
        	"`real_return_start_time`=?, `real_service_end_time`=?, `service_state_id`=? where `reservation_id`=?;"
        const result = await connection.query(spl, param);
        if(result[0].affectedRows == 0) throw err = 0;
        res.status(200).send();
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(500).send({ err : "정보 변경 실패" });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 서비스 상세보기 - 네츠매니저 목록 반환 =====
router.post('/serviceDetail/:service_id/getNetsmanList', async function (req, res, next) {
    const service_id = req.params.service_id;

    const connection = await pool2.getConnection(async conn => conn);
    try {
    	// 예약날짜 구하기
    	const sql_date = "select `expect_pickup_time` from `reservation` where `reservation_id`=?;"
    	const result_date = await connection.query(sql_date, [service_id]);
        const data_date = result_date[0];
        if(data_date.length == 0) throw err = 0;

        // 매니저 구하기 (승인된 휴가 날짜가 예약날짜를 포함하는 매니저 필터링)
        const revDate_obj = new Date(data_date[0].expect_pickup_time);
        const revDate = "" + revDate_obj.getFullYear() + "-" + (revDate_obj.getMonth()+1) + "-" + revDate_obj.getDate();
        const sql_man = "select `netsmanager_name` as `name`, `netsmanager_id` as `id` from `netsmanager` as M where " + 
			"not exists (select * from `manager_holiday` as H where M.`netsmanager_id`=H.`netsmanager_id` and `holiday_certified`=1 and `start_holiday_date`<=? and `end_holiday_date`>=?);";
    	const result_man = await connection.query(sql_man, [revDate, revDate]);
        const data_man = result_man[0];

        res.send(data_man);
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(500).send({ err : "검색 실패" });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 서비스 상세보기 - 네츠매니저 변경 =====
router.post('/serviceDetail/:service_id/changeNetsman', async function (req, res, next) {
    const service_id = req.params.service_id;
    const manager_id = req.body.manager_id;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const spl = "update `reservation` set `netsmanager_id`=? where `reservation_id`=?;"
        const result = await connection.query(spl, [manager_id, service_id]);
        if(result[0].affectedRows == 0) throw err = 0;
        res.status(200).send();
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(500).send({ err : "매니저 변경 실패" });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


module.exports = router;
