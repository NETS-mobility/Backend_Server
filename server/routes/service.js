const express = require('express');
const router = express.Router();

const jwt = require('../modules/jwt');
const pool = require('../modules/mysql');
const pool2 = require('../modules/mysql2');

const service_state = require('../config/service_state');


/* ===== 서비스 목록 조회 =====
 *
 * 현재 진행중이거나 완료된 서비스 목록을 반환합니다. (픽업날짜 기준 오름차순 정렬된 상태)
 * UI에서 서비스 상태 판단하는 방법은 다음과 같습니다.
 * (service_state, needExtraPay) (X - 무관)
 *   예약 확정          (1, X)
 *   서비스 진행 중     (2, X)
 *   추가요금 결제      (3, 1)
 *   서비스 종료        (3, 0)
 *
 * === http-method ===
 * post
 *
 * === client-input ===
 * jwtToken: 사용자 정보 jwt토큰 (문자열)
 * listType: 반환할 서비스 상태 선택
 *   0 - 준비 or 진행중
 *   1 - 완료
 *
 * === server-return ===
 * serviceList: 진행중인 서비스 리스트 [{
 *   service_type: 서비스 종류 (문자열 - 네츠 무브, 네츠 휠체어, 네츠 휠체어 플러스),  
 *   service_id: 서비스 번호,
 *   pickup_time: 픽업 예정날짜&시간 (Date 객체),
 *   pickup_address: 픽업 주소,
 *   hos_name: 병원명,
 *   hos_arrival_time: 희망병원 도착시간,
 *   hos_care_time: 진료/검사 예약시간,
 *   hos_depart_time: 귀가 출발시간,
 *   netsmanager: 네츠매니저 이름,
 *   car_number: 차량번호,
 *   gowithumanager: 동행매니저 이름,
 *   service_state: 서비스 진행상태,
 *   needExtraPay: 추가결제 필요여부
 * }]
 *
*/
router.post('/serviceList', async function (req, res, next) {
    const token = req.body.jwtToken;
    const listType = req.body.listType;

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const user_id = token_res.id; // 이용자 id

    let err_custom = false;
    let err_msg = "";

    const connection = await pool2.getConnection(async conn => conn);
    try {
        if(!(listType >= 0 && listType <= 1))
        {
            err_custom = true;
            err_msg = "잘못된 인자 전달";
        }

        let param = [user_id];
        let sql1 = "select S.`service_kind` as `service_type`, R.`reservation_id` as `service_id`, `expect_pickup_time` as `pickup_time`, `pickup_base_address` as `pickup_address`, " + 
            "`hospital_base_address` as `hos_name`, `hope_hospital_arrival_time` as `hos_arrival_time`, `fixed_medical_time` as `hos_care_time`, `hope_hospital_departure_time` as `hos_depart_time`, " + 
            "NM.`netsmanager_name` as `netsmanager`, C.`car_number` as `car_number`, `gowithmanager_name` as `gowithumanager`, " + 
            "`reservation_state_id` as `service_state`, P.`is_need_extra_payment` as `needExtraPay` " + 
            "from `reservation` as R, `service_info` as S, `netsmanager` as NM, `car` as C, `payment` as P " + 
            "where `user_id`=? and R.`service_kind_id`=S.`service_kind_id` and R.`netsmanager_id`=NM.`netsmanager_id` " + 
            "and R.`car_id`=C.`car_id` and R.`reservation_id`=P.`reservation_id` ";

        // 서비스 진행상태 분기점
        if(listType == 0)
        {
            sql1 += "and `reservation_state_id` in (?,?) ";
            param.push(service_state.ready, service_state.inProgress);
        }
        else 
        {
            sql1 += "and `reservation_state_id`=? ";
            param.push(service_state.complete);
        }
        
        sql1 += "order by `expect_pickup_time`;";
        const result1 = await connection.query(sql1, param);
        const data1 = result1[0];

        res.send(data1);
    }
    catch (err) {
        if(!err_custom)
        {
            err_msg = "서버 오류";
            console.error("err : " + err);
            throw err;
        }
        else err_msg = err.message;
        res.status(500).send({ err : err_msg });
    }
    finally {
        connection.release();
    }
});


/* ===== 서비스 상세보기 =====
 *
 * 서비스(예약) 1개의 정보를 반환합니다.
 * UI에서 서비스 상태 판단하는 방법은 '서비스 목록 조회' 서버페이지 것과 동일합니다.
 *
 * === http-method ===
 * post
 *
 * === client-input ===
 * service_id: 서비스 번호
 *
 * === server-return ===
 * // car: 차량정보 {
 * //   x: x좌표,
 * //   y: y좌표
 * // }
 * manager: 매니저 정보 {
 *   name: 이름,
 *   // job: 직업명,
 *   intro: 자기소개,
 *   tel: 전화번호,
 *   mention: 고객에게 전하는 말 (기본으로 설정된 내용)
 * }
 * // service_prog: 서비스 진도 (픽업완료, 병원도착, 귀가출발...)
 * // service_prog_nextime: 다음 서비스일정 시간
 * service: 서비스 정보 { 
 *   service_id: 서비스 번호,
 *   pickup_time: 픽업 예정날짜&시간 (Date 객체),
 *   pickup_address: 픽업 주소,
 *   hos_name: 병원명,
 *   hos_arrival_time: 희망병원 도착시간,
 *   hos_care_time: 진료/검사 예약시간,
 *   hos_depart_time: 귀가 출발시간,
 *   netsmanager: 네츠매니저 이름,
 *   car_number: 차량번호,
 *   gowithumanager: 동행매니저 이름,
 *   service_state: 서비스 진행상태,
 *   needExtraPay: 추가결제 필요여부
 * }
 * payment: 결제 정보 {
 *   charge: 요금,
 *   extraPay: 부가세
 * }
 *
 *
*/
router.post('/serviceDetail', async function (req, res, next) {
    const service_id = req.body.service_id;

    let err_custom = false;
    let err_msg = "";

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql_service = "select R.`reservation_id` as `service_id`, `expect_pickup_time` as `pickup_time`, `pickup_base_address` as `pickup_address`, `hospital_base_address` as `hos_name`, " + 
            "`hope_hospital_arrival_time` as `hos_arrival_time`, `fixed_medical_time` as `hos_care_time`, `hope_hospital_departure_time` as `hos_depart_time`, " + 
            "NM.`netsmanager_name` as `netsmanager`, C.`car_number` as `car_number`, `gowithmanager_name` as `gowithumanager`, " + 
            "`reservation_state_id` as `service_state`, P.`is_need_extra_payment` as `needExtraPay` " + 
            "from `reservation` as R, `netsmanager` as NM, `car` as C, `payment` as P " + 
            "where R.`reservation_id`=? and R.`car_id`=C.`car_id` and R.`netsmanager_id`=NM.`netsmanager_id` and R.`reservation_id`=P.`reservation_id`;";
        const result_service = await connection.query(sql_service, [service_id]);
        const data_service = result_service[0];

        if(data_service.length == 0)
        {
            err_custom = true;
            err_msg = "해당 서비스 정보가 존재하지 않습니다.";
        }

        // const sql_car = "select `car_number` from `reservation` as R, `car` as C where `reservation_id`=? and R.`car_id`=C.`car_id`;";
        // const result_car = await connection.query(sql_car, [service_id]);
        // const data_car = result_car[0];

        const sql_manager = "select `netsmanager_name` as `name`, `netsmanager_about_me` as `intro`, `netsmanager_phone` as `tel`, `netsmanager_notice` as `mention` " + 
            "from `reservation` as R, `netsmanager` as NM where `reservation_id`=? and R.`netsmanager_id`=NM.`netsmanager_id`;";
        const result_manager = await connection.query(sql_manager, [service_id]);
        const data_manager = result_manager[0];

        const sql_pay = "select `base_payment_amount` as `charge`, `extra_payment_amount` as `extraPay` " + 
            "from `reservation` as R, `payment` as P where R.`reservation_id`=? and R.`reservation_id`=P.`reservation_id`;";
        const result_pay = await connection.query(sql_pay, [service_id]);
        const data_pay = result_pay[0];
        
        res.send({
            manager: data_manager[0],
            service: data_service[0],
            payment: data_pay[0]
        });
    }
    catch (err) {
        if(!err_custom)
        {
            err_msg = "서버 오류";
            console.error("err : " + err);
            throw err;
        }
        else err_msg = err.message;
        res.status(500).send({ err : err_msg });
    }
    finally {
        connection.release();
    }
});


module.exports = router;
