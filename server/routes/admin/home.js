const express = require('express');
const router = express.Router();

const jwt = require('../../modules/jwt');
const pool = require('../../modules/mysql');
const pool2 = require('../../modules/mysql2');


// ===== 토큰을 통해 이름 반환 =====
router.post('/getName', async function (req, res, next) {
    const token = req.body.jwtToken;

    const token_res = await jwt.verify(token);
    if(token_res == jwt.TOKEN_EXPIRED) return res.status(401).send({ err : "만료된 토큰입니다." });
    if(token_res == jwt.TOKEN_INVALID) return res.status(401).send({ err : "유효하지 않은 토큰입니다." });
    const name = token_res.name;

    res.send({name: name});
});


module.exports = router;
