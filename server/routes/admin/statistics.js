const express = require('express');
const router = express.Router();

const pool = require('../../modules/mysql');
const pool2 = require('../../modules/mysql2');


// ===== 서비스 통계 조회 =====
router.post('/service', async function (req, res, next) {
    const start = req.body.start;
    const end = req.body.end;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = "select count(*) as `cnt` from `reservation` where `expect_pickup_time`>=? and `expect_pickup_time`<=?;";
        const result1 = await connection.query(sql1, [start, end]);
        const data1 = result1[0];

        const sql2 = "select count(*) as `cnt` from `reservation` where `expect_pickup_time`>=? and `expect_pickup_time`<=? and `reservation_state_id`=3;";
        const result2 = await connection.query(sql2, [start, end]);
        const data2 = result2[0];

        const sql3 = "select count(*) as `cnt` from `reservation` where `expect_pickup_time`>=? and `expect_pickup_time`<=? and `reservation_state_id`=4;";
        const result3 = await connection.query(sql3, [start, end]);
        const data3 = result3[0];

        const sql4_1 = "select sum(`base_payment_amount`) as `sales` from `payment` where `complete_base_payment_date`>=? and `complete_base_payment_date`<=?;";
        const result4_1 = await connection.query(sql4_1, [start, end]);
        const data4_1 = result4_1[0];
        const sql4_2 = "select sum(`extra_payment_amount`) as `sales` from `payment` where `complete_extra_payment_date`>=? and `complete_extra_payment_date`<=?;";
        const result4_2 = await connection.query(sql4_2, [start, end]);
        const data4_2 = result4_2[0];

        const sql5 = "select count(*) as `cnt` from `user` where `user_join_date`>=? and `user_join_date`<=?;";
        const result5 = await connection.query(sql5, [start, end]);
        const data5 = result5[0];

        const sql6 = "select sum(`real_service_move_distance`) as `sum`, avg(`real_service_move_distance`) as `avg` from `service_progress` where `real_service_end_time`>=? and `real_service_end_time`<=?;";
        const result6 = await connection.query(sql6, [start, end]);
        const data6 = result6[0];

        const sql7 = "select sum(`real_service_time`) as `sum`, avg(`real_service_time`) as `avg` from `service_progress` where `real_service_end_time`>=? and `real_service_end_time`<=?;";
        const result7 = await connection.query(sql7, [start, end]);
        const data7 = result7[0];

        const sql8 = "select `hospital_base_address` as `name`, count(`hospital_base_address`) as `cnt` from `reservation` where `expect_pickup_time`>=? and `expect_pickup_time`<=? and `reservation_state_id`=3 " + 
            "group by `hospital_base_address` order by `cnt` desc;";
        const result8 = await connection.query(sql8, [start, end]);
        const data8 = result8[0];

        res.send({
            reservation_count: data1[0].cnt,
            service_count: data2[0].cnt,
            cancel_count: data3[0].cnt,
            sales: Number(data4_1[0].sales) + Number(data4_2[0].sales),
            customer_new: data5[0].cnt,
            total_distance: data6[0],
            total_time: data7[0],
            rank_hospital: data8
        });
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


module.exports = router;
