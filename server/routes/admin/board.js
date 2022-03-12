const express = require('express');
const router = express.Router();

const pool = require('../../modules/mysql');
const pool2 = require('../../modules/mysql2');


// ===== 매니저 공지사항 - 목록 조회 =====
router.post('/manager', async function (req, res, next) {

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = "select `post_id` as `id`, `post_title` as `title`, `post_date` as `date` from `manager_notice` order by `post_id`;";
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


// ===== 매니저 공지사항 - 내용 조회 =====
router.post('/manager/read/:idx', async function (req, res, next) {
    const idx = req.params.idx;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = "select `post_id` as `id`, `post_title` as `title`, `post_date` as `date`, `post_content` as `content`, " + 
            "`view_number` as `view`, `post_writer_id` as `writer_id` from `manager_notice` where `post_id`=?;";
        const result1 = await connection.query(sql1, [idx]);
        const data1 = result1[0];
        if(data1.length == 0) throw err = 0;
        res.send(data1[0]);
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(500).send({ err : "해당 게시글을 불러올 수 없습니다." });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 매니저 공지사항 - 작성 =====
router.post('/manager/write', async function (req, res, next) {
    const { title, writer_id, content } = req.body;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const now = new Date();
        const sql1 = "insert into `manager_notice` (`post_title`,`post_writer_id`,`post_content`,`post_date`,`view_number`,`is_end_post`,`admin_number`) values(?,?,?,?,0,0,?);";
        await connection.query(sql1, [title, writer_id, content, now, writer_id]);
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


// ===== 매니저 공지사항 - 편집 =====
router.post('/manager/edit', async function (req, res, next) {
    const { title, id, content } = req.body;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = "update `manager_notice` set `post_title`=?,`post_content`=? where `post_id`=?;";
        const result1 = await connection.query(sql1, [title, content, id]);
        if(result1[0].affectedRows == 0) throw err = 0;
        res.status(200).send();
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(500).send({ err : "편집 실패!" });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 매니저 공지사항 - 삭제 =====
router.post('/manager/delete', async function (req, res, next) {
    const { id } = req.body;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const now = new Date();
        const sql1 = "delete from `manager_notice` where `post_id`=?;";
        await connection.query(sql1, [id]);
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


// ===== 고객 공지사항 - 목록 조회 =====
router.post('/customer', async function (req, res, next) {

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = "select `post_id` as `id`, `post_title` as `title`, `post_date` as `date` from `customer_notice` order by `post_id`;";
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


// ===== 고객 공지사항 - 내용 조회 =====
router.post('/customer/read/:idx', async function (req, res, next) {
    const idx = req.params.idx;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = "select `post_id` as `id`, `post_title` as `title`, `post_date` as `date`, `post_content` as `content`, " + 
            "`view_number` as `view`, `post_writer_id` as `writer_id` from `customer_notice` where `post_id`=?;";
        const result1 = await connection.query(sql1, [idx]);
        const data1 = result1[0];
        if(data1.length == 0) throw err = 0;
        res.send(data1[0]);
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(500).send({ err : "해당 게시글을 불러올 수 없습니다." });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 고객 공지사항 - 작성 =====
router.post('/customer/write', async function (req, res, next) {
    const { title, writer_id, content } = req.body;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const now = new Date();
        const sql1 = "insert into `customer_notice` (`post_title`,`post_writer_id`,`post_content`,`post_date`,`view_number`,`is_end_post`,`admin_number`) values(?,?,?,?,0,0,?);";
        await connection.query(sql1, [title, writer_id, content, now, writer_id]);
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


// ===== 고객 공지사항 - 편집 =====
router.post('/customer/edit', async function (req, res, next) {
    const { title, id, content } = req.body;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const sql1 = "update `customer_notice` set `post_title`=?,`post_content`=? where `post_id`=?;";
        const result1 = await connection.query(sql1, [title, content, id]);
        if(result1[0].affectedRows == 0) throw err = 0;
        res.status(200).send();
    }
    catch (err) {
        console.error("err : " + err);
        if(err == 0) res.status(500).send({ err : "편집 실패!" });
        else res.status(500).send({ err : "서버 오류" });
    }
    finally {
        connection.release();
    }
});


// ===== 고객 공지사항 - 삭제 =====
router.post('/customer/delete', async function (req, res, next) {
    const { id } = req.body;

    const connection = await pool2.getConnection(async conn => conn);
    try {
        const now = new Date();
        const sql1 = "delete from `customer_notice` where `post_id`=?;";
        await connection.query(sql1, [id]);
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
