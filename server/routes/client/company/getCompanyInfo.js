const express = require("express");
const router = express.Router();

const jwt = require("../../../modules/jwt");
const pool2 = require("../../../modules/mysql2");
const logger = require("../../../config/logger");


// ===== 사업자 정보 조회 =====
router.post("", async function (req, res, next) {
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


module.exports = router;
