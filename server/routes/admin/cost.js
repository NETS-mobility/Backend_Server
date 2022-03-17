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

        const sql2 = "select `company_time_start` as `start`, `company_time_end` as `end` from `company_time_schedule`;";
        const result2 = await connection.query(sql2, []);
        const data2 = result2[0];

        const sql3 = "select * from `manager_extra_pay` order by `extra_pay_id`;";
        const result3 = await connection.query(sql3, []);
        const data3 = result3[0];

        res.send({extra_cost: data1, extra_cost_night_time: data2[0], manager_extra_pay: data3});
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
    const {extra_cost, extra_cost_night_time, manager_extra_pay} = req.body;
    if(!(await token_checker(req.body.jwtToken)))
    {
        res.status(401).send({ err : "접근 권한이 없습니다." });
        return;
    }

    const connection = await pool2.getConnection(async conn => conn);
    try {
        await connection.beginTransaction();

        for(let i = 1; i <= 5; i++)
        {
            const sqlc = "update `extra_cost` set `extra_cost_unit_value`=?, `extra_cost_per_unit_value`=? where `extra_cost_kind_id`=?;";
            const sqlrc = await connection.query(sqlc, [extra_cost[i-1].extra_cost_unit_value, extra_cost[i-1].extra_cost_per_unit_value, i]);
            if(sqlrc[0].affectedRows == 0) throw err = 0;
        }

        const sqlc1 = "update `extra_cost` set `extra_cost_max_unit_value`=? where `extra_cost_kind_id`=4;";
        const sqlrc1 = await connection.query(sqlc1, [extra_cost[4-1].extra_cost_max_unit_value]);
        if(sqlrc1[0].affectedRows == 0) throw err = 0;
        
        for(let i = 6; i <= 7; i++)
        {
            const sqlc = "update `extra_cost` set `extra_cost_per_unit_value`=? where `extra_cost_kind_id`=?;";
            const sqlrc = await connection.query(sqlc, [extra_cost[i-1].extra_cost_per_unit_value, i]);
            if(sqlrc[0].affectedRows == 0) throw err = 0;
        }

        const sqlc2 = "update `company_time_schedule` set `company_time_start`=?, `company_time_end`=? where `company_time_kind_id`=1;";
        const sqlrc2 = await connection.query(sqlc2, [extra_cost_night_time.start, extra_cost_night_time.end]);
        if(sqlrc2[0].affectedRows == 0) throw err = 0;
        
        for(let i = 1; i <= 7; i++)
        {
            const sqlc = "update `manager_extra_pay` set `extra_pay_percentage`=? where `extra_pay_id`=?;";
            const sqlrc = await connection.query(sqlc, [manager_extra_pay[i-1].extra_pay_percentage, i]);
            if(sqlrc[0].affectedRows == 0) throw err = 0;
        }
        
        const sqlc3 = "update `manager_extra_pay` set `extra_pay_start_time`=?, `extra_pay_end_time`=? where `extra_pay_id`=2;";
        const sqlrc3 = await connection.query(sqlc3, [manager_extra_pay[2-1].extra_pay_start_time, manager_extra_pay[2-1].extra_pay_end_time]);
        if(sqlrc3[0].affectedRows == 0) throw err = 0;

        const sqlc4 = "update `manager_extra_pay` set `extra_pay_day_standard_time`=?, `extra_pay_week_standard_time`=? where `extra_pay_id`=1;";
        const sqlrc4 = await connection.query(sqlc4, [manager_extra_pay[1-1].extra_pay_day_standard_time, manager_extra_pay[1-1].extra_pay_week_standard_time]);
        if(sqlrc4[0].affectedRows == 0) throw err = 0;

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


// ===== 서비스 추가시간 반환 =====
router.post('/service/extratime', async function (req, res, next) {
    if(!(await token_checker(req.body.jwtToken)))
    {
        res.status(401).send({ err : "접근 권한이 없습니다." });
        return;
    }

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = "select * from `service_extratime` order by `extratime_id`;";
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


// ===== 서비스 추가시간 반환 =====
router.post('/service/extratime/setting', async function (req, res, next) {
    const {data} = req.body;
    if(!(await token_checker(req.body.jwtToken)))
    {
        res.status(401).send({ err : "접근 권한이 없습니다." });
        return;
    }

    const connection = await pool2.getConnection(async conn => conn);
    try {
        await connection.beginTransaction();

        for(let i = 1; i <= 5; i++)
        {
            const sqlc = "update `service_extratime` set `extratime_data`=? where `extratime_id`=?;";
            const sqlrc = await connection.query(sqlc, [data[i-1].extratime_data, i]);
            if(sqlrc[0].affectedRows == 0) throw err = 0;
        }

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
