const express = require("express");
const router = express.Router();

const jwt = require("../../modules/jwt");
const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");
const formatdate = require("../../modules/formatdate");

const reservation_payment_state = require("../../config/reservation_payment_state");
const service_kind = require("../../config/service_kind");
const logger = require("../../config/logger");

// ===== 결제 전 정보 조회 =====
router.post("/getPayInfo", async function (req, res, next) {
  const reservationId = req.body.reservationId;
  const token = req.body.jwtToken;

  const token_res = await jwt.verify(token);
  if (token_res == jwt.TOKEN_EXPIRED)
    return res.status(401).send({ err: "만료된 토큰입니다." });
  if (token_res == jwt.TOKEN_INVALID)
    return res.status(401).send({ err: "유효하지 않은 토큰입니다." });
  const id = token_res.id;
  const name = token_res.name;

  // 예약 결제 상태, 서비스 종류
  let reservationPaymentStateId, serviceKindId, serviceKind;
  // 주문 번호, 총 요금, 결제 가능일
  let merchantUid, paymentAmount, validDate;

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 = `SELECT reservation_payment_state_id, service_kind_id FROM reservation WHERE reservation_id=?;`;

    const sql2 = `SELECT merchant_uid, payment_amount, DATE_FORMAT(valid_payment_date, '%Y-%m-%d %T') AS valid_payment_date FROM base_payment WHERE reservation_id=?;`;

    const sql3 = `SELECT merchant_uid, payment_amount FROM extra_payment WHERE reservation_id=?;`;

    const sql4 = `SELECT user_phone FROM user WHERE user_id=?;`;

    // 예약 결제 상태, 서비스 종류
    const result1 = await connection.query(sql1, [reservationId]);
    const sql_data1 = result1[0];

    if (sql_data1.length == 0)
      return res.status(400).send({ msg: "해당하는 예약이 존재하지 않음" });

    reservationPaymentStateId = sql_data1[0].reservation_payment_state_id;
    serviceKindId = sql_data1[0].service_kind_id;

    if ((reservationPaymentStateId != reservation_payment_state.waitBasePay) &&
      (reservationPaymentStateId != reservation_payment_state.waitExtraPay))
      return res.status(400).send({ msg: "결제 진행할 수 없는 단계임" });

    if (serviceKindId == service_kind.move)
      serviceKind = "네츠 무브";
    else if (serviceKindId == service_kind.wheelS)
      serviceKind = "네츠 휠체어-편도";
    else if (serviceKindId == service_kind.wheelD)
      serviceKind = "네츠 휠체어-왕복";
    else if (serviceKindId == service_kind.wheelplusS)
      serviceKind = "네츠 휠체어 플러스-편도";
    else if (serviceKindId == service_kind.wheelplusD)
      serviceKind = "네츠 휠체어 플러스-왕복";

    // 주문 번호, 총 요금, 결제 가능일
    if (reservationPaymentStateId == reservation_payment_state.waitBasePay) { // 기본 결제 대기
      const result2 = await connection.query(sql2, [reservationId]);
      const sql_data2 = result2[0];
      merchantUid = sql_data2[0].merchant_uid;
      paymentAmount = sql_data2[0].payment_amount;
      validDate = sql_data2[0].valid_payment_date;
    } else if (reservationPaymentStateId == reservation_payment_state.waitExtraPay) { // 추가 결제 대기
      const result3 = await connection.query(sql3, [reservationId]);
      const sql_data3 = result3[0];
      merchantUid = sql_data3[0].merchant_uid;
      paymentAmount = sql_data3[0].payment_amount;
    }

    // 고객 정보
    const result4 = await connection.query(sql4, [id]);
    const sql_data4 = result4[0];
    const phone = sql_data4[0].user_phone;

    // 입금 기한
    // const now = new Date(); // 오늘
    // let validDate = new Date(now.setMinutes(now.getMinutes() + 90)); // 1시간 30분 후
    // validDate = formatdate.getFormatDate(validDate, 1); // 날짜,시간
    // validDate = validDate.substring(0, 17) + "59";

    if (reservationPaymentStateId == reservation_payment_state.waitBasePay) { // 기본 결제 대기
      res.status(200).send({
        merchantUid: merchantUid,
        name: serviceKind,
        amount: paymentAmount,
        buyerName: name,
        buyerTel: phone,
        buyerEmail: id,
        payMethods: ["card", "vbank"],
        cardQuotas: [2, 3],
        vbankDue: validDate,
      });
    } else if (reservationPaymentStateId == reservation_payment_state.waitExtraPay) { // 추가 결제 대기
      res.status(200).send({
        merchantUid: merchantUid,
        name: serviceKind,
        amount: paymentAmount,
        buyerName: name,
        buyerTel: phone,
        buyerEmail: id,
        payMethods: ["card", "vbank"],
        cardQuotas: [2, 3],
      });
    }
  } catch (err) {
    logger.error(__filename + " : " + err);
    // res.status(500).send({ err : "서버 오류" });
    res.status(500).send({ err: "오류-" + err });
  } finally {
    connection.release();
  }
});

module.exports = router;
