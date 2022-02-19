/*
var express = require('express');
var router = express.Router();

var http = require('http');
var querystring = require('query-string');

// GET home page.
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});

// 결제 요청
router.get('/payRequest', function(req, res, next) {
    payRequest();
    res.render('test', { title: 'Express' });

});

// 결제 (요청, 승인) 취소
router.get('/payRequestCancel', function(req, res, next) {
    payRequestCancel();
    res.render('test', { title: 'Express' });

});

// 결제 취소 요청
router.get('/payRequestCancel2', function(req, res, next) {
    payRequestCancel2();
    res.render('test', { title: 'Express' });

});

// 결제 요청
function payRequest() {
    var postData = querystring.stringify({
      'cmd' : 'payrequest',
      'userid' : '판매자 회원 아이디',
      'goodname' : '상품명',
      'price' : '결제요청 금액',
      'recvphone' : '수신 휴대폰번호',
      'feedbackurl' : 'callback'
    });
  
    var request = http.request(optionsMake(postData), readJSONResponse);
  
    request.write(postData);
    request.end();
}

// 결제 (요청, 승인) 취소
function payRequestCancel() {
    var postData = querystring.stringify({
        'cmd' : 'paycancel',
        'userid' : '판매자 회원 아이디',
        'linkkey' : '연동 KEY (필수)',
        'mul_no' : '결제요청번호', // 결제요청번호 (필수)
        'cancelmode' : 'ready', //값이 ready 인 경우 결제요청 상태만 취소 가능),
        'feedbackurl' : 'callback'
  
        // 부분 취소를 하려면 아래 parameter 값을 추가해서 전달한다.
        //'partcancel' : "1", //partcancel 결제요청취소 구분 (0:전취소, 1:부분취소)
        //'cancelprice' : "1000", //cancelprice 결제요청취소 금액 (부분취소인 경우 필수)
    });
  
    var request = http.request(optionsMake(postData), readJSONResponse);
  
    request.write(postData);
    request.end();
}

// 결제 취소 요청
function payRequestCancel2() {
    var postData = querystring.stringify({
        'cmd' : 'paycancel',
        'userid' : '판매자 회원 아이디',
        'linkkey' : '연동 KEY (필수)',
        'mul_no' : '결제요청번호', // 결제요청번호 (필수)
        'feedbackurl' : 'callback'

        // 부분 취소를 하려면 아래 parameter 값을 추가해서 전달한다.
        //'partcancel' : "1", //partcancel 결제요청취소 구분 (0:전취소, 1:부분취소)
        //'cancelprice' : "1000", //cancelprice 결제요청취소 금액 (부분취소인 경우 필수)
    });
  
    var request = http.request(optionsMake(postData), readJSONResponse);
  
    request.write(postData);
    request.end();
}

// http 정보
// @param postData
 function optionsMake (postData) {
    var options = {
        host: 'api.payapp.kr',
        path: '/oapi/apiLoad.html',
        port: '80',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return options;
}

// 응답
// @param response
function readJSONResponse(response) {
    var responseData = '';
    response.on('data', function (chunk) {
        responseData += chunk;
    });
    response.on('end', function () {
        var result = querystring.parse(responseData);
        //state = 1 이면 성공
        //state = 0 이면 실패
        console.log("result==" + JSON.stringify(result));
    });
}
*/