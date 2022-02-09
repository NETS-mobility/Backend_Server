const express = require('express');

// 라우팅 js파일 목록
const route_client_service = require('./routes/client/service');
const route_client_mypage = require('./routes/client/mypage');
const route_client_home = require('./routes/client/home');
const route_client_login = require('./routes/client/login');
const route_client_register = require('./routes/client/register');

// npm 모듈 목록
const cors = require("cors");
const bodyParser = require('body-parser');
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const port = 5000; // 포트 설정
app.listen(port, () => console.log(`${port}`));

// 서버별 도메인 설정 (app.use(bodyParser.json())코드 이후에 추가해야 bodyParser가 적용됨)
app.use('/client/service', route_client_service);
app.use('/client/mypage', route_client_mypage);
app.use('/client/', route_client_home);
app.use('/client/login', route_client_login);
app.use('/client/register', route_client_register);
