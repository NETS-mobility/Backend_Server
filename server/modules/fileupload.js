// === 파일 업로드 객체 반환 ===
// 인자: 업로드할 파일 경로

var multer = require('multer');
var path = require("path");

module.exports = (uploadPath) => {
  var storage = multer.diskStorage({
    destination(req, file, cb) {
      cb(null, 'public' + uploadPath);
    },
    filename(req, file, cb) {
      cb(null, Date.now() + "-" + path.basename(file.originalname)); // 파일명 중복 방지를 위해 현재 시간을 파일 이름에 추가
    },
  });
  return multer({ storage: storage });
}
