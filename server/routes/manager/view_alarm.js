const express = require("express");
const router = express.Router();
const { user } = require("../../config/database");
const upload = require("../../modules/fileupload");

const jwt = require("../../modules/jwt");
const pool2 = require("../../modules/mysql2");
const uplPath = require("../../config/upload_path");

// ===== 알림 조회 =====
router.post("/alarmList/", async function (req, res, next) {
  const token = req.body.jwtToken;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });
  const manager_id = token_res.id; // 매니저 id
  const connection = await pool2.getConnection(async (conn) => conn);

  try {
    let param = [manager_id];

    const sql =
      "select *, m.`netsmanager_name` from `manager_alarm` as ma left join `netsmanager` as m on ma.`netsmanager_number` = m.`netsmanager_number` " +
      "where m.netsmanager_id =? " +
      "order by ma.`alarm_id` desc";
    const result = await connection.query(sql, param);
    const data = result[0];
    connection.release();

    res.send(data);
  } catch (err) {
    console.error("err : " + err);
    if (err == 0) res.status(401).send({ err: "잘못된 인자 전달" });
    else res.status(500).send({ err : "오류-" + err }); // res.status(500).send({ err: "서버 오류" });
  } finally {
    connection.release();
  }
});

// ==== 동행 파일 업로드 ====
router.post(
  "/alarmDetail/:service_id/submitAccompanyPicture",
  upload(uplPath.customer_document).single("file"),
  async function (req, res, next) {
    const file = req.file;
    if (file === undefined)
      return res.status(400).send({ err: "파일이 업로드되지 않았습니다." });

    const service_id = req.params.service_id;
    const filepath = uplPath.accompany_picture + file.filename; // 업로드 파일 경로

    const connection = await pool2.getConnection(async (conn) => conn);
    try {
      const spl =
        "update `reservation` set `accompany_picture_path`=? where `reservation_id`=?;";
      await connection.query(spl, [filepath, service_id]);
      res.send();
    } catch (err) {
      console.error("err : " + err);
      // res.status(500).send({ err: "서버 오류" });
      res.status(500).send({ err : "오류-" + err });
    } finally {
      connection.release();
    }
  }
);
module.exports = router;
