const express = require('express');
const router = express.Router();

const jwt = require('../../modules/jwt');
const pool = require('../../modules/mysql');
const pool2 = require('../../modules/mysql2');
const token_checker = require('../../modules/admin_token');

const reservation_state = require('../../config/reservation_state');
const service_state = require('../../config/service_state');


// ===== 서비스 목록 조회 =====
router.post('/serviceList/:listType/:listDate', async function (req, res, next) {
    const listType = req.params.listType;
    const listDate = req.params.listDate; // 전체 날짜 출력시 "NONE"
    if(!(await token_checker(req.body.jwtToken)))
    {
        res.status(401).send({ err : "접근 권한이 없습니다." });
        return;
    }

    const connection = await pool2.getConnection(async conn => conn);
    try {
    	const targetDate = new Date(listDate);
        if(!(listType >= 0 && listType <= 2)) throw err = 0;
        if(listDate != "NONE" && !(targetDate instanceof Date && !isNaN(targetDate))) throw err = 0;

        const param = [];
        let sql1 = "select cast(`reservation_id` as char) as `service_id`, `expect_pickup_time` as `pickup_time`, `hope_reservation_date` as `rev_date` "+ 
            "from `reservation` where `reservation_state_id`=? ";

        if (listType == 0) param.push(reservation_state.ready); // 운행 전
        else if (listType == 1) param.push(reservation_state.inProgress); // 운행 시작
        else param.push(reservation_state.complete); // 운행 종료

       	if(listDate != "NONE")
       	{
       		sql1 += "and `hope_reservation_date`=? ";
       		param.push(listDate);
       	}
       	sql1 += "order by `hope_reservation_date`;";
        
        const result1 = await connection.query(sql1, param);
        const data1 = result1[0];

        for(let i = 0; i < data1.length; i++) // 매니저 구하기
        {
            const sqlm = "select NM.`netsmanager_id` as `id`, NM.`netsmanager_number` as `number` from `reservation` as R, `car_dispatch`as D, `netsmanager` as NM " + 
                "where R.`reservation_id`=? and R.`reservation_id`=D.`reservation_id` and D.`netsmanager_number`=NM.`netsmanager_number`;";
            const sqlmr = await connection.query(sqlm, [data1[i].service_id]);
            data1[i].netsmanager = sqlmr[0];
        }
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
    if(!(await token_checker(req.body.jwtToken)))
    {
        res.status(401).send({ err : "접근 권한이 없습니다." });
        return;
    }

    const connection = await pool2.getConnection(async conn => conn);
    try {
    	// 서비스 정보
        const sql_service = "select cast(R.`reservation_id` as char) as `service_id`, `expect_pickup_time` as `pickup_time`, `pickup_address` as `pickup_address`, `hospital_address` as `hos_name`, `hope_reservation_date` as `rev_date`, " + 
            "`hope_hospital_arrival_time` as `hos_arrival_time`, `fixed_medical_time` as `hos_care_time`, `hope_hospital_departure_time` as `hos_depart_time`, `gowithmanager_name` as `gowithumanager`," + 
            "`reservation_state_id` as `reservation_state`, R.`user_number` as `customer_number`, U.`user_name` as `customer_name`, S.`service_kind` as `service_type` " + 
            "from `reservation` as R, `user` as U, `service_info` as S " + 
            "where R.`reservation_id`=? and R.`user_number`=U.`user_number` and R.`service_kind_id`=S.`service_kind_id`;";
        const result_service = await connection.query(sql_service, [service_id]);
        const data_service = result_service[0];
        if(data_service.length == 0) throw err = 0;

        // 서비스 상태정보
        const sql_prog = "select * from `service_progress` where `reservation_id`=?;";
        const result_prog = await connection.query(sql_prog, [service_id]);
        const data_prog = result_prog[0];
        if(data_prog.length == 0) throw err = 1;

        const sstate = data_prog[0].service_state_id;
        const sstate_time = [];
        sstate_time[service_state.pickup] = data_prog[0].real_pickup_time; // 픽업완료
        sstate_time[service_state.arrivalHos] = data_prog[0].real_hospital_arrival_time; // 병원도착
        sstate_time[service_state.carReady] = data_prog[0].real_return_hospital_arrival_time; // 귀가차량 병원도착
        sstate_time[service_state.goHome] = data_prog[0].real_return_start_time; // 귀가출발
        sstate_time[service_state.complete] = data_prog[0].real_service_end_time; // 서비스종료

        // 배차 (매니저 & 차량)
        const sqld = "select C.`car_id`, `car_number`, NM.`netsmanager_id`, NM.`netsmanager_number`, NM.`netsmanager_name`, " + 
                "`car_dispatch_number`, `departure_address`, `destination_address`, `expect_car_pickup_time` as `pickup_time`, `expect_car_terminate_service_time` as `terminate_time`, `car_move_direction_id` as `dire` " + 
                "from `reservation` as R, `car_dispatch`as D, `netsmanager` as NM, `car` as C " + 
                "where R.`reservation_id`=? and R.`reservation_id`=D.`reservation_id` and D.`netsmanager_number`=NM.`netsmanager_number` and D.`car_id`=C.`car_id`;";
        const sqldr = await connection.query(sqld, [service_id]);

        // 결제
        const sqlm = "select * from `payment` where `payment_type`=2 and `payment_state_id`=1 and `reservation_id`=?;";
        const sqlmr = await connection.query(sqlm, [service_id]);
        const isNeedExtraPay = (sqlmr[0].length > 0);

        const sqlm2 = "select `payment_method` from `payment` where `payment_type`=1 and `reservation_id`=?;";
        const sqlmr2 = await connection.query(sqlm2, [service_id]);
        if(sqlmr2[0].length == 0) throw err = 2;
        const payMethod = sqlmr2[0][0].payment_method;

        res.send({
            service_state: sstate,
            service_state_time: sstate_time,
            service: data_service[0],
            dispatch: sqldr[0],
            isNeedExtraPay: isNeedExtraPay,
            payMethod: payMethod,
        });
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(401).send({ err : "해당 서비스 정보가 존재하지 않습니다." });
        else if(err == 1) res.status(401).send({ err : "해당 서비스 진행정보가 존재하지 않습니다." });
        else if(err == 2) res.status(401).send({ err : "해당 서비스 결제정보가 존재하지 않습니다." });
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
    if(!(await token_checker(req.body.jwtToken)))
    {
        res.status(401).send({ err : "접근 권한이 없습니다." });
        return;
    }

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
    if(!(await token_checker(req.body.jwtToken)))
    {
        res.status(401).send({ err : "접근 권한이 없습니다." });
        return;
    }

    const connection = await pool2.getConnection(async conn => conn);
    try {
    	// 예약날짜 구하기
    	const sql_date = "select `hope_reservation_date` from `reservation` where `reservation_id`=?;"
    	const result_date = await connection.query(sql_date, [service_id]);
        const data_date = result_date[0];
        if(data_date.length == 0) throw err = 0;

        // 매니저 구하기 (승인된 휴가 날짜가 예약날짜를 포함하는 매니저 필터링)
        const revDate_obj = new Date(data_date[0].hope_reservation_date);
        const revDate = "" + revDate_obj.getFullYear() + "-" + (revDate_obj.getMonth()+1) + "-" + revDate_obj.getDate();
        const sql_man = "select `netsmanager_name` as `name`, `netsmanager_id` as `id`, `netsmanager_number` as `number` from `netsmanager` as M where " + 
			"not exists (select * from `manager_holiday` as H where M.`netsmanager_number`=H.`netsmanager_number` and `holiday_certified`=1 and `start_holiday_date`<=? and `end_holiday_date`>=?);";
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
    const dispatch_id = req.body.dispatch_id;
    const manager_number = req.body.manager_number;
    if(!(await token_checker(req.body.jwtToken)))
    {
        res.status(401).send({ err : "접근 권한이 없습니다." });
        return;
    }

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const spl = "update `car_dispatch` set `netsmanager_number`=? where `car_dispatch_number`=?;"
        const result = await connection.query(spl, [manager_number, dispatch_id]);
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
