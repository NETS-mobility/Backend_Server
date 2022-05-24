const express = require("express");
const router = express.Router();

const jwt = require("../../../modules/jwt");
const pool2 = require("../../../modules/mysql2");
const logger = require("../../../config/logger");


// ===== 서비스 요금조회 API =====
router.post("", async function (req, res, next) {
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


module.exports = router;
