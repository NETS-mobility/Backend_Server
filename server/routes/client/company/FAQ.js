const express = require("express");
const router = express.Router();

const jwt = require("../../../modules/jwt");
const pool2 = require("../../../modules/mysql2");
const logger = require("../../../config/logger");


// ===== FAQ 확인 API =====
router.post("", async function (req, res, next) {
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


module.exports = router;
