const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const logger = require("./config/logger");
const fs = require("fs");

dotenv.config();

// 기존 combined 포멧에서 timestamp만 제거
const combined =
  ':remote-addr - :remote-user ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';
// NOTE: morgan 출력 형태 server.env에서 NODE_ENV 설정 production : 배포 dev : 개발
const morganFormat = process.env.NODE_ENV !== "production" ? "dev" : combined;

// 라우팅 js파일 목록
const route_client_service = require("./routes/client/service");
const route_client_mypage = require("./routes/client/mypage");
const route_client_home = require("./routes/client/home");
const route_client_login = require("./routes/client/login");
const route_client_register = require("./routes/client/register");
const route_client_reserve = require("./routes/client/reserve");
const route_client_basecost = require("./routes/client/basecost");
const route_client_extracost = require("./routes/client/extracost");
const route_client_alarm = require("./routes/client/view_alarm");

const route_manager_service = require("./routes/manager/service");
const route_manager_mypage = require("./routes/manager/mypage");
const route_manager_home = require("./routes/manager/home");
const route_manager_login = require("./routes/manager/login");
const route_manager_alarm = require("./routes/manager/view_alarm");

const route_admin_service = require("./routes/admin/service");
const route_admin_home = require("./routes/admin/home");
const route_admin_statistics = require("./routes/admin/statistics");
const route_admin_management = require("./routes/admin/management");
const route_admin_board = require("./routes/admin/board");
const route_admin_cost = require("./routes/admin/cost");
const route_admin_login = require("./routes/admin/login");
const route_admin_register = require("./routes/admin/register");
const route_admin_alarm = require("./routes/admin/view_alarm");

const route_dispatch = require("./routes/dispatch/dispatch");
const route_public = require("./routes/public");

//const route_client_feedback = require('./routes/client/feedback');
//const route_client_pay = require('./routes/client/pay');

// npm 모듈 목록
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const favicon = require("serve-favicon");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan(morganFormat, { stream: logger.stream })); // morgan 로그 설정

app.use(cookieParser());
app.use(express.static("../public")); // 정적 리소스 관리 디렉터리 설정

const port = process.env.PORT || 5000; // 포트 설정
app.listen(port, () => console.log(`${port}`));

// 서버별 도메인 설정 (app.use(bodyParser.json())코드 이후에 추가해야 bodyParser가 적용됨)
app.use("/client/service", route_client_service);
app.use("/client/mypage", route_client_mypage);
app.use("/client", route_client_home);
app.use("/client/login", route_client_login);
app.use("/client/register", route_client_register);
app.use("/client/reserve", route_client_reserve);
app.use("/client/basecost", route_client_basecost);
app.use("/client/extracost", route_client_extracost);
app.use("/client/view_alarm", route_client_alarm);
//app.use('/client/feedback', route_client_feedback);
//app.use('/client/pay', route_client_pay);

app.use("/manager/service", route_manager_service);
app.use("/manager/mypage", route_manager_mypage);
app.use("/manager", route_manager_home);
app.use("/manager/login", route_manager_login);
app.use("/manager/view_alarm", route_manager_alarm);

app.use("/admin/service", route_admin_service);
app.use("/admin", route_admin_home);
app.use("/admin/statistics", route_admin_statistics);
app.use("/admin/management", route_admin_management);
app.use("/admin/board", route_admin_board);
app.use("/admin/cost", route_admin_cost);
app.use("/admin/login", route_admin_login);
app.use("/admin/register", route_admin_register);
app.use("/admin/view_alarm", route_admin_alarm);

app.use("/dispatch", route_dispatch);
app.use("/public", route_public);
/*
// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });
  
  // error handlers
  
  // development error handler
  // will print stacktrace
  if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: err
      });
    });
  }
  
  // production error handler
  // no stacktraces leaked to user
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: {}
    });
  });

  module.exports = app;
*/
