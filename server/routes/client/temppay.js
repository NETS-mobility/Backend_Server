/*
=== 결제 완료시 아래의 코드를 추가 바랍니다.(알림 생성 코드)
const alarm = require("../../modules/setting_alarm");

const alarm_kind = require('../../config/alarm_kind');
const reciever = require('../../config/push_alarm_reciever');


const sql_alarm = 'select `netsmanager_id` '+
        'from `netsmanager` '+
        'where `netsmanager_number` =?;'
        
        const sql_res = await connection.query(sql_alarm, 1); 
        const data =  Object.values(sql_res[0][0]);
        if (data.length == 0) throw (err = 0);

        const netsmanagerId = data[0];
        alarm.set_alarm(reciever.manager, reservationId, alarm_kind.m_confirm_reservation, netsmanagerId);  // 매니저에게 예약 확정 알림 전송
        alarm.set_alarm(reciever.client, reservationId, alarm_kind.confirm_reservation, id);    // 고객 예약 확정 알림

*/