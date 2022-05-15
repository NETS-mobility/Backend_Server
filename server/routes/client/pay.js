const express = require("express");
const router = express.Router();

const axios = require("axios");

const jwt = require("../../modules/jwt");
const pool = require("../../modules/mysql");
const pool2 = require("../../modules/mysql2");
const formatdate = require("../../modules/formatdate");

const reservation_state = require("../../config/reservation_state");
const service_state = require("../../config/service_state");
const reservation_payment_state = require("../../config/reservation_payment_state");
const payment_state = require("../../config/payment_state");
const service_kind = require("../../config/service_kind");
const cancel_reservation = require("../../modules/cancel_reservation");
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

// ===== 결제 완료 처리 =====
router.post("/setComplete", async function (req, res, next) {
  const { impUid, merchantUid } = req.body;
  logger.info("impUid: " + impUid + ", merchantUid: " + merchantUid); // ==============테스트==============

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    // === Access Token 발급 ===
    const getToken = await axios({
      url: "https://api.iamport.kr/users/getToken",
      method: "post", // POST method
      headers: { "Content-Type": "application/json" },
      data: {
        imp_key: process.env.IMP_REST_API_KEY, // REST API키
        imp_secret: process.env.IMP_REST_API_KEY_SECRET // REST API Secret
      }
    });

    const { access_token } = getToken.data.response;
    logger.info("access_token: " + access_token); // ==============테스트==============

    // === 아임포트 서버에서 결제 정보 조회 ===
    const getPaymentData = await axios({
      url: `https://api.iamport.kr/payments/${impUid}`, // imp_uid 전달
      method: "get", // GET method
      headers: { "Authorization": access_token } // 인증 토큰 Authorization header에 추가
    });

    const paymentData = getPaymentData.data.response;
    const {
      amount, status, // 결제 금액, 결제 상태
      pay_method, // 결제 방식
      card_code, card_name, card_quota, card_number, // 카드사 코드번호, 카드사 명칭, 할부개월 수, 카드 번호
      vbank_code, vbank_name, vbank_num, vbank_holder, vbank_issued_at, // 가상계좌 은행 표준코드, 가상계좌 은행명, 가상계좌 계좌번호, 가상계좌 예금주, 가상계좌 생성시각
      fail_reason, // 결제 실패 사유
      paid_at, // 결제 완료 시점
      cancel_amount, // 결제 취소 금액
      cancelled_at, // 결제 취소 시점
    } = paymentData;
    logger.info("paymentData: " + paymentData); // ==============테스트==============

    // === 올바른 결제 정보 조회 ===
    // 예약 번호, 결제 금액, 결제 타입
    let reservationId, paymentAmount, paymentType;

    if (merchantUid[12] == "B") { // 기본 결제
      paymentType = "base_payment";
    } else if (merchantUid[12] == "E") { // 추가 결제
      paymentType = "extra_payment";
    }

    const sql_pay = `SELECT reservation_id, payment_amount FROM ${paymentType} WHERE merchant_uid=?;`;
    const result_pay = await connection.query(sql_pay, [merchantUid]);
    const sql_data_pay = result_pay[0];

    reservationId = sql_data_pay[0].reservation_id;
    paymentAmount = sql_data_pay[0].payment_amount;
    logger.info("reservationId: " + reservationId); // ==============테스트==============
    logger.info("기존paymentAmount: " + paymentAmount); // ==============테스트==============
    logger.info("요청amount: " + amount); // ==============테스트==============

    // === 결제 금액 일치 확인 ===
    if (amount != paymentAmount) { // 결제 금액 불일치
      return res.status(400).send({ msg: "위조된 결제 시도" });
    }

    // === 결제 상태에 따라 처리 ===
    if (status == "ready") { // 가상계좌 발급
      res.status(200).send({
        success: true,
        msg: "가상계좌 발급 성공",
      });
    } else if (status == "paid") { // 결제 완료
      res.status(200).send({
        success: true,
        msg: "일반 결제 성공",
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

// ===== 아임포트 웹훅 설정 =====
router.post("/iamport-webhook", async function (req, res, next) {
  const impUid = req.body.imp_uid;
  const merchantUid = req.body.merchant_uid;
  logger.info("impUid: " + impUid + ", merchantUid: " + merchantUid); // ==============테스트==============

  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    // === Access Token 발급 ===
    const getToken = await axios({
      url: "https://api.iamport.kr/users/getToken",
      method: "post", // POST method
      headers: { "Content-Type": "application/json" },
      data: {
        imp_key: process.env.IMP_REST_API_KEY, // REST API키
        imp_secret: process.env.IMP_REST_API_KEY_SECRET // REST API Secret
      }
    });

    const { access_token } = getToken.data.response;
    logger.info("access_token: " + access_token); // ==============테스트==============

    // === 아임포트 서버에서 결제 정보 조회 ===
    const getPaymentData = await axios({
      url: `https://api.iamport.kr/payments/${impUid}`, // imp_uid 전달
      method: "get", // GET method
      headers: { "Authorization": access_token } // 인증 토큰 Authorization header에 추가
    });

    const paymentData = getPaymentData.data.response;
    const {
      amount, status, // 결제 금액, 결제 상태
      pay_method, // 결제 방식
      card_code, card_name, card_quota, card_number, // 카드사 코드번호, 카드사 명칭, 할부개월 수, 카드 번호
      vbank_code, vbank_name, vbank_num, vbank_holder, vbank_issued_at, // 가상계좌 은행 표준코드, 가상계좌 은행명, 가상계좌 계좌번호, 가상계좌 예금주, 가상계좌 생성시각
      fail_reason, // 결제 실패 사유
      paid_at, // 결제 완료 시점
      cancel_amount, // 결제 취소 금액
      cancelled_at, // 결제 취소 시점
    } = paymentData;
    logger.info("paymentData: " + JSON.stringify(paymentData)); // ==============테스트==============

    // === 올바른 결제 정보 조회 ===
    // 예약 번호, 결제 금액, 취소 금액, 결제 타입
    let reservationId, paymentAmount, cancelAmount, paymentType;

    if (status == "ready" || status == "paid") { // 결제 관련
      if (merchantUid[12] == "B") { // 기본 결제
        paymentType = "base_payment";
      } else if (merchantUid[12] == "E") { // 추가 결제
        paymentType = "extra_payment";
      }

      const sql_pay = `SELECT reservation_id, payment_amount FROM ${paymentType} WHERE merchant_uid=?;`;
      const result_pay = await connection.query(sql_pay, [merchantUid]);
      const sql_data_pay = result_pay[0];

      reservationId = sql_data_pay[0].reservation_id;
      paymentAmount = sql_data_pay[0].payment_amount;
      logger.info("reservationId: " + reservationId); // ==============테스트==============
      logger.info("기존paymentAmount: " + paymentAmount); // ==============테스트==============
      logger.info("요청amount: " + amount); // ==============테스트==============

      // === 결제 금액 일치 확인 ===
      if (amount != paymentAmount) { // 결제 금액 불일치
        return res.status(400).send({ msg: "위조된 결제 시도" });
      }
    } else if (status == "cancelled") { // 결제 취소 관련
      if (merchantUid[12] == "B") { // 기본 결제
        const sql_cancel = `SELECT reservation_id, cancel_amount FROM base_payment WHERE merchant_uid=?;`;
        const result_cancel = await connection.query(sql_cancel, [merchantUid]);
        const sql_data_cancel = result_cancel[0];

        reservationId = sql_data_cancel[0].reservation_id;
        cancelAmount = sql_data_cancel[0].cancel_amount;
        paymentType = "base_payment";
      }
      logger.info("reservationId: " + reservationId); // ==============테스트==============
      logger.info("기존cancelAmount: " + cancelAmount); // ==============테스트==============
      logger.info("요청amount: " + cancel_amount); // ==============테스트==============

      // === 취소 금액 일치 확인 ===
      if (cancel_amount != cancelAmount) { // 취소 금액 불일치
        return res.status(400).send({ msg: "위조된 취소 시도" });
      }
    }

    // === 결제 상태에 따라 처리 ===
    // 다음 예약 상태, 다음 예약 결제 상태
    let nextReservationStateId, nextReservationPaymentStateId;

    if (status == "ready") { // 가상계좌 발급
      const sql_vbank_ready = `UPDATE ${paymentType} SET payment_state_id=?,
                               payment_method=?, vbank_code=?, vbank_name=?, vbank_num=?, vbank_holder=?
                               WHERE reservation_id=?;`;
      const result_vbank_ready = await connection.query(sql_vbank_ready, [
        payment_state.waitDepositPay,
        pay_method,
        vbank_code,
        vbank_name,
        vbank_num,
        vbank_holder,
        reservationId,
      ]);

      // 가상계좌 발급 시 다음 예약 결제 상태
      nextReservationPaymentStateId = reservation_payment_state.waitBaseDepositPay;
      const sql_reservation_state = `UPDATE reservation SET reservation_payment_state_id=? WHERE reservation_id=?;`;
      const result_reservation_state = await connection.query(sql_reservation_state, [
        nextReservationPaymentStateId,
        reservationId,
      ]);

      res.status(200).send({
        success: true,
        msg: "가상계좌 발급 성공",
      });
    } else if (status == "paid") { // 결제 완료
      const completePaymentDate = formatdate.getFormatDate(new Date(paid_at*1000), 1); // 날짜,시간
      logger.info("completePaymentDate: " + completePaymentDate); // ==============테스트==============

      if (pay_method == 'card') {
        // 카드 결제이면
        const sql_card = `UPDATE ${paymentType} SET imp_uid=?, payment_state_id=?, complete_payment_date=?,
                          payment_method=?, card_code=?, card_name=?, card_quota=?, card_number=?
                          WHERE reservation_id=?;`;
        const result_card = await connection.query(sql_card, [
          impUid,
          payment_state.completePay,
          completePaymentDate,
          pay_method,
          card_code,
          card_name,
          card_quota,
          card_number,
          reservationId,
        ]);
      } else if (pay_method == 'vbank') {
        // 가상계좌 결제이면
        const vbankIssuedDate = formatdate.getFormatDate(new Date(vbank_issued_at*1000), 1); // 날짜,시간
        logger.info("vbankIssuedDate: " + vbankIssuedDate); // ==============테스트==============

        const sql_vbank = `UPDATE ${paymentType} SET imp_uid=?, payment_state_id=?, complete_payment_date=?,
                           payment_method=?, vbank_code=?, vbank_name=?, vbank_num=?, vbank_holder=?, vbank_issued_date=?
                           WHERE reservation_id=?;`;
        const result_vbank = await connection.query(sql_vbank, [
          impUid,
          payment_state.completePay,
          completePaymentDate,
          pay_method,
          vbank_code,
          vbank_name,
          vbank_num,
          vbank_holder,
          vbankIssuedDate,
          reservationId,
        ]);
      }

      // 결제 완료 시 다음 예약 상태, 다음 예약 결제 상태
      if (paymentType == "base_payment") { // 기본 결제
        // 예약 확정 처리 및 서비스 준비
        /*const sql_new_service = `INSERT INTO service_progress(reservation_id, service_state_id
                                 ) VALUES(?,?);`;
        const result_new_service = await connection.query(sql_new_service, [
          reservationId,
          service_state.ready,
        ]);*/

        nextReservationStateId = reservation_state.ready;
        nextReservationPaymentStateId = reservation_payment_state.completeBasePay;

        // 기본 결제 완료 시 알림 전송
        // ***** 작성 필요 *****
      } else if (paymentType == "extra_payment") { // 추가 결제
        nextReservationStateId = reservation_state.complete;
        nextReservationPaymentStateId = reservation_payment_state.completeAllPay;
      }

      const sql_reservation_state = `UPDATE reservation SET reservation_state_id=?, reservation_payment_state_id=? WHERE reservation_id=?;`;
      const result_reservation_state = await connection.query(sql_reservation_state, [
        nextReservationStateId,
        nextReservationPaymentStateId,
        reservationId,
      ]);

      res.status(200).send({
        success: true,
        msg: "일반 결제 성공",
      });
    } else if (status == "cancelled") { // 결제 취소
      await cancel_reservation.cancelReservation(reservationId, 2); // 예약 취소 완료

      const completeCancelDate = formatdate.getFormatDate(new Date(cancelled_at*1000), 1); // 날짜,시간
      logger.info("completeCancelDate: " + completeCancelDate); // ==============테스트==============

      const sql_cancel = `UPDATE base_payment SET complete_cancel_date=?
                          WHERE reservation_id=?;`;
      const result_cancel = await connection.query(sql_cancel, [
        completeCancelDate,
        reservationId,
      ]);

      res.status(200).send({
        success: true,
        msg: "결제 취소 성공",
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
