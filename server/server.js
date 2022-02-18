const express = require('express');

// 라우팅 js파일 목록
const route_client_service = require('./routes/client/service');
const route_client_mypage = require('./routes/client/mypage');
const route_client_home = require('./routes/client/home');
const route_client_login = require('./routes/client/login');
const route_client_register = require('./routes/client/register');
const route_client_reserve = require('./routes/client/reserve');

const route_manager_service = require('./routes/manager/service');
const route_manager_mypage = require('./routes/manager/mypage');
const route_manager_home = require('./routes/manager/home');
const route_manager_login = require('./routes/manager/login');

const route_admin_service = require('./routes/admin/service');
const route_admin_home = require('./routes/admin/home');
const route_admin_statistics = require('./routes/admin/statistics');
const route_admin_management = require('./routes/admin/management');
const route_admin_board = require('./routes/admin/board');
const route_admin_cost = require('./routes/admin/cost');


// npm 모듈 목록
const cors = require("cors");
const bodyParser = require('body-parser');
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("../public")); // 정적 리소스 관리 디렉터리 설정

const port = 5000; // 포트 설정
app.listen(port, () => console.log(`${port}`));


// 서버별 도메인 설정 (app.use(bodyParser.json())코드 이후에 추가해야 bodyParser가 적용됨)
app.use('/client/service', route_client_service);
app.use('/client/mypage', route_client_mypage);
app.use('/client', route_client_home);
app.use('/client/login', route_client_login);
app.use('/client/register', route_client_register);
app.use('/client/reserve', route_client_reserve);

app.use('/manager/service', route_manager_service);
app.use('/manager/mypage', route_manager_mypage);
app.use('/manager', route_manager_home);
app.use('/manager/login', route_manager_login);

app.use('/admin/service', route_admin_service);
app.use('/admin', route_admin_home);
app.use('/admin/statistics', route_admin_statistics);
app.use('/admin/management', route_admin_management);
app.use('/admin/board', route_admin_board);
app.use('/admin/cost', route_admin_cost);
