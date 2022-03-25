const express = require("express");
const router = express.Router();

const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");
const token_checker = require("../../modules/admin_token");
const upload = require("../../modules/fileupload");
const bcrypt = require("bcryptjs");

const bcrypt_option = require("../../config/bcrypt");
const uplPath = require("../../config/upload_path");
const logger = require("../../config/logger");
const saltRounds = bcrypt_option.saltRounds;

// ===== 고객 리스트 조회 =====
router.post("/customer", async function (req, res, next) {
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 =
      "select `user_id` as `id`, `user_number` as `number`, `user_name` as `name`, `user_join_date` as `date` from `user`;";
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

// ===== 고객 상세 조회 =====
router.post("/customer/detail", async function (req, res, next) {
  const number = req.body.number;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 =
      "select `user_id` as `id`, `user_number` as `number`,`user_name` as `name`, `user_join_date` as `date`, `user_phone` as `phone` from `user` where `user_number`=?;";
    const result1 = await connection.query(sql1, [number]);
    const data1 = result1[0];
    if (data1.length == 0) throw (err = 0);

    const sql2 =
      "select R.`reservation_id` as `service_id`, S.`service_kind` as `service_type`, `hope_reservation_date` as `rev_date`, `expect_pickup_time` as `pickup_time`, " +
      "`hope_hospital_arrival_time` as `hos_arv_time`, `hope_hospital_departure_time` as `hos_dep_time`, `expect_terminate_service_time` as `end_time` " +
      "from `reservation` as R, `service_info` as S, `user` as U " +
      "where U.`user_number`=? and R.`service_kind_id`=S.`service_kind_id` and R.`user_number`=U.`user_number` " +
      "order by `hope_reservation_date`;";
    const result2 = await connection.query(sql2, [number]);
    const data2 = result2[0];

    for (
      let i = 0;
      i < data1.length;
      i++ // 매니저 구하기
    ) {
      const sqlm =
        "select NM.`netsmanager_id` as `id`, NM.`netsmanager_number` as `number`, NM.`netsmanager_name` as `name` from `reservation` as R, `car_dispatch`as D, `netsmanager` as NM " +
        "where R.`reservation_id`=? and R.`reservation_id`=D.`reservation_id` and D.`netsmanager_number`=NM.`netsmanager_number`;";
      const sqlmr = await connection.query(sqlm, [data1[i].service_id]);
      data2[i].netsmanager = sqlmr[0];
    }

    res.send({
      user: data1[0],
      rev: data2,
    });
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0) res.status(400).send({ err: "회원정보가 없습니다." });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});

// ===== 매니저 리스트 조회 =====
router.post("/manager", async function (req, res, next) {
  console.log("manager Req===", req);
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 =
      "select `netsmanager_id` as `id`, `netsmanager_number` as `number`, `netsmanager_name` as `name`, `netsmanager_join_date` as `date` from `netsmanager`;";
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

// ===== 매니저 상세 조회 =====
router.post("/manager/detail", async function (req, res, next) {
  const number = req.body.number;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 =
      "select `netsmanager_id` as `id`, `netsmanager_name` as `name`, `netsmanager_number` as `number`, `netsmanager_join_date` as `date`, `netsmanager_possible` as `available`, `netsmanager_picture_path` as `path_pic`, " +
      "`netsmanager_phone` as `phone`, `netsmanager_basic_salary` as `salary`, `netsmanager_rest_holiday` as `restDay`, `netsmanager_birth` as `birth` from `netsmanager` where `netsmanager_number`=?;";
    const result1 = await connection.query(sql1, [number]);
    const data1 = result1[0];
    if (data1.length == 0) throw (err = 0);

    const sql2 =
      "select `netsmanager_certificate_name` as `name`, `certificate_obtention_date` as `obtention`, " +
      "`certiicate_expiration_date` as `expiration`, `netsmanager_certificate_number` as `number` from `manager_certificate` where `netsmanager_number`=?;";
    const result2 = await connection.query(sql2, [number]);
    const data2 = result2[0];

    const sql3 =
      "select `start_holiday_date` as `start`, `end_holiday_date` as `end`, `holiday_certified` as `isOK` from `manager_holiday` where `netsmanager_number`=?;";
    const result3 = await connection.query(sql3, [number]);
    const data3 = result3[0];

    const now = new Date();
    const sql4 =
      "select C.`car_dispatch_number` as `dispatch_id`, C.`reservation_id`, S.`service_kind` as `service_type`, `expect_car_pickup_time` as `start_time`, `expect_car_terminate_service_time` as `end_time`, U.`user_name` as `customer_name`" +
      "from `car_dispatch` as C, `reservation` as R, `service_info` as S, `user` as U " +
      "where C.`netsmanager_number`=? and C.`reservation_id`=R.`reservation_id` and R.`service_kind_id`=S.`service_kind_id` and R.`user_number`=U.`user_number` and `hope_reservation_date` >= ? " +
      "order by `start_time`;";
    const result4 = await connection.query(sql4, [number, now]);
    const data4 = result4[0];

    res.send({
      manager: data1[0],
      certificate: data2,
      vacation_restDay: data1[0].restDay,
      vacation: data3,
      schedule: data4,
    });
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0) res.status(400).send({ err: "회원정보가 없습니다." });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});

// ===== 매니저 상세 조회 - 개인정보 변경 =====
router.post("/manager/detail/changeInfo", async function (req, res, next) {
  const { number, id, phone, available, salary } = req.body;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const spl =
      "update `netsmanager` set `netsmanager_id`=?, `netsmanager_phone`=?, `netsmanager_possible`=?, `netsmanager_basic_salary`=? where `netsmanager_number`=?;";
    const result = await connection.query(spl, [
      id,
      phone,
      available,
      salary,
      number,
    ]);
    if (result[0].affectedRows == 0) throw (err = 0);
    res.status(200).send();
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0) res.status(400).send({ err: "개인정보 변경실패" });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});

// ===== 매니저 상세 조회 - 자격증 등록 =====
router.post("/manager/detail/addCertificate", async function (req, res, next) {
  const { number, cert_name, cert_num, cert_obtainDate, cert_expireDate } =
    req.body;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const spl = "insert into `manager_certificate` values (?,?,?,?,?);";
    await connection.query(spl, [
      number,
      cert_name,
      cert_num,
      cert_obtainDate,
      cert_expireDate,
    ]);
    res.status(200).send();
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 매니저 상세 조회 - 자격증 삭제 =====
router.post(
  "/manager/detail/deleteCertificate",
  async function (req, res, next) {
    const { number, cert_num } = req.body;
    if (!(await token_checker(req.body.jwtToken))) {
      res.status(401).send({ err: "접근 권한이 없습니다." });
      return;
    }

    const connection = await pool2.getConnection(async (conn) => conn);
    try {
      const spl =
        "delete from `manager_certificate` where `netsmanager_number`=? and `netsmanager_certificate_number`=?;";
      await connection.query(spl, [number, cert_num]);
      res.status(200).send();
    } catch (err) {
      logger.error(__filename + " : " + err);
      // res.status(500).send({ err : "서버 오류" });
      res.status(500).send({ err: "오류-" + err });
    } finally {
      connection.release();
    }
  }
);

// ===== 매니저 상세 조회 - 휴가 승인 =====
router.post("/manager/detail/admitVacation", async function (req, res, next) {
  const { number, start, end } = req.body;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const spl =
      "update `manager_holiday` set `holiday_certified`=1 where `netsmanager_number`=? and `start_holiday_date`=? and `end_holiday_date`=?;";
    const result = await connection.query(spl, [number, start, end]);
    if (result[0].affectedRows == 0) throw (err = 0);
    res.status(200).send();
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0) res.status(400).send({ err: "휴가 승인 실패" });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});

// ===== 매니저 상세 조회 - 휴가 삭제 =====
router.post("/manager/detail/deleteVacation", async function (req, res, next) {
  const { number, start, end } = req.body;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const spl =
      "delete from `manager_holiday` where `netsmanager_number`=? and `start_holiday_date`=? and `end_holiday_date`=?;";
    await connection.query(spl, [number, start, end]);
    res.status(200).send();
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 매니저 상세 조회 - 매니저 삭제 =====
router.post("/manager/detail/deleteManager", async function (req, res, next) {
  const number = req.body.number;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const spl = "delete from `netsmanager` where `netsmanager_number`=?;";
    await connection.query(spl, [number]);
    res.status(200).send();
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 관리자 리스트 조회 =====
router.post("/admin", async function (req, res, next) {
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 =
      "select `admin_id` as `id`, `admin_number` as `number`, `admin_name` as `name`, `admin_join_date` as `date` from `administrator`;";
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

// ===== 관리자 상세 조회 =====
router.post("/admin/detail", async function (req, res, next) {
  const number = req.body.number;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 =
      "select `admin_id` as `id`, `admin_number` as `number`, `admin_name` as `name`, `admin_join_date` as `date`, `admin_phone` as `phone`, " +
      "`admin_birth` as `birth`, `admin_picture_path` as `path_pic` from `administrator` where `admin_number`=?;";
    const result1 = await connection.query(sql1, [number]);
    const data1 = result1[0];
    if (data1.length == 0) throw (err = 0);
    res.send(data1[0]);
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0) res.status(400).send({ err: "회원정보가 없습니다." });
    else res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});

// ===== 관리자 상세 조회 - 관리자 삭제 =====
router.post("/admin/detail/deleteAdmin", async function (req, res, next) {
  const number = req.body.number;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const spl = "delete from `administrator` where `admin_number`=?;";
    await connection.query(spl, [number]);
    res.status(200).send();
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 관리자 등록 =====
router.post(
  "/admin/addAdmin",
  upload(uplPath.admin_picture).single("file"),
  async function (req, res, next) {
    if (!(await token_checker(req.body.jwtToken))) {
      res.status(401).send({ err: "접근 권한이 없습니다." });
      return;
    }

    const file = req.file;
    const { id, password, name, phone, birth } = JSON.parse(req.body.json);

    let path_picture;
    if (file !== undefined)
      path_picture = uplPath.admin_picture + file.filename; // 업로드 파일 경로

    const connection = await pool2.getConnection(async (conn) => conn);
    try {
      const now = new Date();
      const hashedPW = await bcrypt.hash(password, saltRounds);

      const spl =
        "insert into `administrator`(`admin_id`,`admin_password`,`admin_name`,`admin_phone`,`admin_birth`,`admin_picture_path`,`admin_join_date`) values (?,?,?,?,?,?,?);";
      await connection.query(spl, [
        id,
        hashedPW,
        name,
        phone,
        birth,
        path_picture,
        now,
      ]);
      res.status(200).send();
    } catch (err) {
      logger.error(__filename + " : " + err);
      // res.status(500).send({ err : "서버 오류" });
      res.status(500).send({ err: "오류-" + err });
    } finally {
      connection.release();
    }
  }
);

// ===== 차량 리스트 조회 =====
router.post("/car", async function (req, res, next) {
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 =
      "select `car_id` as `id`, `car_number` as `number`, `car_joined_date` as `date`, `netsmanager_name` as `manager_name` " +
      "from `car` as C, `netsmanager` as M where C.`netsmanager_number`=M.`netsmanager_number`;";
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

// ===== 차량 수리 리스트 조회 =====
router.post("/car/:idx/repair", async function (req, res, next) {
  const idx = req.params.idx;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 =
      "select `car_repair_number` as `number`, `car_repair_start_date` as `start`, `car_repair_end_date` as `end`, `netsmanager_name` as `manager_name` " +
      "from `car_repair` as C, `netsmanager` as M where `car_id`=? and C.`netsmanager_number`=M.`netsmanager_number`;";
    const result1 = await connection.query(sql1, [idx]);
    res.send(result1[0]);
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

// ===== 차량 등록 =====
router.post("/car/addCar", async function (req, res, next) {
  const {
    number,
    type,
    netsmanager_number,
    garage_address,
    garage_x,
    garage_y,
  } = req.body;
  if (!(await token_checker(req.body.jwtToken))) {
    res.status(401).send({ err: "접근 권한이 없습니다." });
    return;
  }

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 = "select * from `address_coordinate` where `address`=?;";
    const sqlr1 = await connection.query(sql1, [garage_address]);
    if (sqlr1[0].length == 0) {
      const sql2 = "insert into `address_coordinate` values (?,?,?);"; // 차고지 좌표 추가
      await connection.query(sql2, [garage_address, garage_x, garage_y]);
    }

    const now = new Date();
    const sql3 =
      "insert into `car` (`car_number`,`car_kind`,`netsmanager_number`,`garage_detail_address`,`car_joined_date`,`car_state_id`) values(?,?,?,?,?,1);";
    await connection.query(sql3, [
      number,
      type,
      netsmanager_number,
      garage_address,
      now,
    ]);
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
