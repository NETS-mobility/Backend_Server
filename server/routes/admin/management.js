const express = require('express');
const router = express.Router();

const pool = require('../../modules/mysql');
const pool2 = require('../../modules/mysql2');
const ssn_birth = require('../../modules/ssn_birth');
const upload = require('../../modules/fileupload');
const bcrypt = require('bcryptjs');

const bcrypt_option = require('../../config/bcrypt');
const uplPath = require('../../config/upload_path');
const saltRounds = bcrypt_option.saltRounds;


// ===== 고객 리스트 조회 =====
router.post('/customer', async function (req, res, next) {

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = "select `user_id` as `id`, `user_name` as `name`, `user_join_date` as `date` from `user`;";
        const result1 = await connection.query(sql1, []);
        res.send(result1[0]);
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 고객 상세 조회 =====
router.post('/customer/detail', async function (req, res, next) {
    const id = req.body.id;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = "select `user_id` as `id`, `user_name` as `name`, `user_join_date` as `date`, `user_phone` as `phone` from `user` where `user_id`=?;";
        const result1 = await connection.query(sql1, [id]);
        const data1 = result1[0];
        if(data1.length == 0) throw err = 0;
        res.send(data1[0]);
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(400).send({ err : "회원정보가 없습니다." });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 매니저 리스트 조회 =====
router.post('/manager', async function (req, res, next) {

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = "select `netsmanager_id` as `id`, `netsmanager_name` as `name`, `netsmanager_join_date` as `date` from `netsmanager`;";
        const result1 = await connection.query(sql1, []);
        res.send(result1[0]);
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 매니저 상세 조회 =====
router.post('/manager/detail', async function (req, res, next) {
    const id = req.body.id;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = "select `netsmanager_id` as `id`, `netsmanager_name` as `name`, `netsmanager_join_date` as `date`, `netsmanager_possible` as `available`, `netsmanager_picture_path` as `path_pic`, " +
            "`netsmanager_phone` as `phone`, `netsmanager_rrn` as `ssn`, `netsmanager_basic_salary` as `salary`, `netsmanager_rest_holiday` as `restDay` from `netsmanager` where `netsmanager_id`=?;";
        const result1 = await connection.query(sql1, [id]);
        const data1 = result1[0];
        if(data1.length == 0) throw err = 0;

        const sql2 = "select `netsmanager_certificate_name` as `name`, `certificate_obtention_date` as `obtention`, " + 
            "`certiicate_expiration_date` as `expiration`, `netsmanager_certificate_number` as `number` from `manager_certificate` where `netsmanager_id`=?;";
        const result2 = await connection.query(sql2, [id]);
        const data2 = result2[0];

        const sql3 = "select `start_holiday_date` as `start`, `end_holiday_date` as `end`, `holiday_certified` as `isOK` from `manager_holiday` where `netsmanager_id`=?;";
        const result3 = await connection.query(sql3, [id]);
        const data3 = result3[0];

        const now = new Date("2022-02-09");
        const sql4 = "select S.`service_kind` as `service_type`, `expect_pickup_time` as `pickup_time`, U.`user_name` as `customer_name`" + 
            "from `reservation` as R, `service_info` as S, `user` as U " + 
            "where `netsmanager_id`=? and R.`service_kind_id`=S.`service_kind_id` and R.`user_id`=U.`user_id` and `expect_pickup_time` >= ? " + 
            "order by `pickup_time`;";
        const result4 = await connection.query(sql4, [id, now]);
        const data4 = result4[0];

        res.send({
            manager: {
                id: data1[0].id,
                name: data1[0].name,
                date: data1[0].date,
                phone: data1[0].phone,
                birth: ssn_birth(data1[0].ssn),
                salary: data1[0].salary,
                available: data1[0].available,
                path_pic: data1[0].path_pic
            },
            certificate: data2,
            vacation_restDay: data1[0].restDay,
            vacation: data3,
            schedule: data4
        });
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(400).send({ err : "회원정보가 없습니다." });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 매니저 상세 조회 - 개인정보 변경 =====
router.post('/manager/detail/changeInfo', async function (req, res, next) {
    const {id, phone, available, salary} = req.body;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const spl = "update `netsmanager` set `netsmanager_phone`=?, `netsmanager_possible`=?, `netsmanager_basic_salary`=? where `netsmanager_id`=?;"
        const result = await connection.query(spl, [phone, available, salary, id]);
        if(result[0].affectedRows == 0) throw err = 0;
        res.status(200).send();
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(400).send({ err : "개인정보 변경실패" });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 매니저 상세 조회 - 자격증 등록 =====
router.post('/manager/detail/addCertificate', async function (req, res, next) {
    const {id, cert_name, cert_num, cert_obtainDate, cert_expireDate} = req.body;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const spl = "insert into `manager_certificate` values (?,?,?,?,?);"
        await connection.query(spl, [id, cert_name, cert_num, cert_obtainDate, cert_expireDate]);
        res.status(200).send();
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 매니저 상세 조회 - 자격증 삭제 =====
router.post('/manager/detail/deleteCertificate', async function (req, res, next) {
    const {id, cert_num} = req.body;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const spl = "delete from `manager_certificate` where `netsmanager_id`=? and `netsmanager_certificate_number`=?;"
        await connection.query(spl, [id, cert_num]);
        res.status(200).send();
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 매니저 상세 조회 - 휴가 승인 =====
router.post('/manager/detail/admitVacation', async function (req, res, next) {
    const {id, start, end} = req.body;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const spl = "update `manager_holiday` set `holiday_certified`=1 where `netsmanager_id`=? and `start_holiday_date`=? and `end_holiday_date`=?;"
        const result = await connection.query(spl, [id, start, end]);
        if(result[0].affectedRows == 0) throw err = 0;
        res.status(200).send();
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(400).send({ err : "휴가 승인 실패" });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 매니저 상세 조회 - 휴가 삭제 =====
router.post('/manager/detail/deleteVacation', async function (req, res, next) {
    const {id, start, end} = req.body;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const spl = "delete from `manager_holiday` where `netsmanager_id`=? and `start_holiday_date`=? and `end_holiday_date`=?;"
        await connection.query(spl, [id, start, end]);
        res.status(200).send();
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 매니저 상세 조회 - 매니저 삭제 =====
router.post('/manager/detail/deleteManager', async function (req, res, next) {
    const id = req.body.id;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const spl = "delete from `netsmanager` where `netsmanager_id`=?;"
        await connection.query(spl, [id]);
        res.status(200).send();
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 관리자 리스트 조회 =====
router.post('/admin', async function (req, res, next) {

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = "select `admin_id` as `id`, `admin_name` as `name`, `admin_join_date` as `date` from `administrator`;";
        const result1 = await connection.query(sql1, []);
        res.send(result1[0]);
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 관리자 상세 조회 =====
router.post('/admin/detail', async function (req, res, next) {
    const id = req.body.id;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = "select `admin_id` as `id`, `admin_name` as `name`, `admin_join_date` as `date`, `admin_phone` as `phone`, " + 
            "`admin_rrn` as `ssn`, `admin_authority` as `level`, `admin_picture_path` as `path_pic` from `administrator` where `admin_id`=?;";
        const result1 = await connection.query(sql1, [id]);
        const data1 = result1[0];
        if(data1.length == 0) throw err = 0;
        res.send({
            id: data1[0].id,
            name: data1[0].name,
            date: data1[0].date,
            phone: data1[0].phone,
            birth: ssn_birth(data1[0].ssn),
            level: data1[0].level,
            path_pic: data1[0].path_pic
        });
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(400).send({ err : "회원정보가 없습니다." });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 관리자 상세 조회 - 관리자 삭제 =====
router.post('/admin/detail/deleteAdmin', async function (req, res, next) {
    const id = req.body.id;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const spl = "delete from `administrator` where `admin_id`=?;"
        await connection.query(spl, [id]);
        res.status(200).send();
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 관리자 등록 =====
router.post('/admin/addAdmin', (upload(uplPath.admin_picture)).single('file') ,async function (req, res, next) {
    const file = req.file;
    const {id, password, name, phone, ssn, level} = JSON.parse(req.body.json);

    let path_picture;
    if(file !== undefined) path_picture = uplPath.admin_picture + file.filename; // 업로드 파일 경로

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const now = new Date();
        const hashedPW = await bcrypt.hash(password, saltRounds);

        const spl = "insert into `administrator` values (?,?,?,?,?,?,?,?);"
        await connection.query(spl, [id, hashedPW, name, phone, ssn, path_picture, level, now]);
        res.status(200).send();
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 차량 리스트 조회 =====
router.post('/car', async function (req, res, next) {

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = "select `car_id` as `id`, `car_number` as `number`, `car_joined_date` as `date`, `netsmanager_name` as `manager_name` " + 
            "from `car` as C, `netsmanager` as M where C.`netsmanager_id`=M.`netsmanager_id`;";
        const result1 = await connection.query(sql1, []);
        res.send(result1[0]);
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 차량 수리 리스트 조회 =====
router.post('/car/:idx/repair', async function (req, res, next) {
    const idx = req.params.idx;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = "select `car_repair_number` as `number`, `car_repair_start_date` as `start`, `car_repair_end_date` as `end`, `netsmanager_name` as `manager_name` " + 
            "from `car_repair` as C, `netsmanager` as M where `car_id`=? and C.`netsmanager_id`=M.`netsmanager_id`;";
        const result1 = await connection.query(sql1, [idx]);
        res.send(result1[0]);
    }
    catch (err) {
        console.error("err : " + err);
        res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 차량 등록 =====
router.post('/car/addCar', async function (req, res, next) {
    const { number, type, manager_id, garage } = req.body;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const now = new Date();
        const sql1 = "insert into `car` (`car_number`,`car_kind`,`netsmanager_id`,`garage_detail_address`, " + 
            "`car_joined_date`,`car_state_id`) values(?,?,?,?,?,1);";
        await connection.query(sql1, [number, type, manager_id, garage, now]);
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


module.exports = router;
