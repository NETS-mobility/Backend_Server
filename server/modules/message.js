// === SMS로 메세지 인증번호 전송 ===

const accountSid = 'AC1a83473cd20eb2b01f96e14f23e9238a';
const authToken = '533c9215965e253634b7cbb3218c28ed';
const twilioPhone = '+18454425725';
const twilio = require("twilio")(accountSid, authToken);

module.exports = {
  sendMessage: async (phone) => { // 메세지를 생성 및 전송, 올바른 인증번호 반환
    const randomNumber = Math.floor(Math.random() * 1000000) + 1; // 6자리 난수 생성->인증번호
    try {
      const result = await twilio.messages.create({
        body: `[NETS] 본인확인 인증번호 [${randomNumber}]를 입력해주세요.`,
        from: twilioPhone,
        to: "+82" + phone,
      });
      if (result) return randomNumber; // 메세지 전송 성공, 인증번호 반환 
      else return -1; // 메세지 전송 실패
    }
    catch (err) {
      console.error("err : " + err);
    }
  }
};
