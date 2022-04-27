const express = require("express");
const router = express.Router();
const { user } = require("../../config/database");
const logger = require("../../config/logger");
const bcrypt = require("bcryptjs");

const jwt = require("../../modules/jwt");
const pool2 = require("../../modules/mysql2");

router.post("", async function (req, res, next) {
  const token = req.body.jwtToken;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });
  const user_id = token_res.id; // 이용자 id
  const input_password = req.body.password;
  const drop_reason = req.body.drop_reason;

  const connection = await pool2.getConnection(async (conn) => conn);
  const sql_number =
    "select `user_number`, `user_join_date`, `user_password` from `user` where `user_id` =?";

  let result = await connection.query(sql_number, user_id);
  let data = result[0][0];
  const user_number = data.user_number;
  const user_join_date = data.user_join_date;
  const password = data.user_password;
  const send_res = new Object();

  try {
    /////////// 회원 탈퇴 거부 사유 확인 ///////////
    // 결제 미처리 내역 있는지 확인
    const sql_payment =
      "select count(`reservation_id`) as count_payment_waiting from `payment_waiting_list` where `user_number` =?;";
    result = await connection.query(sql_payment, user_number);
    data_payment = result[0][0];

    // 현재 진행중인 서비스가 있는지 확인
    const sql_reservation =
      "select count(reservation_id) as count_waiting_reservation from reservation where `user_number` =? and TIMESTAMPDIFF(minute, ADDTIME(`hope_reservation_date`, `expect_terminate_service_time`), now())<0;";
    result = await connection.query(sql_reservation, user_number);
    data_reservation = result[0][0];

    if (data_payment.count_payment_waiting > 0) {
      send_res.false = "payment"; // 탈퇴 실패사유: 미결제 내역 존재
    }
    if (data_reservation.count_waiting_reservation > 0) {
      send_res.false = "reservation"; // 탈퇴 실패사유: 진행중인 예약 존재
    }
    const validPassword = await bcrypt.compare(input_password, password); // 복호화 비교
    if (validPassword == 0) {
      send_res.false = "password"; // 탈퇴 실패사유: 비밀번호 불일치
    }
    /////////// 회원 탈퇴 진행 ///////////
    if (!send_res.false) {
      const sql_move_userInfo =
        "INSERT INTO drop_user(user_drop_id, user_join_date, user_drop_date, user_drop_reason) VALUES(?, ?, now(), ?);";
      // DB: drop에 탈퇴관련정보 입력
      await connection.query(sql_move_userInfo, [
        user_number,
        user_join_date,
        drop_reason,
      ]);
      const sql_remove_user = "DELETE FROM user WHERE user_number=?"; // DB: user에서 회원정보 제거
      await connection.query(sql_remove_user, user_number);
    }
  } catch (err) {
    logger.error(__filename + " : " + err);
    if (err == 0) res.status(401).send({ err: "잘못된 인자 전달" });
    else res.status(500).send({ err: "오류-" + err });
  } finally {
    if (!send_res.false) res.send("success");
    else res.send(send_res);
  }
});

module.exports = router;
