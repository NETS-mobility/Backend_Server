const express = require("express");
const router = express.Router();

const jwt = require("../../../modules/jwt");
const pool2 = require("../../../modules/mysql2");
const logger = require("../../../config/logger");


// ===== 서비스 요금조회 API =====
router.post("/serviceCost", async function (req, res, next) {
  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql =
      "select `service_kind_id` as `id`, `service_kind` as `name`, `service_base_move_distance` as `dist`, `service_base_hospital_gowith_time` as `time`, `service_base_cost` as `cost` from `service_info` order by `service_kind_id`;";
    const result = await connection.query(sql, []);
    const data = result[0];
    res.status(200).send(data);
  } catch (err) {
    logger.error(__filename + " : " + err);
    res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});


// ===== FAQ 확인 API =====
router.post("/FAQ", async function (req, res, next) {
  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql =
      "select `faq_id` as `id`, `faq_question` as `question`, `faq_answer` as `answer` from `faq` order by `faq_id`;";
    const result = await connection.query(sql, []);
    const data = result[0];
    res.status(200).send(data);
  } catch (err) {
    logger.error(__filename + " : " + err);
    res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});


// ===== 수수료 안내 API =====
router.post("/fee", async function (req, res, next) {
  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql =
      "select `commision_kind` as `kind`, `commision_day_difference` as `day_difference`, `commision_refund_percentage` as `refund_percentage` from `commision`;";
    const result = await connection.query(sql, []);
    const data = result[0];
    res.status(200).send(data);
  } catch (err) {
    logger.error(__filename + " : " + err);
    res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});


// ===== 약관 확인 API - 약관 간략정보, 필수여부 전달 =====
router.post("/clause/clauseSimple", async function (req, res, next) {
  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql =
      "select `clause_id` as `id`, `simple_clause` as `content`, `is_essential_agree` as `isEssential` from `clause` where `clause_kind`=?;";
    const result = await connection.query(sql, [req.body.kind]);
    const data = result[0];
    res.status(200).send(data);
  } catch (err) {
    logger.error(__filename + " : " + err);
    res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});


// ===== 약관 확인 API - 상세 정보 출력 =====
router.post("/clause/clauseDetail", async function (req, res, next) {
  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql =
      "select `detail_clause` as `content`, `is_essential_agree` as `isEssential`, date_format(`clause_apply_date`,'%Y-%m-%d %T') as `apply_date` from `clause` where `clause_id`=?;";
    const result = await connection.query(sql, [req.body.id]);
    const data = result[0];
    res.status(200).send(data[0]);
  } catch (err) {
    logger.error(__filename + " : " + err);
    res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});


// ===== 약관 확인 API - 전체 약관 전달 =====
router.post("/clause/all", async function (req, res, next) {
  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql =
      "select `clause_id` as `id`, `clause_kind` as `kind`, `simple_clause` as `content`, `is_essential_agree` as `isEssential` from `clause`;";
    const result = await connection.query(sql, []);
    const data = result[0];
    res.status(200).send(data);
  } catch (err) {
    logger.error(__filename + " : " + err);
    res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});


// ===== 사업자 정보 조회 =====
router.post("/getCompanyInfo", async function (req, res, next) {
  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql =
      "select `company_name` as `company_name`, `company_represent_name` as `represent_name`, `company_address` as `address`, `company_email` as `email`, " + 
      "`customer_center_phone` as `center_phone`, `company_registration_number` as `registration_number`, `company_telemarketing_registration_number` as `telemarketing_registration_number`, `company_infocol` as `infocol` from `company_info`;";
    const result = await connection.query(sql, []);
    const data = result[0];
    res.status(200).send(data[0]);
  } catch (err) {
    logger.error(__filename + " : " + err);
    res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});


// ===== 고객센터 전화번호 전달 =====
router.post("/serviceCenterNumber", async function (req, res, next) {
  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql =
      "select `customer_center_phone` from `company_info`;";
    const result = await connection.query(sql, []);
    const data = result[0];
    res.status(200).send(data[0].customer_center_phone);
  } catch (err) {
    logger.error(__filename + " : " + err);
    res.status(500).send({ err: "오류-" + err }); // res.status(500).send({ err : "서버 오류" });
  } finally {
    connection.release();
  }
});


module.exports = router;
