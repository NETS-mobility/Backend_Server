const express = require('express');
const { param } = require('..');
const { user } = require('../../config/database');
const router = express.Router();
const {Post, User} = require('../client')

const jwt = require('../../modules/jwt');
const pool2 = require('../../modules/mysql2');
const token = require('../../config/token');

// ===== 알람 조회 =====


router.post('', async function (req, res, next) {

    const token = req.body.jwtToken;
    const listType = req.params.listType;

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const user_id = token_res.id; // 이용자 id

    const connection = await pool2.getConnection(async conn => conn);
    
    try {
        let param = [user_id];

        const sql = "select * from customer_alarm;";
                    "select u.'user_name', ca.'alarm_kind', ca.'alarm_content', r.'fixed_medical_time'" +
                    "from 'customer_alarm' as ca " +
                    "left join reservation as r " +
                    "on ca.'user_id' = r.'user_id'" +
                    "left join user as u" +
                    "on r.'user_id' = u.'user_id'" +
                    "where r.user_id = ?" +
                    "order by ca.'alarm_id' as desc;";
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
});

// ===== 매칭 완료 =====
/*
    1. 결제 요청
    2. 결제 독촉
    3. 예약 취소
*/
function request_pay() {
    
    // 토큰에서 서비스 번호 추출(가능하다면 예약 일정과 픽업 시간도)
    token;

    const text = "네츠서비스가 매칭되었습니다." +
    "예약 확정을 위해 결제 부탁드립니다." +
    "1시간 이내에 결제되지 않을 경우 예약이 취소될 수 있습니다. "+
    "서비스번호: " + service_number +
    "예약일정:" + reservation_date +
    "픽업 예정시간: " + pick_up_time;

    return text;
}
function pay_hurry() {
    // 토큰에서 서비스 번호 추출(가능하다면 예약 일정과 픽업 시간도)
    token;

    const text = "네츠서비스가 매칭되었습니다." +
    "예약 확정을 위해 결제 부탁드립니다." +
    "30분 이내에 결제되지 않을 경우 예약이 취소될 수 있습니다. "+
    "서비스번호: " + service_number +
    "예약일정: " + reservation_date +
    "픽업 예정시간: " + pick_up_time;

    return text;
}
function reservation_delete() {
    // 토큰에서 서비스 번호 추출(가능하다면 예약 일정과 픽업 시간도)
    token;
    
    const text = "결제시간 초과로 예약이 취소되었습니다." + 
    "서비스번호: " + service_number +
    "예약일정: " + reservation_date +
    "픽업 예정시간: " + pick_up_time;
    "고객님의 쾌유와 가족의 건강을 기원합니다."

    return text;
}

setTimeout(request_pay, 0);
setTimeout(pay_hurry, 60);
setTimeout(reservation_delete, 90);
// ===== 결제 완료 =====
function pay_success() {
    // 토큰에서 서비스 번호 추출(가능하다면 예약 일정과 픽업 시간도)
    token;
    
    const text = "네츠 예약이 확정되었습니다." + 
    "서비스번호: " + service_number +
    "예약일정: " + reservation_date +
    "픽업 예정시간: " + pick_up_time + 
    "배차 차량번호: " + car_id +
    "네츠 매니저: " + manager_name +
    "네츠 매니저가 예약 확인을 위해 전화드릴 예정입니다." +
    "예약 확정 후, 코로나 의심 증상이 있거나 확진자 접촉시 고객센터로 연락해주시기 바랍니다." + 
    "고객님의 쾌유를 기원합니다.";

    return text;
}

// ===== 동행 완료 =====
function service_success() {

    const servey_url = "https://forms.gle/QWoiutcZPYUwFZ697";

    // 토큰에서 서비스 번호 추출(가능하다면 예약 일정과 픽업 시간도)
    token;
    
    const text = user_name +"고객님 동행 상황 보고" +
                "네츠 서비스 내용" + service_type + // 서비스 내용을 타입으로 해도 되는지?
                "첨부된 사진" + 
                picture_path +  // TODO: 사진 연결
                "[오늘 동행은 어떠셨을까요?]" +
                "서비스 품질 개선을 위해 고객님의 의견을 듣고자 합니다." + 
                "잠시 시간을 허락하시어 설문해 주신다면 편안하고 안전한 동행을 위해 더 나은 서비스로 노력하겠습니다." +
                "고객님의 쾌유와 가족의 건강을 기원합니다." +
                "네츠 고객 감동실 드림" +
                servey_url;

    return text;
}

// ===== 추가 요금 =====
function request_extra_cost() {
    // 토큰에서 서비스 번호 추출(가능하다면 예약 일정과 픽업 시간도)
    token;
    
    const text = "병원 동행 서비스 시간이 초과되어 추가요금 결제 부탁드립니다." +
                "서비스번호: " + service_number +
                "최초 예약시간: " + origin_service_time +
                "실제 서비스 시간: " + real_service_time + 
                "초과 시간: " + over_time +
                "초과 요금: " + over_cost;

    return text;
}
// ===== 예약 시간 =====

// ===== 픽업 지각 =====
function late_pickup() {
    // 토큰에서 서비스 번호 추출(가능하다면 예약 일정과 픽업 시간도)
    token;
    
    const text = "네츠 차량 픽업이 20분이상" +
                "서비스번호: " + service_number +
                "픽업 시간: " + pick_up_time + 
                "고객 성함: " + user_name +
                "고객 전화: " + user_phone +
                "보호자 성함: " + protector_name+
                "보호자 전화: " + protector_phone+
                "네츠 매니저: " + manager_name;
    return text;
}

// ===== 고객 지연 =====
function request_user_late_cost() {
    // 토큰에서 서비스 번호 추출(가능하다면 예약 일정과 픽업 시간도)
    token;

    wait_time = real_start_time-reservation_time;
    
    const text = "대기요금이 발생하여 결제 부탁드립니다." +
                "서비스번호: " + service_number +
                "대기 시간: " + wait_time +
                "대기 요금: " + wait_cost;
    return text;
}


// ===== 동행 시간 =====


// ===== 매니저의 버튼 push =====

  module.exports = router;