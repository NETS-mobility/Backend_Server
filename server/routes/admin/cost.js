const express = require('express');
const router = express.Router();

const pool = require('../../modules/mysql');
const pool2 = require('../../modules/mysql2');
const token_checker = require('../../modules/admin_token');


// ===== 서비스 요금 조회 ====
router.post('/service', async function (req, res, next) {
    if(!(await token_checker(req.body.jwtToken)))
    {
        res.status(401).send({ err : "접근 권한이 없습니다." });
        return;
    }

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = "select `service_kind_id` as `id`, `service_kind` as `name`, `service_base_move_distance` as `dist`, `service_base_hospital_gowith_time` as `time`, `service_base_cost` as `cost` from `service_info`;";
        const result1 = await connection.query(sql1, []);
        const data1 = result1[0];
        res.send(data1);
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 서비스 요금 설정 ====
router.post('/service/setting', async function (req, res, next) {
    const { id, cost } = req.body;
    if(!(await token_checker(req.body.jwtToken)))
    {
        res.status(401).send({ err : "접근 권한이 없습니다." });
        return;
    }

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = "update `service_info` set `service_base_cost`=? where `service_kind_id`=?;";
        const result1 = await connection.query(sql1, [cost, id]);
        if(result1[0].affectedRows == 0) throw err = 0;
        res.send();
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(500).send({ err : "변경 실패!" });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 추가요금 정보 반환 =====
/*
DB - table `extra_cost`
(1, "이동거리 추가요금", "km", 5, 11000, 0)
(2, "동행 추가요금 (예약 시)", "min", 30, 11000, 0)
(3, "동행 초과요금 (초과 시)", "min", 20, 9000, 0)
(4, "승차 지연 대기요금", "min", 10, 5500, 0)
(5, "배차 지연 환불", "min", 20, 9000, 0)
심야할증, 주말할증, 매니저 추가수당은 추후 추가
*/
router.post('/extra', async function (req, res, next) {
    if(!(await token_checker(req.body.jwtToken)))
    {
        res.status(401).send({ err : "접근 권한이 없습니다." });
        return;
    }

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = "select * from `extra_cost` order by `extra_cost_kind_id`;";
        const result1 = await connection.query(sql1, []);
        const data1 = result1[0];

        const sql2 = "select * from `service_info` order by `service_kind_id`;";
        const result2 = await connection.query(sql2, []);
        const data2 = result2[0];

        res.send({
            extra_cost: {
                movement_cost: {
                    unit: data1[0].extra_cost_unit_value,
                    value: data1[0].extra_cost_per_unit_value
                },
                accompany_extra_cost: {
                    unit: data1[1].extra_cost_unit_value,
                    value: data1[1].extra_cost_per_unit_value
                },
                accompany_over_cost: {
                    unit: data1[2].extra_cost_unit_value,
                    value: data1[2].extra_cost_per_unit_value
                },
                car_delay_cost: {
                    unit: data1[3].extra_cost_unit_value,
                    value: data1[3].extra_cost_per_unit_value
                },
                matching_delay_refund: {
                    unit: data1[4].extra_cost_unit_value,
                    value: data1[4].extra_cost_per_unit_value
                }
            },
            service_info: {
                nets_wheel: {
                    base_dist: data2[1].service_base_move_distance,
                    base_time: data2[1].service_base_hospital_gowith_time
                },
                nets_wheel_plus: {
                    base_dist: data2[2].service_base_move_distance,
                    base_time: data2[2].service_base_hospital_gowith_time
                }
            }
        });
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 추가요금 설정 =====
router.post('/extra/setting', async function (req, res, next) {
    const {movement_cost, accompany_extra_cost, accompany_over_cost, car_delay_cost, matching_delay_refund} = req.body.extra_cost;
    if(!(await token_checker(req.body.jwtToken)))
    {
        res.status(401).send({ err : "접근 권한이 없습니다." });
        return;
    }

    const connection = await pool2.getConnection(async conn => conn);
    try {
        await connection.beginTransaction();

        const sql1 = "update `extra_cost` set `extra_cost_unit_value`=?, `extra_cost_per_unit_value`=? where `extra_cost_kind_id`=1;";
        const result1 = await connection.query(sql1, [movement_cost.unit, movement_cost.value]);
        if(result1[0].affectedRows == 0) throw err = 0;

        const sql2 = "update `extra_cost` set `extra_cost_unit_value`=?, `extra_cost_per_unit_value`=? where `extra_cost_kind_id`=2;";
        const result2 = await connection.query(sql2, [accompany_extra_cost.unit, accompany_extra_cost.value]);
        if(result2[0].affectedRows == 0) throw err = 0;

        const sql3 = "update `extra_cost` set `extra_cost_unit_value`=?, `extra_cost_per_unit_value`=? where `extra_cost_kind_id`=3;";
        const result3 = await connection.query(sql3, [accompany_over_cost.unit, accompany_over_cost.value]);
        if(result3[0].affectedRows == 0) throw err = 0;

        const sql4 = "update `extra_cost` set `extra_cost_unit_value`=?, `extra_cost_per_unit_value`=? where `extra_cost_kind_id`=4;";
        const result4 = await connection.query(sql4, [car_delay_cost.unit, car_delay_cost.value]);
        if(result4[0].affectedRows == 0) throw err = 0;

        const sql5 = "update `extra_cost` set `extra_cost_unit_value`=?, `extra_cost_per_unit_value`=? where `extra_cost_kind_id`=5;";
        const result5 = await connection.query(sql5, [matching_delay_refund.unit, matching_delay_refund.value]);
        if(result5[0].affectedRows == 0) throw err = 0;

        await connection.commit();
        res.send();
    }
    catch (err) {
        await connection.rollback();
        console.error("err : " + err);
        if(err == 0) res.status(500).send({ err : "변경 실패!" });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


module.exports = router;
