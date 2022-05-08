// ===== 아임포트 결제 취소 처리 =====

const axios = require("axios");

const pool = require("./mysql");
const pool2 = require("./mysql2");

const logger = require("../config/logger");

module.exports = {
  cancelPay: async (reservationId, reason, cancel_request_amount, refund_holder, refund_bank, refund_account) => {
    const connection = await pool2.getConnection(async (conn) => conn);
    try {
      // === 결제 정보 조회 ===
      const sql_pay_info = `SELECT merchant_uid, imp_uid, pay_method FROM base_payment WHERE reservation_id=?;`;
      const result_pay_info = await connection.query(sql_pay_info, [reservationId]);
      const sql_data_pay_info = result_pay_info[0];

      const merchantUid = sql_data_pay_info[0].merchant_uid;
      const impUid = sql_data_pay_info[0].imp_uid;
      const payMethod = sql_data_pay_info[0].pay_method;

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
      
      // === 아임포트 REST API로 결제환불 요청 ===
      let getCancelData;

      if (payMethod == 'card') {
        // 카드 결제이면
        getCancelData = await axios({
          url: "https://api.iamport.kr/payments/cancel",
          method: "post", // POST method
          headers: {
            "Content-Type": "application/json",
            "Authorization": access_token // 인증 토큰 Authorization header에 추가
          },
          data: {
            reason, // 가맹점 클라이언트로부터 받은 환불사유
            imp_uid: impUid, // imp_uid를 환불 `unique key`로 입력
            amount: cancel_request_amount, // 가맹점 클라이언트로부터 받은 환불금액
            // checksum: cancelableAmount // [권장] 환불 가능 금액 입력
          }
        });
      } else if (payMethod == 'vbank') {
        // 가상계좌 결제이면
        getCancelData = await axios({
          url: "https://api.iamport.kr/payments/cancel",
          method: "post", // POST method
          headers: {
            "Content-Type": "application/json",
            "Authorization": access_token // 인증 토큰 Authorization header에 추가
          },
          data: {
            reason, // 가맹점 클라이언트로부터 받은 환불사유
            imp_uid: impUid, // imp_uid를 환불 `unique key`로 입력
            amount: cancel_request_amount, // 가맹점 클라이언트로부터 받은 환불금액
            // checksum: cancelableAmount // [권장] 환불 가능 금액 입력
            refund_holder, // [가상계좌 환불시 필수입력] 환불 수령계좌 예금주
            refund_bank, // [가상계좌 환불시 필수입력] 환불 수령계좌 은행코드(ex. KG이니시스의 경우 신한은행은 88번)
            refund_account // [가상계좌 환불시 필수입력] 환불 수령계좌 번호
          }
        });
      }
      
      const { response } = getCancelData.data; // 환불 결과
      // 환불 결과 동기화
    } catch (err) {
      console.error("err : " + err);
      logger.error(__filename + " : " + err);
    } finally {
      connection.release();
    }
  }
};
