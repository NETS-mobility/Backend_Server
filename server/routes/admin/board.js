const express = require("express");
const router = express.Router();
const fs = require("fs");

const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");
const token_checker = require("../../modules/admin_token");
const upload = require("../../modules/fileupload");
const date_to_string = require("../../modules/date_to_string");
const uplPath = require("../../config/upload_path");
const logger = require("../../config/logger");

// ===== 매니저 공지사항 - 목록 조회 =====
router.post("/manager", async function (req, res, next) {
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 =
      "select `post_id` as `id`, `post_title` as `title`, `post_date` as `date` from `manager_notice` order by `post_id`;";
    const result1 = await connection.query(sql1, []);
    res.send(result1[0]);
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 매니저 공지사항 - 내용 조회 =====
router.post("/manager/read/:idx", async function (req, res, next) {
  const idx = req.params.idx;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 =
      "select `post_id` as `id`, `post_title` as `title`, `post_date` as `date`, `post_content` as `content`, " +
      "`view_number` as `view`, `post_writer_id` as `writer_id` from `manager_notice` where `post_id`=?;";
    const result1 = await connection.query(sql1, [idx]);
    const data1 = result1[0];
    if (data1.length == 0) throw (err = 0);
    res.send(data1[0]);
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0)
      res.status(500).send({ err: "해당 게시글을 불러올 수 없습니다." });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});

// ===== 매니저 공지사항 - 작성 =====
router.post("/manager/write", async function (req, res, next) {
    const { title, content, jwtToken } = req.body;

    const connection = await pool2.getConnection(async (conn) => conn);
    try {
      await connection.beginTransaction();

      if (!(await token_checker(jwtToken))) throw (err = 0);
      const token_res = await jwt.verify(jwtToken);
      const writer_id = token_res.num;

      const now = date_to_string(new Date());
      const sql1 =
        "insert into `manager_notice` (`post_title`,`post_writer_id`,`post_content`,`post_date`,`view_number`,`is_end_post`,`admin_number`) values(?,?,?,?,0,0,?);";
      const result1 = await connection.query(sql1, [
        title,
        writer_id,
        content,
        now,
        writer_id,
      ]);
      const post_id = result1[0].insertId;

      /*for (var i = 0; i < req.files.length; i++) {
        const filepath = uplPath.manager_notice_file + files[i].filename;
        const sql2 =
          "insert into `manager_notice_file` (`post_id`,`file_path`,`file_name`) values(?,?,?);";
        await connection.query(sql2, [
          post_id,
          filepath,
          files[i].originalname,
        ]);
      }*/

      await connection.commit();
      res.send({post_id: post_id});
    } catch (err) {
      await connection.rollback();
      /*for (var i = 0; i < req.files.length; i++) {
        fs.unlinkSync(
          "./public" + uplPath.manager_notice_file + files[i].filename
        );
      }*/

      logger.error(__filename + " : " + err);
      if (err == 0) res.status(401).send({ err: "접근 권한이 없습니다." });
      else res.status(500).send({ err: "오류-" + err });
      // else res.status(500).send({ err : "서버 오류" });
    } finally {
      connection.release();
    }
  }
);

// ===== 매니저 공지사항 - 이미지 업로드 =====
router.post(
  "/manager/upload/files",
  upload(uplPath.manager_notice_file).array("files"),
  async function (req, res, next) {
    const files = req.files;
    const { post_id } = JSON.parse(req.body.json);

    const connection = await pool2.getConnection(async (conn) => conn);
    try {
      await connection.beginTransaction();

      for (var i = 0; i < req.files.length; i++) {
        const filepath = uplPath.manager_notice_file + files[i].filename;
        const sql2 =
          "insert into `manager_notice_file` (`post_id`,`file_path`,`file_name`) values(?,?,?);";
        await connection.query(sql2, [
          post_id,
          filepath,
          files[i].originalname,
        ]);
      }

      await connection.commit();
      res.send();
    } catch (err) {
      await connection.rollback();
      for (var i = 0; i < req.files.length; i++) {
        fs.unlinkSync(
          "./public" + uplPath.manager_notice_file + files[i].filename
        );
      }

      logger.error(__filename + " : " + err);
      if (err == 0) res.status(401).send({ err: "접근 권한이 없습니다." });
      else res.status(500).send({ err: "오류-" + err });
      // else res.status(500).send({ err : "서버 오류" });
    } finally {
      connection.release();
    }
  }
);

// ===== 매니저 공지사항 - 편집 =====
router.post("/manager/edit", async function (req, res, next) {
  const { title, id, content } = req.body;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    // 이전 파일 삭제
    const sql2 =
      "select `file_path` from `manager_notice_file` where `post_id`=?;";
    const result2 = await connection.query(sql2, [id]);
    const data2 = result2[0];

    for (var i = 0; i < data2.length; i++) {
      const path = "./public" + data2[i].file_path;
      if (fs.existsSync(path)) fs.unlinkSync(path);
    }

    const sql2_2 = "delete from `manager_notice_file` where `post_id`=?;";
    await connection.query(sql2_2, [id]);

    // 글 변경
    const sql1 =
      "update `manager_notice` set `post_title`=?,`post_content`=? where `post_id`=?;";
    const result1 = await connection.query(sql1, [title, content, id]);
    if (result1[0].affectedRows == 0) throw (err = 0);
    res.status(200).send();
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0) res.status(500).send({ err: "편집 실패!" });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});

// ===== 매니저 공지사항 - 삭제 =====
router.post("/manager/delete", async function (req, res, next) {
  const { id } = req.body;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    // 이전 파일 삭제
    const sql2 =
      "select `file_path` from `manager_notice_file` where `post_id`=?;";
    const result2 = await connection.query(sql2, [id]);
    const data2 = result2[0];

    for (var i = 0; i < data2.length; i++) {
      const path = "./public" + data2[i].file_path;
      if (fs.existsSync(path)) fs.unlinkSync(path);
    }

    const sql1 = "delete from `manager_notice` where `post_id`=?;";
    await connection.query(sql1, [id]);

    res.send();
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 고객 공지사항 - 목록 조회 =====
router.post("/customer", async function (req, res, next) {
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 =
      "select `post_id` as `id`, `post_title` as `title`, `post_date` as `date` from `customer_notice` order by `post_id`;";
    const result1 = await connection.query(sql1, []);
    res.send(result1[0]);
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 고객 공지사항 - 내용 조회 =====
router.post("/customer/read/:idx", async function (req, res, next) {
  const idx = req.params.idx;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 =
      "select `post_id` as `id`, `post_title` as `title`, `post_date` as `date`, `post_content` as `content`, " +
      "`view_number` as `view`, `post_writer_id` as `writer_id` from `customer_notice` where `post_id`=?;";
    const result1 = await connection.query(sql1, [idx]);
    const data1 = result1[0];
    if (data1.length == 0) throw (err = 0);
    res.send(data1[0]);
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0)
      res.status(500).send({ err: "해당 게시글을 불러올 수 없습니다." });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});

// ===== 고객 공지사항 - 작성 =====
router.post("/customer/write", async function (req, res, next) {
    const { title, content, jwtToken } = req.body;

    const connection = await pool2.getConnection(async (conn) => conn);
    try {
      await connection.beginTransaction();

      if (!(await token_checker(jwtToken))) throw (err = 0);
      const token_res = await jwt.verify(jwtToken);
      const writer_id = token_res.num;

      const now = date_to_string(new Date());
      const sql1 =
        "insert into `customer_notice` (`post_title`,`post_writer_id`,`post_content`,`post_date`,`view_number`,`is_end_post`,`admin_number`) values(?,?,?,?,0,0,?);";
      const result1 = await connection.query(sql1, [
        title,
        writer_id,
        content,
        now,
        writer_id,
      ]);
      const post_id = result1[0].insertId;

      /*for (var i = 0; i < req.files.length; i++) {
        const filepath = uplPath.customer_notice_file + files[i].filename;
        const sql2 =
          "insert into `customer_notice_file` (`post_id`,`file_path`,`file_name`) values(?,?,?);";
        await connection.query(sql2, [
          post_id,
          filepath,
          files[i].originalname,
        ]);
      }*/

      await connection.commit();
      res.send({post_id: post_id});
    } catch (err) {
      await connection.rollback();
      /*for (var i = 0; i < req.files.length; i++) {
        fs.unlinkSync(
          "./public" + uplPath.customer_notice_file + files[i].filename
        );
      }*/

      logger.error(__filename + " : " + err);
      if (err == 0) res.status(401).send({ err: "접근 권한이 없습니다." });
      else res.status(500).send({ err: "오류-" + err });
      // else res.status(500).send({ err : "서버 오류" });
    } finally {
      connection.release();
    }
  }
);

// ===== 고객 공지사항 - 이미지 업로드 =====
router.post(
  "/customer/upload/files",
  upload(uplPath.customer_notice_file).array("files"),
  async function (req, res, next) {
    const files = req.files;
    const { post_id } = JSON.parse(req.body.json);

    const connection = await pool2.getConnection(async (conn) => conn);
    try {
      await connection.beginTransaction();

      for (var i = 0; i < req.files.length; i++) {
        const filepath = uplPath.customer_notice_file + files[i].filename;
        const sql2 =
          "insert into `customer_notice_file` (`post_id`,`file_path`,`file_name`) values(?,?,?);";
        await connection.query(sql2, [
          post_id,
          filepath,
          files[i].originalname,
        ]);
      }

      await connection.commit();
      res.send();
    } catch (err) {
      await connection.rollback();
      for (var i = 0; i < req.files.length; i++) {
        fs.unlinkSync(
          "./public" + uplPath.customer_notice_file + files[i].filename
        );
      }

      logger.error(__filename + " : " + err);
      if (err == 0) res.status(401).send({ err: "접근 권한이 없습니다." });
      else res.status(500).send({ err: "오류-" + err });
      // else res.status(500).send({ err : "서버 오류" });
    } finally {
      connection.release();
    }
  }
);

// ===== 고객 공지사항 - 편집 =====
router.post("/customer/edit", async function (req, res, next) {
  const { title, id, content } = req.body;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    // 이전 파일 삭제
    const sql2 =
      "select `file_path` from `customer_notice_file` where `post_id`=?;";
    const result2 = await connection.query(sql2, [id]);
    const data2 = result2[0];

    for (var i = 0; i < data2.length; i++) {
      const path = "./public" + data2[i].file_path;
      if (fs.existsSync(path)) fs.unlinkSync(path);
    }

    const sql2_2 = "delete from `customer_notice_file` where `post_id`=?;";
    await connection.query(sql2_2, [id]);

    const sql1 =
      "update `customer_notice` set `post_title`=?,`post_content`=? where `post_id`=?;";
    const result1 = await connection.query(sql1, [title, content, id]);
    if (result1[0].affectedRows == 0) throw (err = 0);
    res.status(200).send();
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0) res.status(500).send({ err: "편집 실패!" });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});

// ===== 고객 공지사항 - 삭제 =====
router.post("/customer/delete", async function (req, res, next) {
  const { id } = req.body;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    // 이전 파일 삭제
    const sql2 =
      "select `file_path` from `customer_notice_file` where `post_id`=?;";
    const result2 = await connection.query(sql2, [id]);
    const data2 = result2[0];

    for (var i = 0; i < data2.length; i++) {
      const path = "./public" + data2[i].file_path;
      if (fs.existsSync(path)) fs.unlinkSync(path);
    }

    const sql1 = "delete from `customer_notice` where `post_id`=?;";
    await connection.query(sql1, [id]);
    res.send();
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

module.exports = router;
