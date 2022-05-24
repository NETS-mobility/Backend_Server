const express = require("express");
const router = express.Router();

const jwt = require("../../../modules/jwt");
const pool2 = require("../../../modules/mysql2");
const logger = require("../../../config/logger");


// ===== 약관 확인 API - 약관 간략정보, 필수여부 전달 =====
router.post("/clauseSimple", async function (req, res, next) {
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
router.post("/clauseDetail", async function (req, res, next) {
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
router.post("/all", async function (req, res, next) {
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


module.exports = router;
