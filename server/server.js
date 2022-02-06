const express = require('express');

// 라우팅 js파일 목록
const route_service = require('./routes/client/service');
const route_reserve = require('./routes/client/reserve');

// npm 모듈 목록
const cors = require("cors");
const bodyParser = require('body-parser');
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const port = 5000; // 포트 설정
app.listen(port, () => console.log(`${port}`));

// 서버별 도메인 설정 (app.use(bodyParser.json())코드 이후에 추가해야 bodyParser가 적용됨)
app.use('/client/service', route_service);
app.use('/client/reserve', route_reserve);
