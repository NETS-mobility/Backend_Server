// === push 알림 전송 ===
const admin = require("firebase-admin");
const logger = require("../config/logger");

// SDK 초기화
let serviceAccount = require("../config/" + process.env.FCM_SECRET_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  //databaseURL: "https://gcp-nets.firebaseio.com",
});

/*getMessaging()
  .sendToDevice(registrationToken, message)
  .then((response) => {
    // See the MessagingDevicesResponse reference documentation for
    // the contents of response.
    console.log("Successfully sent message:", response);
  })
  .catch((error) => {
    console.log("Error sending message:", error);
  });*/

exports.pushAlarm = async function (
  push_alarm_body,
  push_alarm_title,
  device_token
) {
  const registrationToken = device_token;

  // 알림 setting
  let message = {
    android: {
      priority: "high",
      notification: {
        channel_id: "basic",
        default_vibrate_timings: true,
      },
    },
    notification: {
      // 알림 화면에서 표시될 내용
      title: push_alarm_title,
      body: push_alarm_body,
    },
    token: registrationToken, // 기기의 개별 토큰  (해당 토큰은 앱 설치시 입력받는 것이라고 함)
  };

  // fcm으로 push message 전송
  admin
    .messaging()
    .send(message)
    .then(function (response) {
      logger.info("successfully sent push message: " + response);
    })
    .catch(function (err) {
      logger.error("Error Sending Push Message!!: " + err);
    });
};
/////////////////////////////////////////
//const channel;
/*exports.push_alarm = async function (req, res) {};

module.export = {
  make_push_token: async (reservation_id, alarm_kind, user_number) => {
    try {
      let alarm = push_alarm.set_alarm(reservation_id, alarm_kind, user_number);
      let deviceToken = "";
      let message = {
        topic: "notice",
        token: deviceToken,
        notification: {
          title: "push_alarm_test",
          body: "",
        },
        android: {
          notification: {
            channelId: "client",
            vibrateTimingsMillis: [0, 500, 500, 500],
            priority: "high",
            defaultVibrateTimings: false,
          },
        },
        data: {
          user_id: alarm.user_id,
          reservation_id: alarm.reservation_id,
          alarm_type: alarm.alarm_type,
          reservation_date: alarm.reservation_date,
          pickup_time: alarm.pickup_time,
          context: alarm.context,
        },
      };
      admin
        .messaging()
        .send(message)
        .then(function (response) {
          console.log("Successfully sent message::", response);
          return res.status(200).json({ success: true });
        })
        .catch(function (err) {
          console.log("Error Sending message!! : ", err);
          return res.status(400).json({ success: false });
        });
    } catch (err) {
      console.error("err : " + err);
    } finally {
      //connection.release();
    }
  },
};
module.exports = alarm;
*/
