var express = require('express');
var router = express.Router();

//feedback을 받는 부분
router.post('/', function(req, res, next) {
  console.log(req.query.cmd);
  console.log(req.query.userid);
  console.log(req.query.goodname);
  console.log(req.query.price);
  console.log(req.query.recvphone);
  res.send('cmd : ' + req.query.cmd + ", goodname :" + req.query.goodname);
});

module.exports = router;
